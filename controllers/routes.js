var express = require('express');
var passport = require('passport')

var router = express.Router();

var functions = require('./modules');
var firebase = require('./firebase');

router.get('/', function (req, res) {
  if (req.user == null) {
    res.redirect('/login');
  } else {
    firebase.db.ref("searches/").once('value').then(function (snapshot) {
      if (snapshot.val() != null) {
        console.log(snapshot.val().s1);
        res.render('index', { user: req.user, s1: snapshot.val().s1, s2: snapshot.val().s2, s3: snapshot.val().s3, s4: snapshot.val().s4, s5: snapshot.val().s5 });
        console.log("[RENDER] INDEX");
        console.log("USER: " + req.user);
      } else {
        res.render('index', { user: req.user, s1: "", s2: "", s3: "", s4: "", s5: "" });
        console.log("[RENDER] INDEX");
        console.log("USER: " + req.user);
      }
    });

  }
});

router.post('/', function (req, res) {
  if (req.user == null) {
    res.redirect('/login');
  } else {
    search_nric = req.body.search_nric;
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
  }
});

router.get('/login', function (req, res) {
  res.render('login', { flash: req.flash('error') });
});

router.post('/login', passport.authenticate('local', { successRedirect: '/', failureRedirect: '/login', failureFlash: true }), function (req, res) {
});


router.get('/officers', functions.verifyAdmin, functions.getOfficers, function (req, res) {
  console.log(req.officer_details);
  for (var key in req.officer_details) {
    console.log(key);
  }
  res.render('all_officers', { user: req.user, officer_details: req.officer_details });
});

router.get('/officers/new', functions.isAdminPage, functions.verifyAdmin, function (req, res) {
  res.render('add_officer', { user: req.user });
});
router.post('/officers/new', functions.isAdminPage, function (req, res, next) {
  var nric = req.body.nric;
  firebase.db.ref("officers/" + nric + "/").once('value').then(function (snapshot) {
    if (snapshot.val() == null) {
      next();
    } else {
      res.render('add_officer', { user: req.user, message: "NRIC has been used before. Please try again." });
    }

  });
}, function (req, res) {
  var nric = req.body.nric;
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

  /*var general_screener = req.body.general_screener || 0;
  var access_control = req.body.access_control || 0;
  var etd = req.body.etd || 0;
  var front_loader = req.body.front_loader || 0;
  var xray_hbs = req.body.xray_hbs || 0;
  var xray_pb = req.body.xray_pb || 0;
  var xray_cargo = req.body.xray_cargo || 0;*/

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

  // THESE SET OF CODES ARE REMOVED -- NO LONGER WANT CERTIFICATION ON NEW OFFICER. MOVED TO GS/AC SEPARATELY.
  /*var add_user_certification = {
    general_screener: functions.dateToUNIX(general_screener),
    access_control: functions.dateToUNIX(access_control),
    etd: functions.dateToUNIX(etd),
    front_loader: functions.dateToUNIX(front_loader),
    xray_hbs: functions.dateToUNIX(xray_hbs),
    xray_pb: functions.dateToUNIX(xray_pb),
    xray_cargo: functions.dateToUNIX(xray_cargo)
  }*/

  firebase.db.ref("officers/" + nric + "/").set(add_user, function (error) {
    if (error) {
      res.render('add_officer', { user: req.user, message: "The officer could not be inserted. Please try again." });
    } else {
      res.redirect("/officers/");
      /*firebase.db.ref("officers/"+nric+"/certification/").set(add_user_certification, function(error2) {
        if (error2) {
          res.render('add_officer', {user: req.user, message: "The officer could not be inserted. Please try again."});
        } else {
          res.redirect("/officers/");
        }
      });*/
    }
  });
});

