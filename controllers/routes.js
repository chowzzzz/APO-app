var express = require('express');
var passport = require('passport')

var router = express.Router();

var moment = require('moment');
var bcrypt = require('bcryptjs');
var functions = require('./modules');
var firebase = require('./firebase');
var url = require('url');

function UNIXConverter(UNIX_timestamp) {
  try {
    if (UNIX_timestamp == 0 || isNaN(UNIX_timestamp)) {
      return "-";
    }
    var a = new Date(UNIX_timestamp * 1000);
    var year = a.getFullYear();
    var month = a.getMonth() + 1;
    var date = a.getDate();
    if (month < 10) {
      month = "0" + month;
    }
    if (date < 10) {
      date = "0" + date;
    }
    var time = date + '/' + month + '/' + year;
    return time;
  } catch (error) {
    return "";
  }
}
function getKeyByValue(object, value) {
  return Object.keys(object).find(key => object[key] === value);
}

router.use(function (req, res, next) {
  res.locals.urlObj = {
    path: req.path
  }
  next();
})

router.get('/', function (req, res) {
  if (req.user == null || req.user === undefined) {
    res.redirect('/login');
  } else {
    firebase.db.ref("searches/").once('value').then(function (snapshot) {
      if (snapshot.val() != null) {
        res.render('index', { user: req.user, s1: snapshot.val().s1, s2: snapshot.val().s2, s3: snapshot.val().s3, s4: snapshot.val().s4, s5: snapshot.val().s5 });
      } else {
        res.render('index', { user: req.user, s1: "", s2: "", s3: "", s4: "", s5: "" });
      }
    });

  }
});

router.post('/', function (req, res) {
  if (req.user == null || req.user === undefined) {
    res.redirect('/login');
  } else if (req.body.search_nric != "") {
    search_nric = req.body.search_nric;
    search_nric = search_nric.toUpperCase();
    try {
      firebase.db.ref("officers/" + search_nric + "/").once('value').then(function (snapshot) {
        if (snapshot.val() != null) {
          firebase.db.ref("searches/").once('value').then(function (searches) {
            if (searches.val() != null) {
              var s1 = searches.val().s1 || null;
              var s2 = searches.val().s2 || null;
              var s3 = searches.val().s3 || null;
              var s4 = searches.val().s4 || null;

              if (search_nric == s1 || search_nric == s2 || search_nric == s3 || search_nric == s4) {
                res.redirect("officers/" + search_nric + "/");
              } else {
                firebase.db.ref("searches/").set({ s1: search_nric, s2: s1, s3: s2, s4: s3, s5: s4 }, function (error) {
                  if (!error) {
                    res.redirect("officers/" + search_nric + "/");
                  }
                });
              }
            } else {
              firebase.db.ref("searches/").set({ s1: search_nric }, function (error) {
                if (!error) {
                  res.redirect("officers/" + search_nric + "/");
                }
              });
            }
          });
        } else {
          res.render('index', { user: req.user, error: "The NRIC does not exist!", s1: "", s2: "", s3: "", s4: "", s5: "" });
        }
      });
    } catch (error) {
      res.render('index', { user: req.user, error: "The NRIC does not exist!", s1: "", s2: "", s3: "", s4: "", s5: "" });
    }
  } else {
    res.render('index', { user: req.user, error: "The NRIC does not exist!", s1: "", s2: "", s3: "", s4: "", s5: "" });
  }
});

router.get('/login', function (req, res) {
  res.render('login', { flash: req.flash('error') });
});

router.post('/login', passport.authenticate('local', { successRedirect: '/', failureRedirect: '/login', failureFlash: true }), function (req, res) {
});


router.get('/officers', functions.verifyAdmin, functions.getOfficers, function (req, res) {
  if (req.user == null || req.user === undefined) {
    res.redirect('/login');
  } else {
    var keys = [];
    if (req.officer_details != undefined || req.officer_details != null) {
      var officer_details = Object.keys(req.officer_details).sort(function (a, b) {
        return req.officer_details[b].nric - req.officer_details[a].nric;
      }).map(function (category) {
        var key = getKeyByValue(req.officer_details, req.officer_details[category]);
        keys.push(key);
        return req.officer_details[category];
      });
      officer_details.forEach((item) => {
        item.name = item.fname + " " + item.lname;
      });
    } else {
      var officer_details = [];
    }
    if (req.query.valid == "new_success") {
      notif = "New officer has been added successfully."
      alert = true;
    } else if (req.query.valid == "update_success") {
      notif = "Officer's details updated successfully."
      alert = true;
    } else if (req.query.valid == "update_fail") {
      notif = "Failed to update officer's details."
      alert = false;
    } else if (req.query.valid == "delete_success") {
      notif = "Officer's record deleted."
      alert = false;
    } else if (req.query.valid == "delete_fail") {
      notif = "Failed to delete officer's record."
      alert = false;
    } else {
      notif = null;
      alert = null;
    }
    res.render('all_officers', { user: req.user, officer_details: officer_details, notif: notif, alert: alert });
  }
});

router.get('/officers/new', functions.isAdminPage, functions.verifyAdmin, function (req, res) {
  if (req.user == null || req.user === undefined) {
    res.redirect('/login');
  } else {
    res.render('add_officer', { user: req.user });
  }
});

router.post('/officers/new', functions.isAdminPage, function (req, res, next) {
  var nric = req.body.nric;
  nric = nric.toUpperCase();
  firebase.db.ref("officers/" + nric + "/").once('value').then(function (snapshot) {
    if (snapshot.val() == null) {
      next();
    } else {
      res.render('add_officer', { user: req.user, message: "NRIC has been used before. Please try again." });
    }

  });
}, function (req, res) {
  if (req.user == null || req.user === undefined) {
    res.redirect('/login');
  } else {
    var nric = req.body.nric;
    nric = nric.toUpperCase();
    var fname = req.body.fname;
    var lname = req.body.lname;
    var dob = req.body.dob;
    var cert_card_no = req.body.cert_card_no;
    var organisation = req.body.organisation;
    var gender = req.body.gender;
    var serial_no = req.body.serial_no;
    var designation = req.body.designation;
    var rank = req.body.rank;
    var remarks = req.body.remarks;

    var add_user = {
      nric: nric,
      fname: fname,
      lname: lname,
      dob: dob,
      cert_card_no: cert_card_no,
      organisation: organisation,
      gender: gender,
      serial_no: serial_no,
      designation: designation,
      rank: rank,
      remarks: remarks
    }

    firebase.db.ref("officers/" + nric + "/").set(add_user, function (error) {
      if (error) {
        res.render('add_officer', { user: req.user, message: "The officer could not be inserted. Please try again." });
      } else {
        res.redirect(url.format({
          pathname: "/officers/",
          query: {
            "valid": "new_success"
          }
        }));
      }
    });
  }
});

router.get('/officers/:nric', functions.verifyAdmin, functions.getEachOfficers, functions.getACRecords, functions.getGSRecords, functions.getXrayHBSRecords, functions.getXrayPBRecords, functions.getXrayCargoRecords, function (req, res) {
  if (req.user == null || req.user === undefined) {
    res.redirect('/login');
  } else {
    var ac_date = "-", gs_date = "-", xray_hbs_date = "-", xray_pb_date = "-", xray_cargo_date = "-";
    notif = {};
    notif.ac = null;
    notif.gs = null;
    notif.xray_hbs = null;
    notif.xray_pb = null;
    notif.xray_cargo = null;
    var curDate = moment().format("YYYYMMDD");

    if (req.ac_details != undefined || req.ac_details != null) {
      sorted_ac = Object.keys(req.ac_details).sort(function (a, b) {
        return req.ac_details[b]['certified_date'] - req.ac_details[a]['certified_date']
      });
      latest_ac = req.ac_details[sorted_ac[0]];

      if (latest_ac) {
        if (latest_ac.overall_status == 1) {
          ac_date = latest_ac.certified_date;
        }
      }
      if ('undefined' !== typeof ac_date) {
        var certDate = moment(ac_date),
          certDateFormat = moment.unix(certDate).format("YYYYMMDD"),
          certDateIncr = moment(certDateFormat).add(11, 'M'),
          certDateIncr = moment(certDateIncr).format("YYYYMMDD"),
          diffDate = moment(curDate).diff(moment(certDateIncr), 'months', true);
        if (diffDate > 0 && diffDate < 1) {
          notif.ac = "Officer's Access Control Certificate expiring soon!";
        }
      }
      ac_date = UNIXConverter(ac_date);
    }

    if (req.gs_details != undefined || req.gs_details != null) {

      sorted_gs = Object.keys(req.gs_details).sort(function (a, b) {
        return req.gs_details[b]['certified_date'] - req.gs_details[a]['certified_date']
      });
      latest_gs = req.gs_details[sorted_gs[0]];

      if (latest_gs) {
        if (latest_gs.overall_status == 1) {
          gs_date = latest_gs.certified_date;
        }
      }
      if ('undefined' !== typeof gs_date) {
        var certDate = moment(gs_date),
          certDateFormat = moment.unix(certDate).format("YYYYMMDD"),
          certDateIncr = moment(certDateFormat).add(11, 'M'),
          certDateIncr = moment(certDateIncr).format("YYYYMMDD"),
          diffDate = moment(curDate).diff(moment(certDateIncr), 'months', true);
        if (diffDate > 0 && diffDate < 1) {
          notif.gs = "Officer's General Screener Certificate expiring soon!";
        }
      }
      gs_date = UNIXConverter(gs_date);
    }

    if (req.xray_hbs_details != undefined || req.xray_hbs_details != null) {

      sorted_xray_hbs = Object.keys(req.xray_hbs_details).sort(function (a, b) {
        return req.xray_hbs_details[b]['certified_date'] - req.xray_hbs_details[a]['certified_date']
      });
      latest_xray_hbs = req.xray_hbs_details[sorted_xray_hbs[0]];

      if (latest_xray_hbs) {
        if (latest_xray_hbs.overall_status == 1) {
          xray_hbs_date = latest_xray_hbs.certified_date;
        }
      }
      if ('undefined' !== typeof xray_hbs_date) {
        var certDate = moment(xray_hbs_date),
          certDateFormat = moment.unix(certDate).format("YYYYMMDD"),
          certDateIncr = moment(certDateFormat).add(11, 'M'),
          certDateIncr = moment(certDateIncr).format("YYYYMMDD"),
          diffDate = moment(curDate).diff(moment(certDateIncr), 'months', true);
        if (diffDate > 0 && diffDate < 1) {
          notif.xray_hbs = "Officer's X-Ray HBS Certificate expiring soon!";
        }
      }
      xray_hbs_date = UNIXConverter(xray_hbs_date);
    }

    if (req.xray_pb_details != undefined || req.xray_pb_details != null) {

      sorted_xray_pb = Object.keys(req.xray_pb_details).sort(function (a, b) {
        return req.xray_pb_details[b]['certified_date'] - req.xray_pb_details[a]['certified_date']
      });
      latest_xray_pb = req.xray_pb_details[sorted_xray_pb[0]];

      if (latest_xray_pb) {
        if (latest_xray_pb.overall_status == 1) {
          xray_pb_date = latest_xray_pb.certified_date;
        }
      }
      if ('undefined' !== typeof xray_pb_date) {
        var certDate = moment(xray_pb_date),
          certDateFormat = moment.unix(certDate).format("YYYYMMDD"),
          certDateIncr = moment(certDateFormat).add(11, 'M'),
          certDateIncr = moment(certDateIncr).format("YYYYMMDD"),
          diffDate = moment(curDate).diff(moment(certDateIncr), 'months', true);
        if (diffDate > 0 && diffDate < 1) {
          notif.xray_pb = "Officer's X-Ray Pre-Board Certificate expiring soon!";
        }
      }
      xray_pb_date = UNIXConverter(xray_pb_date);
    }
    if (req.xray_cargo_details != undefined || req.xray_cargo_details != null) {

      sorted_xray_cargo = Object.keys(req.xray_cargo_details).sort(function (a, b) {
        return req.xray_cargo_details[b]['certified_date'] - req.xray_cargo_details[a]['certified_date']
      });
      latest_xray_cargo = req.xray_cargo_details[sorted_xray_cargo[0]];

      if (latest_xray_cargo) {
        if (latest_xray_cargo.overall_status == 1) {
          xray_cargo_date = latest_xray_cargo.certified_date;
        }
      }
      if ('undefined' !== typeof xray_cargo_date) {
        var certDate = moment(xray_cargo_date),
          certDateFormat = moment.unix(certDate).format("YYYYMMDD"),
          certDateIncr = moment(certDateFormat).add(11, 'M'),
          certDateIncr = moment(certDateIncr).format("YYYYMMDD"),
          diffDate = moment(curDate).diff(moment(certDateIncr), 'months', true);
        if (diffDate > 0 && diffDate < 1) {
          notif.xray_cargo = "Officer's X-Ray Cargo Certificate expiring soon!";
        }
      }
      xray_cargo_date = UNIXConverter(xray_cargo_date);
    }
    res.render('officer_details', { user: req.user, officer_details: req.officer_details, ac_date: ac_date, gs_date: gs_date, xray_hbs_date: xray_hbs_date, xray_pb_date: xray_pb_date, xray_cargo_date: xray_cargo_date, notif: notif });
  }
});

