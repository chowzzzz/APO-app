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
  var email = req.body.email;
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
    email: email,
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

router.get('/officers/:nric', functions.verifyAdmin, functions.getEachOfficers, functions.getLatestACRecord, functions.getLatestGSRecord, function (req, res) {
  console.log(req.ac_details);
  res.render('officer_details', { user: req.user, officer_details: req.officer_details, ac_details: req.ac_details, gs_details: req.gs_details, nric: req.params.nric });
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
  res.render('officer_details', { user: req.user, officer_details: req.officer_details, nric: req.params.id });
});

router.get('/access_control', functions.getOfficers, function (req, res) {
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

router.get('/general_screener', functions.getOfficers, function (req, res) {
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

router.get('/admin', functions.verifyAdmin, functions.getAllAdmin, function (req, res) {
  res.render('administration', { user: req.user, admin_details: req.admin_details });
});

router.get('/admin/new', functions.isAdminPage, functions.verifyAdmin, function (req, res) {
  res.render('new_admin', { user: req.user, error: null });
});

router.post('/admin/new', functions.isAdminPage, functions.verifyAdmin, function (req, res) {
  var fname = req.body.fname;
  var lname = req.body.lname;
  var nric = req.body.nric;
  var username = req.body.username;
  var password = req.body.password;
  var role = req.body.role;
  var error = null;

  if (!functions.checkUsername(username)) { // check if username exists, false = dont exist, true = exist
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
      }
    });
  } else {
    error = "The username already exists.";
    res.render('new_admin', { user: req.user, error: error });
  }
});

router.get('/admin/view/:username', functions.verifyAdmin, functions.getEachAdmin, function (req, res) {
  res.render('view_admin', { user: req.user, admin_details: req.admin_details, error: null });
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
    firebase.db.ref("/admin/" + nric).set(null, function (error) {
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