router.get('/officers/:nric', functions.verifyAdmin, functions.getEachOfficers, functions.getLatestACRecord, functions.getLatestGSRecord, functions.getLatestXrayHBSRecord, functions.getLatestXrayPBRecord, functions.getLatestXrayCargoRecord, function (req, res) {
  console.log(req.ac_details);
  res.render('officer_details', { user: req.user, officer_details: req.officer_details, ac_details: req.ac_details, gs_details: req.gs_details, xray_hbs_details: req.xray_hbs_details, xray_pb_details: req.xray_pb_details, xray_cargo_details: req.xray_cargo_details, nric: req.params.nric });
});

router.post('/officers/:nric', functions.verifyAdmin, function (req, res, next) {

  if (req.body.update_btn != null) {

    var cert_card_no = req.body.cert_card_no;
    var organisation = req.body.organisation;
    var gender = req.body.gender;
    var serial_no = req.body.serial_no;
    var designation = req.body.designation;
    var rank = req.body.rank;
    var remarks = req.body.remarks;

    /*var general_screener = req.body.general_screener || 0;
    var access_control = req.body.access_control || 0;
    var etd = req.body.etd || 0;
    var front_loader = req.body.front_loader || 0;
    var xray_hbs = req.body.xray_hbs || 0;
    var xray_pb = req.body.xray_pb || 0;
    var xray_cargo = req.body.xray_cargo || 0;*/

    var update_user = {
      cert_card_no: cert_card_no,
      organisation: organisation,
      gender: gender,
      serial_no: serial_no,
      designation: designation,
      rank: rank,
      remarks: remarks
    }

    /*var update_user_certification = {
      general_screener: functions.dateToUNIX(general_screener),
      access_control: functions.dateToUNIX(access_control),
      etd: functions.dateToUNIX(etd),
      front_loader: functions.dateToUNIX(front_loader),
      xray_hbs: functions.dateToUNIX(xray_hbs),
      xray_pb: functions.dateToUNIX(xray_pb),
      xray_cargo: functions.dateToUNIX(xray_cargo)
    }*/

    firebase.db.ref("officers/" + req.params.nric + "/").update(update_user);
    /*firebase.db.ref("officers/"+req.params.nric+"/certification/").update(update_user_certification);*/
    next();
  } else if (req.body.delete_btn != null) {
    firebase.db.ref("officers/" + req.params.nric + "/").set(null, function (error) {
      if (!error) {
        res.redirect("/officers/");
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
  //console.log(req.officer_details);
  //res.render('officer_details', {user: req.user, officer_details: req.officer_details, nric: req.params.id});
}, functions.getEachOfficers, function (req, res) {
  console.log(req.officer_details);
  res.render('officer_details', { user: req.user, officer_details: req.officer_details, ac_details: req.ac_details, gs_details: req.gs_details, xray_hbs_details: req.xray_hbs_details, xray_pb_details: req.xray_pb_details, xray_cargo_details: req.xray_cargo_details, nric: req.params.nric });
});

//Access Control Section

router.get('/access_control', functions.verifyAdmin, functions.getOfficers, function (req, res) {
  res.render('main_access_control', { user: req.user, officer_details: req.officer_details });
})

router.get('/access_control/:nric', functions.verifyAdmin, functions.getEachOfficers, functions.getACRecords, function (req, res) {
  res.render('access_control', { user: req.user, officer_details: req.officer_details, ac_details: req.ac_details });
})

router.get('/access_control/new/:nric', functions.isAdminPage, functions.verifyAdmin, functions.getEachOfficers, function (req, res) {
  var officer_id = req.params.id;
  res.render('new_access_control', { user: req.user, officer_details: req.officer_details })
})

router.post('/access_control/new/:nric', functions.isAdminPage, functions.verifyAdmin, functions.getEachOfficers, function (req, res) {
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

  var insertData = firebase.db.ref("officers/" + officer_id + "/certification/access_control/").push(data, function (error) {
    if (!error) {
      var dataId = insertData.key;
      res.redirect('/access_control/' + officer_id + '/' + dataId);
    }
  });
})

router.get('/access_control/:nric/:ac_id', functions.verifyAdmin, functions.getEachOfficers, functions.getEachACRecord, function (req, res) {
  res.render('view_access_control', { user: req.user, officer_details: req.officer_details, ac_id: req.params.ac_id, ac_details: req.ac_details });
});

router.post('/access_control/:nric/:ac_id', functions.verifyAdmin, function (req, res) {
  var officer_id = req.params.nric;
  var ac_id = req.params.ac_id;

  var editBtn = req.body.edit_btn;
  var deleteBtn = req.body.delete_btn;

  if (deleteBtn != null) { // IF DELETE BUTTON PRESSED
    firebase.db.ref("officers/" + officer_id + "/certification/access_control/" + ac_id).set(null, function (error) {
      if (!error) {
        res.redirect('/access_control/' + officer_id);
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
        res.redirect('/access_control/' + officer_id + '/' + ac_id);
      }
    });
  }
});

//General Screener Section

router.get('/general_screener', functions.verifyAdmin, functions.getOfficers, function (req, res) {
  res.render('main_general_screener', { user: req.user, officer_details: req.officer_details });
})

router.get('/general_screener/:nric', functions.verifyAdmin, functions.getEachOfficers, functions.getGSRecords, function (req, res) {
  res.render('general_screener', { user: req.user, officer_details: req.officer_details, gs_details: req.gs_details });
})

router.get('/general_screener/new/:nric', functions.isAdminPage, functions.verifyAdmin, functions.getEachOfficers, function (req, res) {
  var officer_id = req.params.id;
  res.render('new_general_screener', { user: req.user, officer_details: req.officer_details })
})

router.post('/general_screener/new/:nric', functions.isAdminPage, functions.verifyAdmin, functions.getEachOfficers, function (req, res) {
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

  var insertData = firebase.db.ref("officers/" + officer_id + "/certification/general_screener/").push(data, function (error) {
    if (!error) {
      var dataId = insertData.key;
      res.redirect('/general_screener/' + officer_id + '/' + dataId);
    }
  });
})

router.get('/general_screener/:nric/:gs_id', functions.verifyAdmin, functions.getEachOfficers, functions.getEachGSRecord, function (req, res) {
  res.render('view_general_screener', { user: req.user, officer_details: req.officer_details, gs_id: req.params.gs_id, gs_details: req.gs_details });
});

router.post('/general_screener/:nric/:gs_id', functions.verifyAdmin, function (req, res) {
  var officer_id = req.params.nric;
  var gs_id = req.params.gs_id;

  var editBtn = req.body.edit_btn;
  var deleteBtn = req.body.delete_btn;

  if (deleteBtn != null) { // IF DELETE BUTTON PRESSED
    firebase.db.ref("officers/" + officer_id + "/certification/general_screener/" + gs_id).set(null, function (error) {
      if (!error) {
        res.redirect('/general_screener/' + officer_id);
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
        res.redirect('/general_screener/' + officer_id + '/' + gs_id);
      }
    });
  }
});

//Xray HBS Section

router.get('/xray_hbs', functions.verifyAdmin, functions.getOfficers, function (req, res) {
  res.render('main_xray_hbs', { user: req.user, officer_details: req.officer_details });
})

router.get('/xray_hbs/:nric', functions.verifyAdmin, functions.getEachOfficers, functions.getXrayHBSRecords, function (req, res) {
  res.render('xray_hbs', { user: req.user, officer_details: req.officer_details, xray_hbs_details: req.xray_hbs_details });
})

router.get('/xray_hbs/new/:nric', functions.isAdminPage, functions.verifyAdmin, functions.getEachOfficers, function (req, res) {
  var officer_id = req.params.id;
  res.render('new_xray_hbs', { user: req.user, officer_details: req.officer_details })
})

router.post('/xray_hbs/new/:nric', functions.isAdminPage, functions.verifyAdmin, functions.getEachOfficers, function (req, res) {
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

  var insertData = firebase.db.ref("officers/" + officer_id + "/certification/xray_hbs/").push(data, function (error) {
    if (!error) {
      var dataId = insertData.key;
      res.redirect('/xray_hbs/' + officer_id + '/' + dataId);
    }
  });
})

router.get('/xray_hbs/:nric/:xray_hbs_id', functions.verifyAdmin, functions.getEachOfficers, functions.getEachXrayHBSRecord, function (req, res) {
  res.render('view_xray_hbs', { user: req.user, officer_details: req.officer_details, xray_hbs_id: req.params.xray_hbs_id, xray_hbs_details: req.xray_hbs_details });
});

router.post('/xray_hbs/:nric/:xray_hbs_id', functions.verifyAdmin, function (req, res) {
  var officer_id = req.params.nric;
  var xray_hbs_id = req.params.xray_hbs_id;

  var editBtn = req.body.edit_btn;
  var deleteBtn = req.body.delete_btn;

  if (deleteBtn != null) { // IF DELETE BUTTON PRESSED
    firebase.db.ref("officers/" + officer_id + "/certification/xray_hbs/" + xray_hbs_id).set(null, function (error) {
      if (!error) {
        res.redirect('/xray_hbs/' + officer_id);
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
        res.redirect('/xray_hbs/' + officer_id + '/' + xray_hbs_id);
      }
    });
  }
});

//Xray Preboard (PB) Section

router.get('/xray_pb', functions.verifyAdmin, functions.getOfficers, function (req, res) {
  res.render('main_xray_pb', { user: req.user, officer_details: req.officer_details });
})

router.get('/xray_pb/:nric', functions.verifyAdmin, functions.getEachOfficers, functions.getXrayPBRecords, function (req, res) {
  res.render('xray_pb', { user: req.user, officer_details: req.officer_details, xray_pb_details: req.xray_pb_details });
})

router.get('/xray_pb/new/:nric', functions.isAdminPage, functions.verifyAdmin, functions.getEachOfficers, function (req, res) {
  var officer_id = req.params.id;
  res.render('new_xray_pb', { user: req.user, officer_details: req.officer_details })
})

router.post('/xray_pb/new/:nric', functions.isAdminPage, functions.verifyAdmin, functions.getEachOfficers, function (req, res) {
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

  var insertData = firebase.db.ref("officers/" + officer_id + "/certification/xray_pb/").push(data, function (error) {
    if (!error) {
      var dataId = insertData.key;
      res.redirect('/xray_pb/' + officer_id + '/' + dataId);
    }
  });
})

router.get('/xray_pb/:nric/:xray_pb_id', functions.verifyAdmin, functions.getEachOfficers, functions.getEachXrayPBRecord, function (req, res) {
  res.render('view_xray_pb', { user: req.user, officer_details: req.officer_details, xray_pb_id: req.params.xray_pb_id, xray_pb_details: req.xray_pb_details });
});

router.post('/xray_pb/:nric/:xray_pb_id', functions.verifyAdmin, function (req, res) {
  var officer_id = req.params.nric;
  var xray_pb_id = req.params.xray_pb_id;

  var editBtn = req.body.edit_btn;
  var deleteBtn = req.body.delete_btn;

  if (deleteBtn != null) { // IF DELETE BUTTON PRESSED
    firebase.db.ref("officers/" + officer_id + "/certification/xray_pb/" + xray_pb_id).set(null, function (error) {
      if (!error) {
        res.redirect('/xray_pb/' + officer_id);
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
        res.redirect('/xray_pb/' + officer_id + '/' + xray_pb_id);
      }
    });
  }
});

//Xray Cargo Section

router.get('/xray_cargo', functions.verifyAdmin, functions.getOfficers, function (req, res) {
  res.render('main_xray_cargo', { user: req.user, officer_details: req.officer_details });
})

router.get('/xray_cargo/:nric', functions.verifyAdmin, functions.getEachOfficers, functions.getXrayCargoRecords, function (req, res) {
  res.render('xray_cargo', { user: req.user, officer_details: req.officer_details, xray_cargo_details: req.xray_cargo_details });
})

router.get('/xray_cargo/new/:nric', functions.isAdminPage, functions.verifyAdmin, functions.getEachOfficers, function (req, res) {
  var officer_id = req.params.id;
  res.render('new_xray_cargo', { user: req.user, officer_details: req.officer_details })
})

router.post('/xray_cargo/new/:nric', functions.isAdminPage, functions.verifyAdmin, functions.getEachOfficers, function (req, res) {
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

  var insertData = firebase.db.ref("officers/" + officer_id + "/certification/xray_cargo/").push(data, function (error) {
    if (!error) {
      var dataId = insertData.key;
      res.redirect('/xray_cargo/' + officer_id + '/' + dataId);
    }
  });
})

router.get('/xray_cargo/:nric/:xray_cargo_id', functions.verifyAdmin, functions.getEachOfficers, functions.getEachXrayCargoRecord, function (req, res) {
  res.render('view_xray_cargo', { user: req.user, officer_details: req.officer_details, xray_cargo_id: req.params.xray_cargo_id, xray_cargo_details: req.xray_cargo_details });
});

router.post('/xray_cargo/:nric/:xray_cargo_id', functions.verifyAdmin, function (req, res) {
  var officer_id = req.params.nric;
  var xray_cargo_id = req.params.xray_cargo_id;

  var editBtn = req.body.edit_btn;
  var deleteBtn = req.body.delete_btn;

  if (deleteBtn != null) { // IF DELETE BUTTON PRESSED
    firebase.db.ref("officers/" + officer_id + "/certification/xray_cargo/" + xray_cargo_id).set(null, function (error) {
      if (!error) {
        res.redirect('/xray_cargo/' + officer_id);
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
        res.redirect('/xray_cargo/' + officer_id + '/' + xray_cargo_id);
      }
    });
  }
});

//Security Test Section

router.get('/security_test', functions.verifyAdmin, functions.getOfficers, function (req, res) {
  res.render('main_security_test', { user: req.user, officer_details: req.officer_details });
})

router.get('/security_test/:nric', functions.verifyAdmin, functions.getEachOfficers, functions.getSTRecords, function (req, res) {
  res.render('security_test', { user: req.user, officer_details: req.officer_details, st_details: req.st_details });
})

router.get('/security_test/new/:nric', functions.isAdminPage, functions.verifyAdmin, functions.getEachOfficers, function (req, res) {
  var officer_id = req.params.id;
  res.render('new_security_test', { user: req.user, officer_details: req.officer_details })
})

router.post('/security_test/new/:nric', functions.isAdminPage, functions.verifyAdmin, functions.getEachOfficers, function (req, res) {
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
  var st_image = req.body.st_image;
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

  var insertData = firebase.db.ref("officers/" + officer_id + "/security_records/security_test/").push(data, function (error) {
    if (!error) {
      var dataId = insertData.key;
      res.redirect('/security_test/' + officer_id + '/' + dataId);
    }
  });
})

router.get('/security_test/:nric/:st_id', functions.verifyAdmin, functions.getEachOfficers, functions.getEachSTRecord, function (req, res) {
  res.render('view_security_test', { user: req.user, officer_details: req.officer_details, st_id: req.params.st_id, st_details: req.st_details });
});

router.post('/security_test/:nric/:st_id', functions.verifyAdmin, function (req, res) {
  var officer_id = req.params.nric;
  var st_id = req.params.st_id;

  var editBtn = req.body.edit_btn;
  var deleteBtn = req.body.delete_btn;

  if (deleteBtn != null) { // IF DELETE BUTTON PRESSED
    firebase.db.ref("officers/" + officer_id + "/security_records/security_test/" + st_id).set(null, function (error) {
      if (!error) {
        res.redirect('/security_test/' + officer_id);
      }
    });
  } else if (editBtn != null) {
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
    var st_image = req.body.st_image;
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

    firebase.db.ref("officers/" + officer_id + "/security_records/security_test/" + st_id).update(data, function (error) {
      if (!error) {
        res.redirect('/security_test/' + officer_id + '/' + st_id);
      }
    });
  }
});

//Admin Section

router.get('/admin', functions.verifyAdmin, functions.getAllAdmin, function (req, res) {
  res.render('administration', { user: req.user, admin_details: req.admin_details });
});

router.get('/admin/new', functions.isAdminPage, functions.verifyAdmin, function (req, res) {
  res.render('new_admin', { user: req.user, error: null });
});

router.post('/admin/new', functions.isAdminPage, functions.verifyAdmin, functions.checkUsername, functions.checkNRIC, function (req, res) {
  var fname = req.body.fname;
  var lname = req.body.lname;
  var nric = req.body.nric;
  var username = req.body.username;
  var password = req.body.password;
  var role = req.body.role;

  if (req.error == null) {
    var data = {
      fname: fname,
      lname: lname,
      nric: nric,
      username: username,
      password: password,
      role: role
    };

    firebase.db.ref("admin/" + username + "/").set(data, function (error) {
      if (!error) {
        res.redirect('/admin/');
      } else {
        console.log("There is an error inserting admin into firebase.");
      }
    });
  } else {
    res.render('new_admin', { user: req.user, error: req.error });
  }
});

router.get('/admin/view/:username', functions.verifyAdmin, functions.getEachAdmin, functions.checkAdminCount, function (req, res) {
  res.render('view_admin', { user: req.user, admin_details: req.admin_details, admin_count: req.admin_count, error: null });
});

router.post('/admin/view/:username', functions.verifyAdmin, functions.getEachAdmin, function (req, res) {
  var fname = req.body.fname;
  var lname = req.body.lname;
  var username = req.params.username;
  var nric = req.body.nric;
  var role = req.body.role;
  var error = null;

  var edit_btn = req.body.edituser_btn;
  var delete_btn = req.body.deleteuser_btn;

  if (edit_btn != null) {
    var data = {
      fname: fname,
      lname: lname,
      nric: nric,
      role: role
    }
    firebase.db.ref("/admin/" + username).update(data, function (error) {
      if (!error) {
        res.redirect('/admin/view/' + username);
      }
    });
  } else if (delete_btn != null) {
    firebase.db.ref("/admin/" + username).set(null, function (error) {
      if (!error) {
        res.redirect('/admin/');
      }
    });
  }
});

router.get('/admin/changepw/:username', functions.verifyAdmin, functions.getEachAdmin, function (req, res) {
  res.render('change_admin', { user: req.user, admin_details: req.admin_details, notif: null })
});

router.post('/admin/changepw/:username', functions.verifyAdmin, functions.getEachAdmin, function (req, res) {
  var notif = null;
  var username = req.params.username;
  var password = req.body.password;
  var rpassword = req.body.rpassword;

  var data = { password: password }

  if (password == rpassword) {
    firebase.db.ref("/admin/" + username).update(data, function (error) {
      if (!error) {
        notif = "Password has been changed successfully.";
        res.render('change_admin', { user: req.user, admin_details: req.admin_details, notif: notif });
      } else {
        notif = "Unable to change password!";
        res.render('change_admin', { user: req.user, admin_details: req.admin_details, notif: notif });
      }
    });
  }
});

router.get('/logout', function (req, res) {
  console.log('[LOGOUT] User ' + req.user);
  req.logout();
  res.redirect('/');
});

module.exports = router;