router.post('/officers/:nric', functions.verifyAdmin, function (req, res, next) {
  if (req.user == null || req.user === undefined) {
    res.redirect('/login');
  } else {
    if (req.body.update_btn != null) {

      var fname = req.body.fname;
      var lname = req.body.lname;
      var dob = req.body.dob;

      var cert_card_no = req.body.cert_card_no;
      var organisation = req.body.organisation;
      var gender = req.body.gender;
      var serial_no = req.body.serial_no;
      var designation = req.body.designation;
      var rank = req.body.rank;
      var remarks = req.body.remarks;

      var update_user = {
        fname: fname,
        lname: lname,
        dob: dob,
        cert_card_no: cert_card_no,
        organisation: organisation,
        gender: gender,
        serial_no: serial_no,
        designation: designation,
        rank: rank,
        remarks: remarks
      }

      firebase.db.ref("officers/" + req.params.nric + "/").update(update_user, function (error) {
        if (!error) {
          res.redirect(url.format({
            pathname: "/officers/",
            query: {
              "valid": "update_success"
            }
          }));
        } else {
          res.redirect(url.format({
            pathname: "/officers/",
            query: {
              "valid": "update_fail"
            }
          }));
        }
      });
    } else if (req.body.delete_btn != null) {
      firebase.db.ref("officers/" + req.params.nric + "/").set(null, function (error) {
        if (!error) {
          res.redirect(url.format({
            pathname: "/officers/",
            query: {
              "valid": "delete_success"
            }
          }));
        } else {
          res.redirect(url.format({
            pathname: "/officers/",
            query: {
              "valid": "delete_fail"
            }
          }));
        }
      });
    } else if (req.body.view_cert_btn != null) {
      firebase.db.ref("officers/" + req.params.nric + "/certification/access_control").once('value').then(function (snapshot) {
        if (snapshot.exists()) {
          res.redirect("/access_control/" + req.params.nric);
        } else {
          res.redirect("/general_screener/" + req.params.nric);
        }
      });
    }
  }
});

//Access Control Section

router.get('/access_control', functions.verifyAdmin, functions.getOfficers, function (req, res) {
  if (req.user == null || req.user === undefined) {
    res.redirect('/login');
  } else {
    var keys = [];
    if (req.officer_details != undefined || req.officer_details != null) {
      var officer_details = Object.keys(req.officer_details).sort(function (a, b) {
        return req.officer_details[b].nric - req.officer_details[a].nric;
      }).map(function (category) {
        var key = getKeyByValue(req.officer_details, req.officer_details[category]);
        keys.push(key);
        return req.officer_details[category];
      });
      officer_details.forEach((item) => {
        item.name = item.fname + " " + item.lname;
      });
    } else {
      var officer_details = [];
    }
    res.render('main_access_control', { user: req.user, officer_details: officer_details });
  }
})

router.get('/access_control/:nric', functions.verifyAdmin, functions.getEachOfficers, functions.getACRecords, function (req, res) {

  if (req.user == null || req.user === undefined) {
    res.redirect('/login');
  } else {
    var keys = [];
    if (req.ac_details != undefined || req.ac_details != null) {
      var ac_details = Object.keys(req.ac_details).sort(function (a, b) {
        return req.ac_details[b].certified_date - req.ac_details[a].certified_date;
      }).map(function (category) {
        var key = getKeyByValue(req.ac_details, req.ac_details[category]);
        keys.push(key);
        return req.ac_details[category];
      });
      ac_details.forEach((item, i) => {
        if (item.overall_status == "1") {
          item.overall_status = "PASS";
        } else if (item.overall_status == "0") {
          item.overall_status = "FAIL";
        }
        item.certified_date = UNIXConverter(item.certified_date);
        item.id = i + 1;
        item.key = keys[i];
      });
    } else {
      var ac_details = [];
    }
    if (req.query.valid == "new_success") {
      notif = "New record has been added successfully."
      alert = true;
    } else if (req.query.valid == "update_success") {
      notif = "Officer's record updated successfully."
      alert = true;
    } else if (req.query.valid == "update_fail") {
      notif = "Failed to update officer's record."
      alert = false;
    } else if (req.query.valid == "delete_success") {
      notif = "Officer's record deleted."
      alert = false;
    } else if (req.query.valid == "delete_fail") {
      notif = "Failed to delete officer's record."
      alert = false;
    } else {
      notif = null;
      alert = null;
    }
    res.render('access_control', { user: req.user, officer_details: req.officer_details, ac_details: ac_details, notif: notif, alert: alert });
  }
})

router.get('/access_control/new/:nric', functions.isAdminPage, functions.verifyAdmin, functions.getEachOfficers, function (req, res) {
  if (req.user == null || req.user === undefined) {
    res.redirect('/login');
  } else {
    res.render('new_access_control', { user: req.user, officer_details: req.officer_details })
  }
})

router.post('/access_control/new/:nric', functions.isAdminPage, functions.verifyAdmin, functions.getEachOfficers, function (req, res) {
  if (req.user == null || req.user === undefined) {
    res.redirect('/login');
  } else {
    var officer_id = req.params.nric;

    var overall_status = req.body.overall_status;
    var certified_date = functions.dateToUNIX(req.body.certified_date);
    var ac_theory = req.body.ac_theory;
    var ac_theory_status = req.body.ac_theory_status;
    var ac_hhmd = req.body.ac_hhmd;
    var ac_hhmd_status = req.body.ac_hhmd_status;
    var ac_pds = req.body.ac_pds;
    var ac_pds_status = req.body.ac_pds_status;
    var ac_wtmd = req.body.ac_wtmd;
    var ac_wtmd_status = req.body.ac_wtmd_status;
    var ac_etd = req.body.ac_etd;
    var ac_etd_status = req.body.ac_etd_status;
    var ac_mbs = req.body.ac_mbs;
    var ac_mbs_status = req.body.ac_mbs_status;
    var ac_vs = req.body.ac_vs;
    var ac_vs_status = req.body.ac_vs_status;

    var data = {
      overall_status: overall_status,
      certified_date: certified_date,
      theory: {
        date: functions.dateToUNIX(ac_theory),
        status: ac_theory_status
      },
      hhmd: {
        date: functions.dateToUNIX(ac_hhmd),
        status: ac_hhmd_status
      },
      pds: {
        date: functions.dateToUNIX(ac_pds),
        status: ac_pds_status
      },
      wtmd: {
        date: functions.dateToUNIX(ac_wtmd),
        status: ac_wtmd_status
      },
      etd: {
        date: functions.dateToUNIX(ac_etd),
        status: ac_etd_status
      },
      mbs: {
        date: functions.dateToUNIX(ac_mbs),
        status: ac_mbs_status
      },
      vs: {
        date: functions.dateToUNIX(ac_vs),
        status: ac_vs_status
      }
    }

    firebase.db.ref("officers/" + officer_id + "/certification/access_control/").push(data, function (error) {
      if (!error) {
        res.redirect(url.format({
          pathname: "/access_control/" + officer_id,
          query: {
            "valid": "new_success"
          }
        }));
      }
    });
  }
})

router.get('/access_control/:nric/:ac_id', functions.verifyAdmin, functions.getEachOfficers, functions.getEachACRecord, function (req, res) {
  if (req.user == null || req.user === undefined) {
    res.redirect('/login');
  } else {
    res.render('view_access_control', { user: req.user, officer_details: req.officer_details, ac_id: req.params.ac_id, ac_details: req.ac_details });
  }
});

router.post('/access_control/:nric/:ac_id', functions.verifyAdmin, function (req, res) {
  if (req.user == null || req.user === undefined) {
    res.redirect('/login');
  } else {
    var officer_id = req.params.nric;
    var ac_id = req.params.ac_id;

    var editBtn = req.body.edit_btn;
    var deleteBtn = req.body.delete_btn;

    if (deleteBtn != null) { // IF DELETE BUTTON PRESSED
      firebase.db.ref("officers/" + officer_id + "/certification/access_control/" + ac_id).set(null, function (error) {
        if (!error) {
          res.redirect(url.format({
            pathname: "/access_control/" + officer_id,
            query: {
              "valid": "delete_success"
            }
          }));
        } else {
          res.redirect(url.format({
            pathname: "/access_control/" + officer_id,
            query: {
              "valid": "delete_fail"
            }
          }));
        }
      });
    } else if (editBtn != null) {
      var overall_status = req.body.overall_status;
      var certified_date = functions.dateToUNIX(req.body.certified_date);
      var ac_theory = req.body.ac_theory;
      var ac_theory_status = req.body.ac_theory_status;
      var ac_hhmd = req.body.ac_hhmd;
      var ac_hhmd_status = req.body.ac_hhmd_status;
      var ac_pds = req.body.ac_pds;
      var ac_pds_status = req.body.ac_pds_status;
      var ac_wtmd = req.body.ac_wtmd;
      var ac_wtmd_status = req.body.ac_wtmd_status;
      var ac_etd = req.body.ac_etd;
      var ac_etd_status = req.body.ac_etd_status;
      var ac_mbs = req.body.ac_mbs;
      var ac_mbs_status = req.body.ac_mbs_status;
      var ac_vs = req.body.ac_vs;
      var ac_vs_status = req.body.ac_vs_status;

      var data = {
        overall_status: overall_status,
        certified_date: certified_date,
        theory: {
          date: functions.dateToUNIX(ac_theory),
          status: ac_theory_status
        },
        hhmd: {
          date: functions.dateToUNIX(ac_hhmd),
          status: ac_hhmd_status
        },
        pds: {
          date: functions.dateToUNIX(ac_pds),
          status: ac_pds_status
        },
        wtmd: {
          date: functions.dateToUNIX(ac_wtmd),
          status: ac_wtmd_status
        },
        etd: {
          date: functions.dateToUNIX(ac_etd),
          status: ac_etd_status
        },
        mbs: {
          date: functions.dateToUNIX(ac_mbs),
          status: ac_mbs_status
        },
        vs: {
          date: functions.dateToUNIX(ac_vs),
          status: ac_vs_status
        }
      }

      firebase.db.ref("officers/" + officer_id + "/certification/access_control/" + ac_id).update(data, function (error) {
        if (!error) {
          res.redirect(url.format({
            pathname: "/access_control/" + officer_id,
            query: {
              "valid": "update_success"
            }
          }));
        } else {
          res.redirect(url.format({
            pathname: "/access_control/" + officer_id,
            query: {
              "valid": "update_fail"
            }
          }));
        }
      });
    }
  }
});

//General Screener Section

router.get('/general_screener', functions.verifyAdmin, functions.getOfficers, function (req, res) {
  if (req.user == null || req.user === undefined) {
    res.redirect('/login');
  } else {
    var keys = [];
    if (req.officer_details != undefined || req.officer_details != null) {
      var officer_details = Object.keys(req.officer_details).sort(function (a, b) {
        return req.officer_details[b].nric - req.officer_details[a].nric;
      }).map(function (category) {
        var key = getKeyByValue(req.officer_details, req.officer_details[category]);
        keys.push(key);
        return req.officer_details[category];
      });
      officer_details.forEach((item) => {
        item.name = item.fname + " " + item.lname;
      });
    } else {
      var officer_details = [];
    }
    res.render('main_general_screener', { user: req.user, officer_details: officer_details });
  }
})

router.get('/general_screener/:nric', functions.verifyAdmin, functions.getEachOfficers, functions.getGSRecords, function (req, res) {
  if (req.user == null || req.user === undefined) {
    res.redirect('/login');
  } else {
    var keys = [];
    if (req.gs_details != undefined || req.gs_details != null) {
      var gs_details = Object.keys(req.gs_details).sort(function (a, b) {
        return req.gs_details[b].certified_date - req.gs_details[a].certified_date;
      }).map(function (category) {
        var key = getKeyByValue(req.gs_details, req.gs_details[category]);
        keys.push(key);
        return req.gs_details[category];
      });
      gs_details.forEach((item, i) => {
        if (item.overall_status == "1") {
          item.overall_status = "PASS";
        } else if (item.overall_status == "0") {
          item.overall_status = "FAIL";
        };
        item.certified_date = UNIXConverter(item.certified_date);
        item.id = i + 1;
        item.key = keys[i];
      });
    } else {
      var gs_details = [];
    }
    if (req.query.valid == "new_success") {
      notif = "New record has been added successfully."
      alert = true;
    } else if (req.query.valid == "update_success") {
      notif = "Officer's record updated successfully."
      alert = true;
    } else if (req.query.valid == "update_fail") {
      notif = "Failed to update officer's record."
      alert = false;
    } else if (req.query.valid == "delete_success") {
      notif = "Officer's record deleted."
      alert = false;
    } else if (req.query.valid == "delete_fail") {
      notif = "Failed to delete officer's record."
      alert = false;
    } else {
      notif = null;
      alert = null;
    }
    res.render('general_screener', { user: req.user, officer_details: req.officer_details, gs_details: gs_details, notif: notif, alert: alert });
  }
})

router.get('/general_screener/new/:nric', functions.isAdminPage, functions.verifyAdmin, functions.getEachOfficers, function (req, res) {
  if (req.user == null || req.user === undefined) {
    res.redirect('/login');
  } else {
    res.render('new_general_screener', { user: req.user, officer_details: req.officer_details })
  }
})

router.post('/general_screener/new/:nric', functions.isAdminPage, functions.verifyAdmin, functions.getEachOfficers, function (req, res) {
  if (req.user == null || req.user === undefined) {
    res.redirect('/login');
  } else {
    var officer_id = req.params.nric;

    var overall_status = req.body.overall_status;
    var certified_date = functions.dateToUNIX(req.body.certified_date);
    var gs_theory = req.body.gs_theory;
    var gs_theory_status = req.body.gs_theory_status;
    var gs_hhmd = req.body.gs_hhmd;
    var gs_hhmd_status = req.body.gs_hhmd_status;
    var gs_pds = req.body.gs_pds;
    var gs_pds_status = req.body.gs_pds_status;
    var gs_wtmd = req.body.gs_wtmd;
    var gs_wtmd_status = req.body.gs_wtmd_status;
    var gs_fl = req.body.gs_fl;
    var gs_fl_status = req.body.gs_fl_status;
    var gs_etd = req.body.gs_etd;
    var gs_etd_status = req.body.gs_etd_status;
    var gs_mbs = req.body.gs_mbs;
    var gs_mbs_status = req.body.gs_mbs_status;

    var data = {
      overall_status: overall_status,
      certified_date: certified_date,
      theory: {
        date: functions.dateToUNIX(gs_theory),
        status: gs_theory_status
      },
      hhmd: {
        date: functions.dateToUNIX(gs_hhmd),
        status: gs_hhmd_status
      },
      pds: {
        date: functions.dateToUNIX(gs_pds),
        status: gs_pds_status
      },
      wtmd: {
        date: functions.dateToUNIX(gs_wtmd),
        status: gs_wtmd_status
      },
      fl: {
        date: functions.dateToUNIX(gs_fl),
        status: gs_fl_status
      },
      etd: {
        date: functions.dateToUNIX(gs_etd),
        status: gs_etd_status
      },
      mbs: {
        date: functions.dateToUNIX(gs_mbs),
        status: gs_mbs_status
      }
    }

    firebase.db.ref("officers/" + officer_id + "/certification/general_screener/").push(data, function (error) {
      if (!error) {
        res.redirect(url.format({
          pathname: "/general_screener/" + officer_id,
          query: {
            "valid": "new_success"
          }
        }));
      }
    });
  }
})

router.get('/general_screener/:nric/:gs_id', functions.verifyAdmin, functions.getEachOfficers, functions.getEachGSRecord, function (req, res) {
  if (req.user == null || req.user === undefined) {
    res.redirect('/login');
  } else {
    res.render('view_general_screener', { user: req.user, officer_details: req.officer_details, gs_id: req.params.gs_id, gs_details: req.gs_details });
  }
});

router.post('/general_screener/:nric/:gs_id', functions.verifyAdmin, function (req, res) {
  if (req.user == null || req.user === undefined) {
    res.redirect('/login');
  } else {
    var officer_id = req.params.nric;
    var gs_id = req.params.gs_id;

    var editBtn = req.body.edit_btn;
    var deleteBtn = req.body.delete_btn;

    if (deleteBtn != null) { // IF DELETE BUTTON PRESSED
      firebase.db.ref("officers/" + officer_id + "/certification/general_screener/" + gs_id).set(null, function (error) {
        if (!error) {
          res.redirect(url.format({
            pathname: "/general_screener/" + officer_id,
            query: {
              "valid": "delete_success"
            }
          }));
        } else {
          res.redirect(url.format({
            pathname: "/general_screener/" + officer_id,
            query: {
              "valid": "delete_fail"
            }
          }));
        }
      });
    } else if (editBtn != null) {
      var overall_status = req.body.overall_status;
      var certified_date = functions.dateToUNIX(req.body.certified_date);
      var gs_theory = req.body.gs_theory;
      var gs_theory_status = req.body.gs_theory_status;
      var gs_hhmd = req.body.gs_hhmd;
      var gs_hhmd_status = req.body.gs_hhmd_status;
      var gs_pds = req.body.gs_pds;
      var gs_pds_status = req.body.gs_pds_status;
      var gs_wtmd = req.body.gs_wtmd;
      var gs_wtmd_status = req.body.gs_wtmd_status;
      var gs_fl = req.body.gs_fl;
      var gs_fl_status = req.body.gs_fl_status;
      var gs_etd = req.body.gs_etd;
      var gs_etd_status = req.body.gs_etd_status;
      var gs_mbs = req.body.gs_mbs;
      var gs_mbs_status = req.body.gs_mbs_status;

      var data = {
        overall_status: overall_status,
        certified_date: certified_date,
        theory: {
          date: functions.dateToUNIX(gs_theory),
          status: gs_theory_status
        },
        hhmd: {
          date: functions.dateToUNIX(gs_hhmd),
          status: gs_hhmd_status
        },
        pds: {
          date: functions.dateToUNIX(gs_pds),
          status: gs_pds_status
        },
        wtmd: {
          date: functions.dateToUNIX(gs_wtmd),
          status: gs_wtmd_status
        },
        fl: {
          date: functions.dateToUNIX(gs_fl),
          status: gs_fl_status
        },
        etd: {
          date: functions.dateToUNIX(gs_etd),
          status: gs_etd_status
        },
        mbs: {
          date: functions.dateToUNIX(gs_mbs),
          status: gs_mbs_status
        }
      }

      firebase.db.ref("officers/" + officer_id + "/certification/general_screener/" + gs_id).update(data, function (error) {
        if (!error) {
          res.redirect(url.format({
            pathname: "/general_screener/" + officer_id,
            query: {
              "valid": "update_success"
            }
          }));
        } else {
          res.redirect(url.format({
            pathname: "/general_screener/" + officer_id,
            query: {
              "valid": "update_fail"
            }
          }));
        }
      });
    }
  }
});

//Xray HBS Section

router.get('/xray_hbs', functions.verifyAdmin, functions.getOfficers, function (req, res) {
  if (req.user == null || req.user === undefined) {
    res.redirect('/login');
  } else {
    var keys = [];
    if (req.officer_details != undefined || req.officer_details != null) {
      var officer_details = Object.keys(req.officer_details).sort(function (a, b) {
        return req.officer_details[b].nric - req.officer_details[a].nric;
      }).map(function (category) {
        var key = getKeyByValue(req.officer_details, req.officer_details[category]);
        keys.push(key);
        return req.officer_details[category];
      });
      officer_details.forEach((item) => {
        item.name = item.fname + " " + item.lname;
      });
    } else {
      var officer_details = [];
    }
    res.render('main_xray_hbs', { user: req.user, officer_details: officer_details });
  }
})

router.get('/xray_hbs/:nric', functions.verifyAdmin, functions.getEachOfficers, functions.getXrayHBSRecords, function (req, res) {
  if (req.user == null || req.user === undefined) {
    res.redirect('/login');
  } else {
    var keys = [];
    if (req.xray_hbs_details != undefined || req.xray_hbs_details != null) {
      var xray_hbs_details = Object.keys(req.xray_hbs_details).sort(function (a, b) {
        return req.xray_hbs_details[b].certified_date - req.xray_hbs_details[a].certified_date;
      }).map(function (category) {
        var key = getKeyByValue(req.xray_hbs_details, req.xray_hbs_details[category]);
        keys.push(key);
        return req.xray_hbs_details[category];
      });
      xray_hbs_details.forEach((item, i) => {
        if (item.overall_status == "1") {
          item.overall_status = "PASS";
        } else if (item.overall_status == "0") {
          item.overall_status = "FAIL";
        }
        item.certified_date = UNIXConverter(item.certified_date);
        item.id = i + 1;
        item.key = keys[i];
      });
    } else {
      var xray_hbs_details = [];
    }
    if (req.query.valid == "new_success") {
      notif = "New record has been added successfully."
      alert = true;
    } else if (req.query.valid == "update_success") {
      notif = "Officer's record updated successfully."
      alert = true;
    } else if (req.query.valid == "update_fail") {
      notif = "Failed to update officer's record."
      alert = false;
    } else if (req.query.valid == "delete_success") {
      notif = "Officer's record deleted."
      alert = false;
    } else if (req.query.valid == "delete_fail") {
      notif = "Failed to delete officer's record."
      alert = false;
    } else {
      notif = null;
      alert = null;
    }
    res.render('xray_hbs', { user: req.user, officer_details: req.officer_details, xray_hbs_details: xray_hbs_details, notif: notif, alert: alert });
  }
})

router.get('/xray_hbs/new/:nric', functions.isAdminPage, functions.verifyAdmin, functions.getEachOfficers, function (req, res) {
  if (req.user == null || req.user === undefined) {
    res.redirect('/login');
  } else {
    res.render('new_xray_hbs', { user: req.user, officer_details: req.officer_details })
  }
})

router.post('/xray_hbs/new/:nric', functions.isAdminPage, functions.verifyAdmin, functions.getEachOfficers, function (req, res) {
  if (req.user == null || req.user === undefined) {
    res.redirect('/login');
  } else {
    var officer_id = req.params.nric;

    var overall_status = req.body.overall_status;
    var certified_date = functions.dateToUNIX(req.body.certified_date);
    var xray_hbs_theory = req.body.xray_hbs_theory;
    var xray_hbs_theory_status = req.body.xray_hbs_theory_status;
    var xray_hbs_etd = req.body.xray_hbs_etd;
    var xray_hbs_etd_status = req.body.xray_hbs_etd_status;
    var xray_hbs_iit = req.body.xray_hbs_iit;
    var xray_hbs_iit_status = req.body.xray_hbs_iit_status;

    var data = {
      overall_status: overall_status,
      certified_date: certified_date,
      theory: {
        date: functions.dateToUNIX(xray_hbs_theory),
        status: xray_hbs_theory_status
      },
      etd: {
        date: functions.dateToUNIX(xray_hbs_etd),
        status: xray_hbs_etd_status
      },
      iit: {
        date: functions.dateToUNIX(xray_hbs_iit),
        status: xray_hbs_iit_status
      }
    }

    firebase.db.ref("officers/" + officer_id + "/certification/xray_hbs/").push(data, function (error) {
      if (!error) {
        res.redirect(url.format({
          pathname: "/xray_hbs/" + officer_id,
          query: {
            "valid": "new_success"
          }
        }));
      }
    });
  }
})

router.get('/xray_hbs/:nric/:xray_hbs_id', functions.verifyAdmin, functions.getEachOfficers, functions.getEachXrayHBSRecord, function (req, res) {
  if (req.user == null || req.user === undefined) {
    res.redirect('/login');
  } else {
    res.render('view_xray_hbs', { user: req.user, officer_details: req.officer_details, xray_hbs_id: req.params.xray_hbs_id, xray_hbs_details: req.xray_hbs_details });
  }
});

router.post('/xray_hbs/:nric/:xray_hbs_id', functions.verifyAdmin, function (req, res) {
  if (req.user == null || req.user === undefined) {
    res.redirect('/login');
  } else {
    var officer_id = req.params.nric;
    var xray_hbs_id = req.params.xray_hbs_id;

    var editBtn = req.body.edit_btn;
    var deleteBtn = req.body.delete_btn;

    if (deleteBtn != null) { // IF DELETE BUTTON PRESSED
      firebase.db.ref("officers/" + officer_id + "/certification/xray_hbs/" + xray_hbs_id).set(null, function (error) {
        if (!error) {
          res.redirect(url.format({
            pathname: "/xray_hbs/" + officer_id,
            query: {
              "valid": "delete_success"
            }
          }));
        } else {
          res.redirect(url.format({
            pathname: "/xray_hbs/" + officer_id,
            query: {
              "valid": "delete_fail"
            }
          }));
        }
      });
    } else if (editBtn != null) {
      var overall_status = req.body.overall_status;
      var certified_date = functions.dateToUNIX(req.body.certified_date);
      var xray_hbs_theory = req.body.xray_hbs_theory;
      var xray_hbs_theory_status = req.body.xray_hbs_theory_status;
      var xray_hbs_etd = req.body.xray_hbs_etd;
      var xray_hbs_etd_status = req.body.xray_hbs_etd_status;
      var xray_hbs_iit = req.body.xray_hbs_iit;
      var xray_hbs_iit_status = req.body.xray_hbs_iit_status;

      var data = {
        overall_status: overall_status,
        certified_date: certified_date,
        theory: {
          date: functions.dateToUNIX(xray_hbs_theory),
          status: xray_hbs_theory_status
        },
        etd: {
          date: functions.dateToUNIX(xray_hbs_etd),
          status: xray_hbs_etd_status
        },
        iit: {
          date: functions.dateToUNIX(xray_hbs_iit),
          status: xray_hbs_iit_status
        }
      }

      firebase.db.ref("officers/" + officer_id + "/certification/xray_hbs/" + xray_hbs_id).update(data, function (error) {
        if (!error) {
          res.redirect(url.format({
            pathname: "/xray_hbs/" + officer_id,
            query: {
              "valid": "update_success"
            }
          }));
        } else {
          res.redirect(url.format({
            pathname: "/xray_hbs/" + officer_id,
            query: {
              "valid": "update_fail"
            }
          }));
        }
      });
    }
  }
});

//Xray Preboard (PB) Section

router.get('/xray_pb', functions.verifyAdmin, functions.getOfficers, function (req, res) {
  if (req.user == null || req.user === undefined) {
    res.redirect('/login');
  } else {
    var keys = [];
    if (req.officer_details != undefined || req.officer_details != null) {
      var officer_details = Object.keys(req.officer_details).sort(function (a, b) {
        return req.officer_details[b].nric - req.officer_details[a].nric;
      }).map(function (category) {
        var key = getKeyByValue(req.officer_details, req.officer_details[category]);
        keys.push(key);
        return req.officer_details[category];
      });
      officer_details.forEach((item) => {
        item.name = item.fname + " " + item.lname;
      });
    } else {
      var officer_details = [];
    }

    res.render('main_xray_pb', { user: req.user, officer_details: officer_details });
  }
})

router.get('/xray_pb/:nric', functions.verifyAdmin, functions.getEachOfficers, functions.getXrayPBRecords, function (req, res) {
  if (req.user == null || req.user === undefined) {
    res.redirect('/login');
  } else {
    var keys = [];
    if (req.xray_pb_details != undefined || req.xray_pb_details != null) {
      var xray_pb_details = Object.keys(req.xray_pb_details).sort(function (a, b) {
        return req.xray_pb_details[b].certified_date - req.xray_pb_details[a].certified_date;
      }).map(function (category) {
        var key = getKeyByValue(req.xray_pb_details, req.xray_pb_details[category]);
        keys.push(key);
        return req.xray_pb_details[category];
      });
      xray_pb_details.forEach((item, i) => {
        if (item.overall_status == "1") {
          item.overall_status = "PASS";
        } else if (item.overall_status == "0") {
          item.overall_status = "FAIL";
        }
        item.certified_date = UNIXConverter(item.certified_date);
        item.id = i + 1;
        item.key = keys[i];
      });
    } else {
      var xray_pb_details = [];
    }
    if (req.query.valid == "new_success") {
      notif = "New record has been added successfully."
      alert = true;
    } else if (req.query.valid == "update_success") {
      notif = "Officer's record updated successfully."
      alert = true;
    } else if (req.query.valid == "update_fail") {
      notif = "Failed to update officer's record."
      alert = false;
    } else if (req.query.valid == "delete_success") {
      notif = "Officer's record deleted."
      alert = false;
    } else if (req.query.valid == "delete_fail") {
      notif = "Failed to delete officer's record."
      alert = false;
    } else {
      notif = null;
      alert = null;
    }
    res.render('xray_pb', { user: req.user, officer_details: req.officer_details, xray_pb_details: xray_pb_details, notif: notif, alert: alert });
  }
})

router.get('/xray_pb/new/:nric', functions.isAdminPage, functions.verifyAdmin, functions.getEachOfficers, function (req, res) {
  if (req.user == null || req.user === undefined) {
    res.redirect('/login');
  } else {
    res.render('new_xray_pb', { user: req.user, officer_details: req.officer_details })
  }
})

router.post('/xray_pb/new/:nric', functions.isAdminPage, functions.verifyAdmin, functions.getEachOfficers, function (req, res) {
  if (req.user == null || req.user === undefined) {
    res.redirect('/login');
  } else {
    var officer_id = req.params.nric;

    var overall_status = req.body.overall_status;
    var certified_date = functions.dateToUNIX(req.body.certified_date);
    var xray_pb_theory = req.body.xray_pb_theory;
    var xray_pb_theory_status = req.body.xray_pb_theory_status;
    var xray_pb_iit = req.body.xray_pb_iit;
    var xray_pb_iit_status = req.body.xray_pb_iit_status;

    var data = {
      overall_status: overall_status,
      certified_date: certified_date,
      theory: {
        date: functions.dateToUNIX(xray_pb_theory),
        status: xray_pb_theory_status
      },
      iit: {
        date: functions.dateToUNIX(xray_pb_iit),
        status: xray_pb_iit_status
      }
    }

    firebase.db.ref("officers/" + officer_id + "/certification/xray_pb/").push(data, function (error) {
      if (!error) {
        res.redirect(url.format({
          pathname: "/xray_pb/" + officer_id,
          query: {
            "valid": "new_success"
          }
        }));
      }
    });
  }
})

router.get('/xray_pb/:nric/:xray_pb_id', functions.verifyAdmin, functions.getEachOfficers, functions.getEachXrayPBRecord, function (req, res) {
  if (req.user == null || req.user === undefined) {
    res.redirect('/login');
  } else {
    res.render('view_xray_pb', { user: req.user, officer_details: req.officer_details, xray_pb_id: req.params.xray_pb_id, xray_pb_details: req.xray_pb_details });
  }
});

router.post('/xray_pb/:nric/:xray_pb_id', functions.verifyAdmin, function (req, res) {
  if (req.user == null || req.user === undefined) {
    res.redirect('/login');
  } else {
    var officer_id = req.params.nric;
    var xray_pb_id = req.params.xray_pb_id;

    var editBtn = req.body.edit_btn;
    var deleteBtn = req.body.delete_btn;

    if (deleteBtn != null) { // IF DELETE BUTTON PRESSED
      firebase.db.ref("officers/" + officer_id + "/certification/xray_pb/" + xray_pb_id).set(null, function (error) {
        if (!error) {
          res.redirect(url.format({
            pathname: "/xray_pb/" + officer_id,
            query: {
              "valid": "delete_success"
            }
          }));
        } else {
          res.redirect(url.format({
            pathname: "/xray_pb/" + officer_id,
            query: {
              "valid": "delete_fail"
            }
          }));
        }
      });
    } else if (editBtn != null) {
      var overall_status = req.body.overall_status;
      var certified_date = functions.dateToUNIX(req.body.certified_date);
      var xray_pb_theory = req.body.xray_pb_theory;
      var xray_pb_theory_status = req.body.xray_pb_theory_status;
      var xray_pb_iit = req.body.xray_pb_iit;
      var xray_pb_iit_status = req.body.xray_pb_iit_status;

      var data = {
        overall_status: overall_status,
        certified_date: certified_date,
        theory: {
          date: functions.dateToUNIX(xray_pb_theory),
          status: xray_pb_theory_status
        },
        iit: {
          date: functions.dateToUNIX(xray_pb_iit),
          status: xray_pb_iit_status
        }
      }

      firebase.db.ref("officers/" + officer_id + "/certification/xray_pb/" + xray_pb_id).update(data, function (error) {
        if (!error) {
          res.redirect(url.format({
            pathname: "/xray_pb/" + officer_id,
            query: {
              "valid": "update_success"
            }
          }));
        } else {
          res.redirect(url.format({
            pathname: "/xray_pb/" + officer_id,
            query: {
              "valid": "update_fail"
            }
          }));
        }
      });
    }
  }
});

//Xray Cargo Section

router.get('/xray_cargo', functions.verifyAdmin, functions.getOfficers, function (req, res) {
  if (req.user == null || req.user === undefined) {
    res.redirect('/login');
  } else {
    var keys = [];
    if (req.officer_details != undefined || req.officer_details != null) {
      var officer_details = Object.keys(req.officer_details).sort(function (a, b) {
        return req.officer_details[b].nric - req.officer_details[a].nric;
      }).map(function (category) {
        var key = getKeyByValue(req.officer_details, req.officer_details[category]);
        keys.push(key);
        return req.officer_details[category];
      });
      officer_details.forEach((item) => {
        item.name = item.fname + " " + item.lname;
      });
    } else {
      var officer_details = [];
    }
    res.render('main_xray_cargo', { user: req.user, officer_details: officer_details });
  }
})

router.get('/xray_cargo/:nric', functions.verifyAdmin, functions.getEachOfficers, functions.getXrayCargoRecords, function (req, res) {
  if (req.user == null || req.user === undefined) {
    res.redirect('/login');
  } else {
    var keys = [];
    if (req.xray_cargo_details != undefined || req.xray_cargo_details != null) {
      var xray_cargo_details = Object.keys(req.xray_cargo_details).sort(function (a, b) {
        return req.xray_cargo_details[b].certified_date - req.xray_cargo_details[a].certified_date;
      }).map(function (category) {
        var key = getKeyByValue(req.xray_cargo_details, req.xray_cargo_details[category]);
        keys.push(key);
        return req.xray_cargo_details[category];
      });
      xray_cargo_details.forEach((item, i) => {
        if (item.overall_status == "1") {
          item.overall_status = "PASS";
        } else if (item.overall_status == "0") {
          item.overall_status = "FAIL";
        }
        item.certified_date = UNIXConverter(item.certified_date);
        item.id = i + 1;
        item.key = keys[i];
      });
    } else {
      var xray_cargo_details = [];
    }
    if (req.query.valid == "new_success") {
      notif = "New record has been added successfully."
      alert = true;
    } else if (req.query.valid == "update_success") {
      notif = "Officer's record updated successfully."
      alert = true;
    } else if (req.query.valid == "update_fail") {
      notif = "Failed to update officer's record."
      alert = false;
    } else if (req.query.valid == "delete_success") {
      notif = "Officer's record deleted."
      alert = false;
    } else if (req.query.valid == "delete_fail") {
      notif = "Failed to delete officer's record."
      alert = false;
    } else {
      notif = null;
      alert = null;
    }
    res.render('xray_cargo', { user: req.user, officer_details: req.officer_details, xray_cargo_details: xray_cargo_details, notif: notif, alert: alert });
  }
})

router.get('/xray_cargo/new/:nric', functions.isAdminPage, functions.verifyAdmin, functions.getEachOfficers, function (req, res) {
  if (req.user == null || req.user === undefined) {
    res.redirect('/login');
  } else {
    res.render('new_xray_cargo', { user: req.user, officer_details: req.officer_details })
  }
})

router.post('/xray_cargo/new/:nric', functions.isAdminPage, functions.verifyAdmin, functions.getEachOfficers, function (req, res) {
  if (req.user == null || req.user === undefined) {
    res.redirect('/login');
  } else {
    var officer_id = req.params.nric;

    var overall_status = req.body.overall_status;
    var certified_date = functions.dateToUNIX(req.body.certified_date);
    var xray_cargo_theory = req.body.xray_cargo_theory;
    var xray_cargo_theory_status = req.body.xray_cargo_theory_status;
    var xray_cargo_etd = req.body.xray_cargo_etd;
    var xray_cargo_etd_status = req.body.xray_cargo_etd_status;
    var xray_cargo_iit = req.body.xray_cargo_iit;
    var xray_cargo_iit_status = req.body.xray_cargo_iit_status;

    var data = {
      overall_status: overall_status,
      certified_date: certified_date,
      theory: {
        date: functions.dateToUNIX(xray_cargo_theory),
        status: xray_cargo_theory_status
      },
      etd: {
        date: functions.dateToUNIX(xray_cargo_etd),
        status: xray_cargo_etd_status
      },
      iit: {
        date: functions.dateToUNIX(xray_cargo_iit),
        status: xray_cargo_iit_status
      }
    }

    firebase.db.ref("officers/" + officer_id + "/certification/xray_cargo/").push(data, function (error) {
      if (!error) {
        res.redirect(url.format({
          pathname: "/xray_cargo/" + officer_id,
          query: {
            "valid": "new_success"
          }
        }));
      }
    });
  }
})

router.get('/xray_cargo/:nric/:xray_cargo_id', functions.verifyAdmin, functions.getEachOfficers, functions.getEachXrayCargoRecord, function (req, res) {
  if (req.user == null || req.user === undefined) {
    res.redirect('/login');
  } else {
    res.render('view_xray_cargo', { user: req.user, officer_details: req.officer_details, xray_cargo_id: req.params.xray_cargo_id, xray_cargo_details: req.xray_cargo_details });
  }
});

router.post('/xray_cargo/:nric/:xray_cargo_id', functions.verifyAdmin, function (req, res) {
  if (req.user == null || req.user === undefined) {
    res.redirect('/login');
  } else {
    var officer_id = req.params.nric;
    var xray_cargo_id = req.params.xray_cargo_id;

    var editBtn = req.body.edit_btn;
    var deleteBtn = req.body.delete_btn;

    if (deleteBtn != null) { // IF DELETE BUTTON PRESSED
      firebase.db.ref("officers/" + officer_id + "/certification/xray_cargo/" + xray_cargo_id).set(null, function (error) {
        if (!error) {
          res.redirect(url.format({
            pathname: "/xray_cargo/" + officer_id,
            query: {
              "valid": "delete_success"
            }
          }));
        } else {
          res.redirect(url.format({
            pathname: "/xray_cargo/" + officer_id,
            query: {
              "valid": "delete_fail"
            }
          }));
        }
      });
    } else if (editBtn != null) {
      var overall_status = req.body.overall_status;
      var certified_date = functions.dateToUNIX(req.body.certified_date);
      var xray_cargo_theory = req.body.xray_cargo_theory;
      var xray_cargo_theory_status = req.body.xray_cargo_theory_status;
      var xray_cargo_etd = req.body.xray_cargo_etd;
      var xray_cargo_etd_status = req.body.xray_cargo_etd_status;
      var xray_cargo_iit = req.body.xray_cargo_iit;
      var xray_cargo_iit_status = req.body.xray_cargo_iit_status;

      var data = {
        overall_status: overall_status,
        certified_date: certified_date,
        theory: {
          date: functions.dateToUNIX(xray_cargo_theory),
          status: xray_cargo_theory_status
        },
        etd: {
          date: functions.dateToUNIX(xray_cargo_etd),
          status: xray_cargo_etd_status
        },
        iit: {
          date: functions.dateToUNIX(xray_cargo_iit),
          status: xray_cargo_iit_status
        }
      }

      firebase.db.ref("officers/" + officer_id + "/certification/xray_cargo/" + xray_cargo_id).update(data, function (error) {
        if (!error) {
          res.redirect(url.format({
            pathname: "/xray_cargo/" + officer_id,
            query: {
              "valid": "update_success"
            }
          }));
        } else {
          res.redirect(url.format({
            pathname: "/xray_cargo/" + officer_id,
            query: {
              "valid": "update_fail"
            }
          }));
        }
      });
    }
  }
});

//Security Test Section

router.get('/security_test', functions.verifyAdmin, functions.getOfficers, function (req, res) {
  if (req.user == null || req.user === undefined) {
    res.redirect('/login');
  } else {
    var keys = [];
    if (req.officer_details != undefined || req.officer_details != null) {
      var officer_details = Object.keys(req.officer_details).sort(function (a, b) {
        return req.officer_details[b].nric - req.officer_details[a].nric;
      }).map(function (category) {
        var key = getKeyByValue(req.officer_details, req.officer_details[category]);
        keys.push(key);
        return req.officer_details[category];
      });
      officer_details.forEach((item) => {
        item.name = item.fname + " " + item.lname;
      });
    } else {
      var officer_details = [];
    }
    res.render('main_security_test', { user: req.user, officer_details: officer_details });
  }
})

router.get('/security_test/:nric', functions.verifyAdmin, functions.getEachOfficers, functions.getSTRecords, function (req, res) {
  if (req.user == null || req.user === undefined) {
    res.redirect('/login');
  } else {
    var keys = [];
    if (req.security_test_details != undefined || req.security_test_details != null) {
      var st_details = Object.keys(req.security_test_details).sort(function (a, b) {
        return req.security_test_details[b].st_date - req.security_test_details[a].st_date;
      }).map(function (category) {
        var key = getKeyByValue(req.security_test_details, req.security_test_details[category]);
        keys.push(key);
        return req.security_test_details[category];
      });
      st_details.forEach((item, i) => {
        if (item.overall_status == "1") {
          item.overall_status = "PASS";
        } else if (item.overall_status == "0") {
          item.overall_status = "FAIL";
        }
        item.st_date = UNIXConverter(item.st_date);
        item.key = keys[i];
      });
    } else {
      var st_details = null;
    }
    if (req.query.valid == "new_success") {
      notif = "New record has been added successfully."
      alert = true;
    } else if (req.query.valid == "update_success") {
      notif = "Officer's record updated successfully."
      alert = true;
    } else if (req.query.valid == "update_fail") {
      notif = "Failed to update officer's record."
      alert = false;
    } else if (req.query.valid == "delete_success") {
      notif = "Officer's record deleted."
      alert = false;
    } else if (req.query.valid == "delete_fail") {
      notif = "Failed to delete officer's record."
      alert = false;
    } else {
      notif = null;
      alert = null;
    }
    res.render('security_test', { user: req.user, officer_details: req.officer_details, st_details: st_details, notif: notif, alert: alert });
  }
})

router.get('/security_test/new/:nric', functions.isAdminPage, functions.verifyAdmin, functions.getEachOfficers, function (req, res) {
  if (req.user == null || req.user === undefined) {
    res.redirect('/login');
  } else {
    res.render('new_security_test', { user: req.user, officer_details: req.officer_details })
  }
})

router.post('/security_test/new/:nric', functions.isAdminPage, functions.verifyAdmin, functions.getEachOfficers, function (req, res) {
  if (req.user == null || req.user === undefined) {
    res.redirect('/login');
  } else {
    var upload = req.files;

    if (upload && upload.st_image) {
      upload.st_image.mv('./uploads/' + upload.st_image.name);
    }
    var officer_id = req.params.nric;

    var overall_status = req.body.overall_status;
    var st_name = req.body.st_name;
    var st_date = functions.dateToUNIX(req.body.st_date);
    var st_time = req.body.st_time;
    var st_location = req.body.st_location;
    var st_AvSOAPO = req.body.st_AvSOAPO;
    var st_certExp = req.body.st_certExp;
    var st_svrYr = req.body.st_svrYr;
    var st_mode = req.body.st_mode;
    var st_entity = req.body.st_entity;
    var st_sto = req.body.st_sto;
    var st_em = req.body.st_em;
    var st_rt = req.body.st_rt;
    var st_so = req.body.st_so;
    var st_certSeized = req.body.st_certSeized;
    var st_cat = req.body.st_cat;
    var st_supervisor = req.body.st_supervisor;
    var st_image = '';
    if (upload && upload.st_image) {
      st_image = upload.st_image.name;
    }
    var st_remarks = req.body.st_remarks;


    var data = {
      overall_status: overall_status,
      st_name: st_name,
      st_date: st_date,
      st_time: st_time,
      st_location: st_location,
      st_AvSOAPO: st_AvSOAPO,
      st_certExp: st_certExp,
      st_svrYr: st_svrYr,
      st_mode: st_mode,
      st_entity: st_entity,
      st_sto: st_sto,
      st_em: st_em,
      st_rt: st_rt,
      st_so: st_so,
      st_certSeized: st_certSeized,
      st_cat: st_cat,
      st_supervisor: st_supervisor,
      st_image: st_image,
      st_remarks: st_remarks
    }
    firebase.db.ref("officers/" + officer_id + "/security_records/security_test/").push(JSON.parse(JSON.stringify(data)), function (error) {
      if (!error) {
        res.redirect(url.format({
          pathname: "/security_test/" + officer_id,
          query: {
            "valid": "new_success"
          }
        }));
      }
    });
  }
})

router.get('/security_test/:nric/:st_id', functions.verifyAdmin, functions.getEachOfficers, functions.getEachSTRecord, function (req, res) {
  if (req.user == null || req.user === undefined) {
    res.redirect('/login');
  } else {
    res.render('view_security_test', { user: req.user, officer_details: req.officer_details, st_id: req.params.st_id, st_details: req.security_test_details });
  }
});

router.post('/security_test/:nric/:st_id', functions.verifyAdmin, function (req, res) {
  if (req.user == null || req.user === undefined) {
    res.redirect('/login');
  } else {
    var officer_id = req.params.nric;
    var st_id = req.params.st_id;

    var editBtn = req.body.edit_btn;
    var deleteBtn = req.body.delete_btn;

    if (deleteBtn != null) { // IF DELETE BUTTON PRESSED
      firebase.db.ref("officers/" + officer_id + "/security_records/security_test/" + st_id).set(null, function (error) {
        if (!error) {
          res.redirect(url.format({
            pathname: "/security_test/" + officer_id,
            query: {
              "valid": "delete_success"
            }
          }));
        } else {
          res.redirect(url.format({
            pathname: "/security_test/" + officer_id,
            query: {
              "valid": "delete_fail"
            }
          }));
        }
      });
    } else if (editBtn != null) {
      var upload = req.files;

      if (upload && upload.st_image) {
        upload.st_image.mv('./uploads/' + upload.st_image.name);
      }

      var overall_status = req.body.overall_status;
      var st_name = req.body.st_name;
      var st_date = functions.dateToUNIX(req.body.st_date);
      var st_time = req.body.st_time;
      var st_location = req.body.st_location;
      var st_AvSOAPO = req.body.st_AvSOAPO;
      var st_certExp = req.body.st_certExp;
      var st_svrYr = req.body.st_svrYr;
      var st_mode = req.body.st_mode;
      var st_entity = req.body.st_entity;
      var st_sto = req.body.st_sto;
      var st_em = req.body.st_em;
      var st_rt = req.body.st_rt;
      var st_so = req.body.st_so;
      var st_certSeized = req.body.st_certSeized;
      var st_cat = req.body.st_cat;
      var st_supervisor = req.body.st_supervisor;
      var st_image = '';
      if (upload && upload.st_image) {
        st_image = upload.st_image.name;
      }
      var st_remarks = req.body.st_remarks;


      var data = {
        overall_status: overall_status,
        st_name: st_name,
        st_date: st_date,
        st_time: st_time,
        st_location: st_location,
        st_AvSOAPO: st_AvSOAPO,
        st_certExp: st_certExp,
        st_svrYr: st_svrYr,
        st_mode: st_mode,
        st_entity: st_entity,
        st_sto: st_sto,
        st_em: st_em,
        st_rt: st_rt,
        st_so: st_so,
        st_certSeized: st_certSeized,
        st_cat: st_cat,
        st_supervisor: st_supervisor,
        st_image: st_image,
        st_remarks: st_remarks
      }

      firebase.db.ref("officers/" + officer_id + "/security_records/security_test/" + st_id).update(JSON.parse(JSON.stringify(data)), function (error) {
        if (!error) {
          res.redirect(url.format({
            pathname: "/security_test/" + officer_id,
            query: {
              "valid": "update_success"
            }
          }));
        } else {
          res.redirect(url.format({
            pathname: "/security_test/" + officer_id,
            query: {
              "valid": "update_fail"
            }
          }));
        }
      });
    }
  }
});

//Security Breach Section

router.get('/security_breach', functions.verifyAdmin, functions.getOfficers, function (req, res) {
  if (req.user == null || req.user === undefined) {
    res.redirect('/login');
  } else {
    var keys = [];
    if (req.officer_details != undefined || req.officer_details != null) {
      var officer_details = Object.keys(req.officer_details).sort(function (a, b) {
        return req.officer_details[b].nric - req.officer_details[a].nric;
      }).map(function (category) {
        var key = getKeyByValue(req.officer_details, req.officer_details[category]);
        keys.push(key);
        return req.officer_details[category];
      });
      officer_details.forEach((item) => {
        item.name = item.fname + " " + item.lname;
      });
    } else {
      var officer_details = [];
    }
    res.render('main_security_breach', { user: req.user, officer_details: officer_details });
  }
})

router.get('/security_breach/:nric', functions.verifyAdmin, functions.getEachOfficers, functions.getSBRecords, function (req, res) {
  if (req.user == null || req.user === undefined) {
    res.redirect('/login');
  } else {
    var keys = [];
    if (req.security_breach_details != undefined || req.security_breach_details != null) {
      var sb_details = Object.keys(req.security_breach_details).sort(function (a, b) {
        return req.security_breach_details[b].sb_date - req.security_breach_details[a].sb_date;
      }).map(function (category) {
        var key = getKeyByValue(req.security_breach_details, req.security_breach_details[category]);
        keys.push(key);
        return req.security_breach_details[category];
      });
      sb_details.forEach((item, i) => {
        if (item.overall_status == "1") {
          item.overall_status = "PASS";
        } else if (item.overall_status == "0") {
          item.overall_status = "FAIL";
        }
        item.sb_date = UNIXConverter(item.sb_date);
        item.key = keys[i];
      });
    } else {
      var sb_details = null;
    }
    if (req.query.valid == "new_success") {
      notif = "New record has been added successfully."
      alert = true;
    } else if (req.query.valid == "update_success") {
      notif = "Officer's record updated successfully."
      alert = true;
    } else if (req.query.valid == "update_fail") {
      notif = "Failed to update officer's record."
      alert = false;
    } else if (req.query.valid == "delete_success") {
      notif = "Officer's record deleted."
      alert = false;
    } else if (req.query.valid == "delete_fail") {
      notif = "Failed to delete officer's record."
      alert = false;
    } else {
      notif = null;
      alert = null;
    }
    res.render('security_breach', { user: req.user, officer_details: req.officer_details, sb_details: sb_details, notif: notif, alert: alert });
  }
})

router.get('/security_breach/new/:nric', functions.isAdminPage, functions.verifyAdmin, functions.getEachOfficers, function (req, res) {
  if (req.user == null || req.user === undefined) {
    res.redirect('/login');
  } else {
    res.render('new_security_breach', { user: req.user, officer_details: req.officer_details })
  }
})

router.post('/security_breach/new/:nric', functions.isAdminPage, functions.verifyAdmin, functions.getEachOfficers, function (req, res) {
  if (req.user == null || req.user === undefined) {
    res.redirect('/login');
  } else {
    var upload = req.files;

    if (upload && upload.sb_image) {
      upload.sb_image.mv('./uploads/' + upload.sb_image.name);
    }
    var officer_id = req.params.nric;

    var sb_name = req.body.sb_name;
    var sb_date = functions.dateToUNIX(req.body.sb_date);
    var sb_time = req.body.sb_time;
    var sb_location = req.body.sb_location;
    var sb_breachOff = req.body.sb_breachOff;
    var sb_personInv = req.body.sb_personInv;
    var sb_supervisor = req.body.sb_supervisor;
    var sb_contact = req.body.sb_contact;
    var sb_entity = req.body.sb_entity;
    var sb_certExpOrAPno = req.body.sb_certExpOrAPno;
    var sb_detect = req.body.sb_detect;
    var sb_certSeized = req.body.sb_certSeized;
    var sb_cat = req.body.sb_cat;
    var sb_image = '';
    if (upload && upload.sb_image) {
      sb_image = upload.sb_image.name;
    }
    var sb_remarks = req.body.sb_remarks;


    var data = {
      sb_name: sb_name,
      sb_date: sb_date,
      sb_time: sb_time,
      sb_location: sb_location,
      sb_breachOff: sb_breachOff,
      sb_personInv: sb_personInv,
      sb_supervisor: sb_supervisor,
      sb_contact: sb_contact,
      sb_entity: sb_entity,
      sb_certExpOrAPno: sb_certExpOrAPno,
      sb_detect: sb_detect,
      sb_certSeized: sb_certSeized,
      sb_cat: sb_cat,
      sb_image: sb_image,
      sb_remarks: sb_remarks
    }
    firebase.db.ref("officers/" + officer_id + "/security_records/security_breach/").push(JSON.parse(JSON.stringify(data)), function (error) {
      if (!error) {
        res.redirect(url.format({
          pathname: "/security_breach/" + officer_id,
          query: {
            "valid": "new_success"
          }
        }));
      }
    });
  }
})

router.get('/security_breach/:nric/:sb_id', functions.verifyAdmin, functions.getEachOfficers, functions.getEachSBRecord, function (req, res) {
  if (req.user == null || req.user === undefined) {
    res.redirect('/login');
  } else {
    res.render('view_security_breach', { user: req.user, officer_details: req.officer_details, sb_id: req.params.sb_id, sb_details: req.security_breach_details });
  }
});

router.post('/security_breach/:nric/:sb_id', functions.verifyAdmin, function (req, res) {
  if (req.user == null || req.user === undefined) {
    res.redirect('/login');
  } else {
    var officer_id = req.params.nric;
    var sb_id = req.params.sb_id;

    var editBtn = req.body.edit_btn;
    var deleteBtn = req.body.delete_btn;

    if (deleteBtn != null) { // IF DELETE BUTTON PRESSED
      firebase.db.ref("officers/" + officer_id + "/security_records/security_breach/" + sb_id).set(null, function (error) {
        if (!error) {
          res.redirect(url.format({
            pathname: "/security_breach/" + officer_id,
            query: {
              "valid": "delete_success"
            }
          }));
        } else {
          res.redirect(url.format({
            pathname: "/security_breach/" + officer_id,
            query: {
              "valid": "delete_fail"
            }
          }));
        }
      });
    } else if (editBtn != null) {
      var upload = req.files;

      if (upload && upload.sb_image) {
        upload.sb_image.mv('./uploads/' + upload.sb_image.name);
      }

      var sb_name = req.body.sb_name;
      var sb_date = functions.dateToUNIX(req.body.sb_date);
      var sb_time = req.body.sb_time;
      var sb_location = req.body.sb_location;
      var sb_breachOff = req.body.sb_breachOff;
      var sb_personInv = req.body.sb_personInv;
      var sb_supervisor = req.body.sb_supervisor;
      var sb_contact = req.body.sb_contact;
      var sb_entity = req.body.sb_entity;
      var sb_certExpOrAPno = req.body.sb_certExpOrAPno;
      var sb_detect = req.body.sb_detect;
      var sb_certSeized = req.body.sb_certSeized;
      var sb_cat = req.body.sb_cat;
      var sb_image = '';
      if (upload && upload.sb_image) {
        sb_image = upload.sb_image.name;
      }
      var sb_remarks = req.body.sb_remarks;


      var data = {
        sb_name: sb_name,
        sb_date: sb_date,
        sb_time: sb_time,
        sb_location: sb_location,
        sb_breachOff: sb_breachOff,
        sb_personInv: sb_personInv,
        sb_supervisor: sb_supervisor,
        sb_contact: sb_contact,
        sb_entity: sb_entity,
        sb_certExpOrAPno: sb_certExpOrAPno,
        sb_detect: sb_detect,
        sb_certSeized: sb_certSeized,
        sb_cat: sb_cat,
        sb_image: sb_image,
        sb_remarks: sb_remarks
      }

      firebase.db.ref("officers/" + officer_id + "/security_records/security_breach/" + sb_id).update(JSON.parse(JSON.stringify(data)), function (error) {
        if (!error) {
          res.redirect(url.format({
            pathname: "/security_breach/" + officer_id,
            query: {
              "valid": "update_success"
            }
          }));
        } else {
          res.redirect(url.format({
            pathname: "/security_breach/" + officer_id,
            query: {
              "valid": "update_fail"
            }
          }));
        }
      });
    }
  }
});

//Others Section

router.get('/others', functions.verifyAdmin, functions.getOfficers, function (req, res) {
  if (req.user == null || req.user === undefined) {
    res.redirect('/login');
  } else {
    var keys = [];
    if (req.officer_details != undefined || req.officer_details != null) {
      var officer_details = Object.keys(req.officer_details).sort(function (a, b) {
        return req.officer_details[b].nric - req.officer_details[a].nric;
      }).map(function (category) {
        var key = getKeyByValue(req.officer_details, req.officer_details[category]);
        keys.push(key);
        return req.officer_details[category];
      });
      officer_details.forEach((item) => {
        item.name = item.fname + " " + item.lname;
      });
    } else {
      var officer_details = [];
    }
    res.render('main_others', { user: req.user, officer_details: officer_details });
  }
})

router.get('/others/:nric', functions.verifyAdmin, functions.getEachOfficers, functions.getOTHERSRecords, function (req, res) {
  if (req.user == null || req.user === undefined) {
    res.redirect('/login');
  } else {
    var keys = [];
    if (req.others_details != undefined || req.others_details != null) {
      var others_details = Object.keys(req.others_details).sort(function (a, b) {
        return req.others_details[b].others_cardSeized - req.others_details[a].others_cardSeized;
      }).map(function (category) {
        var key = getKeyByValue(req.others_details, req.others_details[category]);
        keys.push(key);
        return req.others_details[category];
      });
      others_details.forEach((item, i) => {
        item.others_cardSeized = UNIXConverter(item.others_cardSeized);
        item.others_cardReturned = UNIXConverter(item.others_cardReturned);
        item.key = keys[i];
      });
    } else {
      var others_details = [];
    }
    if (req.query.valid == "new_success") {
      notif = "New record has been added successfully."
      alert = true;
    } else if (req.query.valid == "update_success") {
      notif = "Officer's record updated successfully."
      alert = true;
    } else if (req.query.valid == "update_fail") {
      notif = "Failed to update officer's record."
      alert = false;
    } else if (req.query.valid == "delete_success") {
      notif = "Officer's record deleted."
      alert = false;
    } else if (req.query.valid == "delete_fail") {
      notif = "Failed to delete officer's record."
      alert = false;
    } else {
      notif = null;
      alert = null;
    }
    res.render('others', { user: req.user, officer_details: req.officer_details, others_details: others_details, notif: notif, alert: alert });
  }
})

router.get('/others/new/:nric', functions.isAdminPage, functions.verifyAdmin, functions.getEachOfficers, function (req, res) {
  if (req.user == null || req.user === undefined) {
    res.redirect('/login');
  } else {
    res.render('new_others', { user: req.user, officer_details: req.officer_details })
  }
})

router.post('/others/new/:nric', functions.isAdminPage, functions.verifyAdmin, functions.getEachOfficers, function (req, res) {
  if (req.user == null || req.user === undefined) {
    res.redirect('/login');
  } else {
    var officer_id = req.params.nric;

    var others_name = req.body.others_name;
    var others_cardSeized = functions.dateToUNIX(req.body.others_cardSeized);
    var others_certCardNo = req.body.others_certCardNo;
    var others_cardReturned = functions.dateToUNIX(req.body.others_cardReturned);
    var others_exEmployer = req.body.others_exEmployer;
    var others_serviceNo = req.body.others_serviceNo;
    var others_reason = req.body.others_reason;
    var others_remarks = req.body.others_remarks;


    var data = {
      others_name: others_name,
      others_cardSeized: others_cardSeized,
      others_certCardNo: others_certCardNo,
      others_cardReturned: others_cardReturned,
      others_exEmployer: others_exEmployer,
      others_serviceNo: others_serviceNo,
      others_reason: others_reason,
      others_remarks: others_remarks
    }
    firebase.db.ref("officers/" + officer_id + "/others_records/others/").push(JSON.parse(JSON.stringify(data)), function (error) {
      if (!error) {
        res.redirect(url.format({
          pathname: "/others/" + officer_id,
          query: {
            "valid": "new_success"
          }
        }));
      }
    });
  }
})

router.get('/others/:nric/:others_id', functions.verifyAdmin, functions.getEachOfficers, functions.getEachOTHERSRecord, function (req, res) {
  if (req.user == null || req.user === undefined) {
    res.redirect('/login');
  } else {
    res.render('view_others', { user: req.user, officer_details: req.officer_details, others_id: req.params.others_id, others_details: req.others_details });
  }
});

router.post('/others/:nric/:others_id', functions.verifyAdmin, function (req, res) {
  if (req.user == null || req.user === undefined) {
    res.redirect('/login');
  } else {
    var officer_id = req.params.nric;
    var others_id = req.params.others_id;

    var editBtn = req.body.edit_btn;
    var deleteBtn = req.body.delete_btn;

    if (deleteBtn != null) { // IF DELETE BUTTON PRESSED
      firebase.db.ref("officers/" + officer_id + "/others_records/others/" + others_id).set(null, function (error) {
        if (!error) {
          res.redirect(url.format({
            pathname: "/others/" + officer_id,
            query: {
              "valid": "delete_success"
            }
          }));
        } else {
          res.redirect(url.format({
            pathname: "/others/" + officer_id,
            query: {
              "valid": "delete_fail"
            }
          }));
        }
      });
    } else if (editBtn != null) {
      var others_name = req.body.others_name;
      var others_cardSeized = functions.dateToUNIX(req.body.others_cardSeized);
      var others_certCardNo = req.body.others_certCardNo;
      var others_cardReturned = functions.dateToUNIX(req.body.others_cardReturned);
      var others_exEmployer = req.body.others_exEmployer;
      var others_serviceNo = req.body.others_serviceNo;
      var others_reason = req.body.others_reason;
      var others_remarks = req.body.others_remarks;


      var data = {
        others_name: others_name,
        others_cardSeized: others_cardSeized,
        others_certCardNo: others_certCardNo,
        others_cardReturned: others_cardReturned,
        others_exEmployer: others_exEmployer,
        others_serviceNo: others_serviceNo,
        others_reason: others_reason,
        others_remarks: others_remarks
      }

      firebase.db.ref("officers/" + officer_id + "/others_records/others/" + others_id).update(JSON.parse(JSON.stringify(data)), function (error) {
        if (!error) {
          res.redirect(url.format({
            pathname: "/others/" + officer_id,
            query: {
              "valid": "update_success"
            }
          }));
        } else {
          res.redirect(url.format({
            pathname: "/others/" + officer_id,
            query: {
              "valid": "update_fail"
            }
          }));
        }
      });
    }
  }
});

//Admin Section

router.get('/admin', functions.verifyAdmin, functions.getAllAdmin, functions.isAdminPage, function (req, res) {
  if (req.user == null || req.user === undefined) {
    res.redirect('/login');
  } else {
    var keys = [];
    if (req.admin_details != undefined || req.admin_details != null) {
      var admin_details = Object.keys(req.admin_details).sort(function (a, b) {
        return req.admin_details[b].nric - req.admin_details[a].nric;
      }).map(function (category) {
        var key = getKeyByValue(req.admin_details, req.admin_details[category]);
        keys.push(key);
        return req.admin_details[category];
      });
      admin_details.forEach((item) => {
        item.name = item.fname + " " + item.lname;
        if (item.role == 1) {
          item.role = "Administrator"
        } else if (item.role == 2) {
          item.role = "User"
        } else if (item.role == 3) {
          item.role = "Read-only User"
        }
      });
    } else {
      var admin_details = [];
    }
    if (req.query.valid == "new_success") {
      notif = "New admin has been added successfully."
      alert = true;
    } else if (req.query.valid == "new_fail") {
      notif = "Failed to add new admin."
      alert = false;
    } else if (req.query.valid == "update_success") {
      notif = "Admin's details updated successfully."
      alert = true;
    } else if (req.query.valid == "update_fail") {
      notif = "Failed to update admin's details."
      alert = false;
    } else if (req.query.valid == "delete_success") {
      notif = "Admin's record deleted."
      alert = false;
    } else if (req.query.valid == "delete_fail") {
      notif = "Failed to delete admin's record."
      alert = false;
    } else {
      notif = null;
      alert = null;
    }
    res.render('administration', { user: req.user, admin_details: admin_details, notif: notif, alert: alert });
  }
});

router.get('/admin/new', functions.isAdminPage, functions.verifyAdmin, function (req, res) {
  if (req.user == null || req.user === undefined) {
    res.redirect('/login');
  } else {
    res.render('new_admin', { user: req.user, error: null });
  }
});

router.post('/admin/new', functions.isAdminPage, functions.verifyAdmin, functions.checkUsername, functions.checkNRIC, function (req, res) {
  if (req.user == null || req.user === undefined) {
    res.redirect('/login');
  } else {
    var fname = req.body.fname;
    var lname = req.body.lname;
    var nric = req.body.nric;
    nric = nric.toUpperCase();
    var username = req.body.username;
    var password = req.body.password;
    var hashPwd = bcrypt.hashSync(password, 10);
    var role = req.body.role;

    if (req.error == null) {
      var data = {
        fname: fname,
        lname: lname,
        nric: nric,
        username: username,
        password: hashPwd,
        role: role
      };

      firebase.db.ref("admin/" + username + "/").set(data, function (error) {
        if (!error) {
          res.redirect(url.format({
            pathname: "/admin/",
            query: {
              "valid": "new_success"
            }
          }));
        } else {
          res.redirect(url.format({
            pathname: "/officers/",
            query: {
              "valid": "new_fail"
            }
          }));
        }
      });
    } else {
      res.render('new_admin', { user: req.user, error: req.error });
    }
  }
});

router.get('/admin/view/:username', functions.isAdminPage, functions.verifyAdmin, functions.getEachAdmin, functions.checkAdminCount, function (req, res) {
  if (req.user == null || req.user === undefined) {
    res.redirect('/login');
  } else {
    res.render('view_admin', { user: req.user, admin_details: req.admin_details, admin_count: req.admin_count, error: null });
  }
});

router.post('/admin/view/:username', functions.isAdminPage, functions.verifyAdmin, functions.getEachAdmin, function (req, res) {
  if (req.user == null || req.user === undefined) {
    res.redirect('/login');
  } else {
    var fname = req.body.fname;
    var lname = req.body.lname;
    var username = req.params.username;
    var role = req.body.role;

    var edit_btn = req.body.edituser_btn;
    var delete_btn = req.body.deleteuser_btn;

    if (edit_btn != null) {
      var data = {
        fname: fname,
        lname: lname,
        role: role
      }
      firebase.db.ref("/admin/" + username).update(data, function (error) {
        if (!error) {
          res.redirect(url.format({
            pathname: "/admin/",
            query: {
              "valid": "update_success"
            }
          }));
        } else {
          res.redirect(url.format({
            pathname: "/admin/",
            query: {
              "valid": "update_fail"
            }
          }));
        }
      });
    } else if (delete_btn != null) {
      firebase.db.ref("/admin/" + username).set(null, function (error) {
        if (!error) {
          res.redirect(url.format({
            pathname: "/admin/",
            query: {
              "valid": "delete_success"
            }
          }));
        } else {
          res.redirect(url.format({
            pathname: "/admin/",
            query: {
              "valid": "delete_fail"
            }
          }));
        }
      });
    }
  }
});

router.get('/admin/changepw/:username', functions.isAdminPage, functions.verifyAdmin, functions.getEachAdmin, function (req, res) {
  if (req.user == null || req.user === undefined) {
    res.redirect('/login');
  } else {
    res.render('change_pwd', { user: req.user, admin_details: req.admin_details, notif: null })
  }
});

router.post('/admin/changepw/:username', functions.isAdminPage, functions.verifyAdmin, functions.getEachAdmin, function (req, res) {
  if (req.user == null || req.user === undefined) {
    res.redirect('/login');
  } else {
    var notif = null;
    var username = req.params.username;
    var password = req.body.password;
    var rpassword = req.body.rpassword;
    var hashPwd = bcrypt.hashSync(password, 10);

    var data = { password: hashPwd }

    if (password == rpassword) {
      firebase.db.ref("/admin/" + username).update(data, function (error) {
        if (!error) {
          notif = "Password has been changed successfully.";
          alert = true;
          res.render('change_pwd', { user: req.user, admin_details: req.admin_details, notif: notif, alert: alert });
        } else {
          notif = "Unable to change password!";
          alert = false;
          res.render('change_pwd', { user: req.user, admin_details: req.admin_details, notif: notif, alert: alert });
        }
      });
    } else {
      notif = "Passwords do not match!";
      alert = false;
      res.render('change_pwd', { user: req.user, admin_details: req.admin_details, notif: notif, alert: alert });
    }
  }
});

//Profile Section

router.get('/profile', functions.verifyAdmin, functions.getAllAdmin, functions.isUserPage, function (req, res) {
  if (req.user == null || req.user === undefined) {
    res.redirect('/login');
  } else {
    res.render('profile', { user: req.user, user_details: req.admin_details });
  }
});

router.get('/user/changepw/:username', functions.isUserPage, functions.verifyAdmin, functions.getEachAdmin, function (req, res) {
  if (req.user == null || req.user === undefined) {
    res.redirect('/login');
  } else {
    res.render('change_pwd', { user: req.user, admin_details: req.admin_details, notif: null })
  }
});

router.post('/user/changepw/:username', functions.isUserPage, functions.verifyAdmin, functions.getEachAdmin, function (req, res) {
  if (req.user == null || req.user === undefined) {
    res.redirect('/login');
  } else {
    var notif = null;
    var username = req.params.username;
    var oldPassword = req.body.oldPassword;
    var password = req.body.password;
    var rpassword = req.body.rpassword;

    var hashPwd = bcrypt.hashSync(password, 10);
    
    var data = { password: hashPwd }

    var admin_details = req.admin_details;

    if (bcrypt.compareSync(oldPassword, admin_details.password)) {
      if (password == rpassword) {
        firebase.db.ref("/admin/" + username).update(data, function (error) {
          if (!error) {
            notif = "Password has been changed successfully.";
            alert = true;
            res.render('change_pwd', { user: req.user, admin_details: req.admin_details, notif: notif });
          } else {
            notif = "Unable to change password!";
            alert = false;
            res.render('change_pwd', { user: req.user, admin_details: req.admin_details, notif: notif });
          }
        });
      } else {
        notif = "Passwords do not match!";
        alert = false;
        res.render('change_pwd', { user: req.user, admin_details: req.admin_details, notif: notif, alert: alert });
      }
    } else {
      notif = "Current password is wrong, please try again.";
      alert = false;
      res.render('change_pwd', { user: req.user, admin_details: req.admin_details, notif: notif, alert: alert });
    }
  }
});

router.get('/logout', function (req, res) {
  if (req.user == null || req.user === undefined) {
    res.redirect('/login');
  } else {
    console.log('[LOGOUT] User ' + req.user);
    req.logout();
    res.redirect('/');
  }
});

router.get('/expiring_ac/', functions.verifyAdmin, functions.getOfficers, function (req, res) {
  if (req.user == null || req.user === undefined) {
    res.redirect('/login');
  } else {
    var officers = req.officer_details;

    var acToExpire = [];
    if (officers !== null) {
      for (var id in officers) {
        var officerId = officers[id];
        if (officerId && officerId.certification) {
          var officerCert = officerId.certification;
          if (officerCert) {
            if (officerCert.access_control) {
              var officerAC = officerCert.access_control;
              for (var acCrtId in officerAC) {
                var cert = officerAC[acCrtId];
                if (cert) {
                  var curDate = moment().format("YYYYMMDD");
                  var certDate = moment(cert.certified_date),
                    certDateFormat = moment.unix(certDate).format("YYYYMMDD"),
                    certDateIncr = moment(certDateFormat).add(11, 'M'),
                    certDateIncr = moment(certDateIncr).format("YYYYMMDD"),
                    diffDate = moment(curDate).diff(moment(certDateIncr), 'months', true);
                  if (diffDate > 0 && diffDate < 1) {
                    var offc = {};
                    offc.expiringDate = moment(certDateFormat).format("DD/MM/YYYY");
                    offc.name = officerId.fname + " " + officerId.lname;
                    offc.nric = id;
                    offc.certCardNo = officerId.cert_card_no;
                    offc.certId = acCrtId;
                    acToExpire.push(offc)
                  }
                }
              }
            }
          }
        }
      }
    }
    res.render('expiring_ac', { user: req.user, acToExpire: acToExpire })
  }
});


router.get('/expiring_gs', functions.verifyAdmin, functions.getOfficers, function (req, res) {
  if (req.user == null || req.user === undefined) {
    res.redirect('/login');
  } else {
    var officers = req.officer_details;

    var gsToExpire = [];
    if (officers !== null) {
      for (var id in officers) {
        var officerId = officers[id];
        if (officerId && officerId.certification) {
          var officerCert = officerId.certification;
          if (officerCert) {
            if (officerCert.general_screener) {
              var officerGS = officerCert.general_screener;
              for (var gsCrtId in officerGS) {
                var cert = officerGS[gsCrtId];
                if (cert) {
                  var curDate = moment().format("YYYYMMDD");
                  var certDate = moment(cert.certified_date),
                    certDateFormat = moment.unix(certDate).format("YYYYMMDD"),
                    certDateIncr = moment(certDateFormat).add(11, 'M'),
                    certDateIncr = moment(certDateIncr).format("YYYYMMDD"),
                    diffDate = moment(curDate).diff(moment(certDateIncr), 'months', true);
                  if (diffDate > 0 && diffDate < 1) {
                    var offc = {};
                    offc.expiringDate = moment(certDateFormat).format("DD-MM-YYYY");
                    offc.name = officerId.fname + " " + officerId.lname;
                    offc.nric = id;
                    offc.certCardNo = officerId.cert_card_no;
                    offc.certId = gsCrtId;
                    gsToExpire.push(offc)
                  }
                }
              }
            }
          }
        }
      }
    }
    res.render('expiring_gs', { user: req.user, gsToExpire: gsToExpire })
  }
});

router.get('/expiring_xrpb', functions.verifyAdmin, functions.getOfficers, function (req, res) {
  if (req.user == null || req.user === undefined) {
    res.redirect('/login');
  } else {
    var officers = req.officer_details;

    var xrpbToExpire = [];
    if (officers !== null) {
      for (var id in officers) {
        var officerId = officers[id];
        if (officerId && officerId.certification) {
          var officerCert = officerId.certification;
          if (officerCert) {
            if (officerCert.xray_pb) {
              var officerXRPB = officerCert.xray_pb;
              for (var xrpbCrtId in officerXRPB) {
                var cert = officerXRPB[xrpbCrtId];
                if (cert) {
                  var curDate = moment().format("YYYYMMDD");
                  var certDate = moment(cert.certified_date),
                    certDateFormat = moment.unix(certDate).format("YYYYMMDD"),
                    certDateIncr = moment(certDateFormat).add(11, 'M'),
                    certDateIncr = moment(certDateIncr).format("YYYYMMDD"),
                    diffDate = moment(curDate).diff(moment(certDateIncr), 'months', true);
                  if (diffDate > 0 && diffDate < 1) {
                    var offc = {};
                    offc.expiringDate = moment(certDateFormat).format("DD-MM-YYYY");
                    offc.name = officerId.fname + " " + officerId.lname;
                    offc.nric = id;
                    offc.certCardNo = officerId.cert_card_no;
                    offc.certId = xrpbCrtId;
                    xrpbToExpire.push(offc)
                  }

                }
              }
            }
          }
        }
      }
    }
    res.render('expiring_xrpb', { user: req.user, xrpbToExpire: xrpbToExpire })
  }
});

router.get('/expiring_xrhbs', functions.verifyAdmin, functions.getOfficers, function (req, res) {
  if (req.user == null || req.user === undefined) {
    res.redirect('/login');
  } else {
    var officers = req.officer_details;

    var xrhbsToExpire = [];
    if (officers !== null) {
      for (var id in officers) {
        var officerId = officers[id];
        if (officerId && officerId.certification) {
          var officerCert = officerId.certification;
          if (officerCert) {
            if (officerCert.xray_hbs) {
              var officerXRHBS = officerCert.xray_hbs;
              for (var xrhbsCrtId in officerXRHBS) {
                var cert = officerXRHBS[xrhbsCrtId];
                if (cert) {
                  var curDate = moment().format("YYYYMMDD");
                  var certDate = moment(cert.certified_date),
                    certDateFormat = moment.unix(certDate).format("YYYYMMDD"),
                    certDateIncr = moment(certDateFormat).add(11, 'M'),
                    certDateIncr = moment(certDateIncr).format("YYYYMMDD"),
                    diffDate = moment(curDate).diff(moment(certDateIncr), 'months', true);
                  if (diffDate > 0 && diffDate < 1) {
                    var offc = {};
                    offc.expiringDate = moment(certDateFormat).format("DD-MM-YYYY");
                    offc.name = officerId.fname + " " + officerId.lname;
                    offc.nric = id;
                    offc.certCardNo = officerId.cert_card_no;
                    xrhbsToExpire.push(offc)
                    offc.certId = xrhbsCrtId;
                  }

                }
              }
            }
          }
        }
      }
    }
    res.render('expiring_xrhbs', { user: req.user, xrhbsToExpire: xrhbsToExpire })
  }
});

router.get('/expiring_xrcg', functions.verifyAdmin, functions.getOfficers, function (req, res) {
  if (req.user == null || req.user === undefined) {
    res.redirect('/login');
  } else {
    var officers = req.officer_details;

    var xrcgToExpire = [];
    if (officers !== null) {
      for (var id in officers) {
        var officerId = officers[id];
        if (officerId && officerId.certification) {
          var officerCert = officerId.certification;
          if (officerCert) {
            if (officerCert.xray_cargo) {
              var officerXRCG = officerCert.xray_cargo;
              for (var xrcgCrtId in officerXRCG) {
                var cert = officerXRCG[xrcgCrtId];
                if (cert) {
                  var curDate = moment().format("YYYYMMDD");
                  var certDate = moment(cert.certified_date),
                    certDateFormat = moment.unix(certDate).format("YYYYMMDD"),
                    certDateIncr = moment(certDateFormat).add(11, 'M'),
                    certDateIncr = moment(certDateIncr).format("YYYYMMDD"),
                    diffDate = moment(curDate).diff(moment(certDateIncr), 'months', true);
                  if (diffDate > 0 && diffDate < 1) {
                    var offc = {};
                    offc.expiringDate = moment(certDateFormat).format("DD-MM-YYYY");
                    offc.name = officerId.fname + " " + officerId.lname;
                    offc.nric = id;
                    offc.certCardNo = officerId.cert_card_no;
                    offc.certId = xrcgCrtId;
                    xrcgToExpire.push(offc)
                  }

                }
              }
            }
          }
        }
      }
    }
    res.render('expiring_xrcg', { user: req.user, xrcgToExpire: xrcgToExpire })
  }
});


router.get('/securitytestfailure', functions.verifyAdmin, functions.getOfficers, function (req, res) {
  if (req.user == null || req.user === undefined) {
    res.redirect('/login');
  } else {
    var officers = req.officer_details;

    var officersST = [];
    if (officers !== null) {
      for (var id in officers) {
        var officerId = officers[id];
        if (officerId && officerId.security_records) {
          var officerSecRec = officerId.security_records;
          if (officerSecRec) {
            if (officerSecRec.security_test) {
              var officerSTRec = officerSecRec.security_test;
              for (var stCrtId in officerSTRec) {
                var stRec = officerSTRec[stCrtId];
                if (stRec) {
                  if (stRec.overall_status == 0) {
                    var offc = {};
                    offc.stId = stCrtId;
                    offc.stName = stRec.st_name;
                    offc.name = officerId.fname + " " + officerId.lname;
                    offc.nric = id;
                    offc.location = stRec.st_location;
                    offc.date = UNIXConverter(stRec.st_date);
                    offc.time = stRec.st_time;
                    offc.mode = stRec.st_mode;
                    officersST.push(offc)
                  }
                }
              }
            }
          }
        }
      }
    }
    res.render('securitytestfailure', { user: req.user, officersST: officersST })
  }
});


router.get('/securitybreach', functions.verifyAdmin, functions.getOfficers, function (req, res) {
  if (req.user == null || req.user === undefined) {
    res.redirect('/login');
  } else {
    var officers = req.officer_details;

    var officersSB = [];
    if (officers !== null) {
      for (var id in officers) {
        var officerId = officers[id];
        if (officerId && officerId.security_records) {
          var officerSecRec = officerId.security_records;
          if (officerSecRec) {
            if (officerSecRec.security_breach) {
              var officerSBRec = officerSecRec.security_breach;
              for (var accCrtId in officerSBRec) {
                var sbRec = officerSBRec[accCrtId];
                if (sbRec) {
                  var offc = {};
                  offc.sbId = accCrtId;
                  offc.sbName = sbRec.sb_name;
                  offc.name = officerId.fname;
                  offc.nric = id;
                  offc.location = sbRec.sb_location;
                  offc.date = UNIXConverter(sbRec.sb_date);
                  offc.time = sbRec.sb_time;
                  officersSB.push(offc)
                }
              }
            }
          }
        }
      }
    }
    res.render('securitybreach', { user: req.user, officersSB: officersSB })
  }
});


module.exports = router;
