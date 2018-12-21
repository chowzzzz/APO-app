var express = require('express');
var express_fileupload = require('express-fileupload');
var expressValidator = require('express-validator');
var bodyParser = require('body-parser');
var extend = require("jquery-extend");
var passport = require('passport'), LocalStrategy = require('passport-local').Strategy;
var path = require('path');
var flash = require('connect-flash');

var app = express();

app.use(express.static("public"));

// flash
app.use(flash());

//var ocrfunct = require("./ocrfunctions.js");

//VIEW ENGINE
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

//firebase
var firebase = require('firebase');
var firebase_app = firebase.initializeApp({
  apiKey: 'AIzaSyA0x-NvH7ijuHfGnzSr0wonxDdIUeWpBv0',
  authDomain: 'fyp-apo-project.firebaseapp.com',
  databaseURL: 'https://fyp-apo-project.firebaseio.com/',
  messagingSenderId: '763828288510'
});
var db = firebase.database();
var user_ref = db.ref("users");

// PASSPORTJS
var session = require("express-session");
app.use(session({ secret: "cats" }));
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function (user, done) {
  done(null, user);
});

passport.deserializeUser(function (user, done) {
  done(null, user);
});
passport.use(new LocalStrategy({
  usernameField: 'inputUsername',
  passwordField: 'inputPassword'
},
  function (username, password, done) {
    try {
      db.ref("admin/" + username).once('value').then(function (snapshot) {
        if (snapshot.val() == null) {
          return done(null, false, { message: 'Incorrect username or password.' });
        } else {
          console.log(snapshot.val());
          if (snapshot.val().password == password) {
            console.log('[LOGIN] User ' + username);
            return done(null, snapshot.val());
          } else {
            console.log("CANNOT LOGIN");
            return done(null, false, { message: 'Incorrect username or password.' });
          }
        }
      });
    } catch (e) {
      return done(null, false, { message: 'Incorrect username or password.' });
    }
  }
));

// BODY PARSER MIDDLEWARE
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// SET STATIC PATH
app.use(express.static(path.join(__dirname, 'public')));

// EXPRESS VALIDATOR
app.use(expressValidator());


function verifyAdmin(req, res, next) {
  if (req.user == null) {
    res.redirect('/login');
  } else {
    next();
  }
}

function getOfficers(req, res, next) {
  db.ref("officers/").once('value').then(function (snapshot) {
    req.officer_details = snapshot.val();
    next();
  });
}

function getEachOfficers(req, res, next) {
  db.ref("officers/" + req.params.nric).once('value').then(function (snapshot) {
    req.officer_details = snapshot.val();
    next();
  });
}

function getACRecords(req, res, next) {
  db.ref("officers/" + req.params.nric + "/certification/access_control/").once('value').then(function (snapshot) {
    req.ac_details = snapshot.val();
    next();
  });
}

function getLatestACRecord(req, res, next) {
  db.ref("officers/" + req.params.nric + "/certification/access_control/").orderByKey().limitToLast(1).once('value').then(function (snapshot) {
    req.ac_details = snapshot.val();
    next();
  });
}

function getEachACRecord(req, res, next) {
  db.ref("officers/" + req.params.nric + "/certification/access_control/" + req.params.ac_id).once('value').then(function (snapshot) {
    req.ac_details = snapshot.val();
    next();
  });
}

function getGSRecords(req, res, next) {
  db.ref("officers/" + req.params.nric + "/certification/general_screener/").once('value').then(function (snapshot) {
    req.gs_details = snapshot.val();
    next();
  });
}

function getLatestGSRecord(req, res, next) {
  db.ref("officers/" + req.params.nric + "/certification/general_screener/").orderByKey().limitToLast(1).once('value').then(function (snapshot) {
    req.gs_details = snapshot.val();
    next();
  });
}

function getEachGSRecord(req, res, next) {
  db.ref("officers/" + req.params.nric + "/certification/general_screener/" + req.params.gs_id).once('value').then(function (snapshot) {
    req.gs_details = snapshot.val();
    next();
  });
}

function getAllAdmin(req, res, next) {
  db.ref("admin/").once('value').then(function (snapshot) {
    req.admin_details = snapshot.val();
    next();
  });
}

function checkUsername(username) {
  db.ref("admin/" + username).once('value').then(function (snapshot) {
    if (snapshot.exists()) {
      return true;
    } else {
      return false;
    }
  });
}

function getEachAdmin(req, res, next) {
  db.ref("admin/" + req.params.username).once('value').then(function (snapshot) {
    req.admin_details = snapshot.val();
    next();
  });
}


function dateToUNIX(textDate) {
  try {
    var parts = textDate.split("/");
    var date = new Date(parts[2], parts[1] - 1, parts[0]);
    return date.getTime() / 1000;
  } catch (error) {
    return 0;
  }
}

function isAdminPage(req, res, next) {
  if (req.user.role > 1) {
    res.redirect('back');
  } else {
    next();
  }
}

app.use(function (req, res, next) {
  //res.locals.user = req.user;
  //console.log("REQ.USER IS PUT INTO LOCALS");
  next();
});

app.get('/', function (req, res) {
  if (req.user == null) {
    res.redirect('/login');
  } else {
    db.ref("searches/").once('value').then(function (snapshot) {
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

app.post('/', function (req, res) {
  if (req.user == null) {
    res.redirect('/login');
  } else {
    search_nric = req.body.search_nric;
    try {
      db.ref("officers/" + search_nric + "/").once('value').then(function (snapshot) {
        if (snapshot.val() != null) {
          db.ref("searches/").once('value').then(function (searches) {
            if (searches.val() != null) {
              var s1 = searches.val().s1 || null;
              var s2 = searches.val().s2 || null;
              var s3 = searches.val().s3 || null;
              var s4 = searches.val().s4 || null;

              if (search_nric == s1 || search_nric == s2 || search_nric == s3 || search_nric == s4) {
                res.redirect("officers/" + search_nric + "/");
              } else {
                db.ref("searches/").set({ s1: search_nric, s2: s1, s3: s2, s4: s3, s5: s4 }, function (error) {
                  if (!error) {
                    res.redirect("officers/" + search_nric + "/");
                  }
                });
              }
            } else {
              db.ref("searches/").set({ s1: search_nric }, function (error) {
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

app.get('/login', function (req, res) {
  res.render('login', { flash: req.flash('error') });
});

app.post('/login', passport.authenticate('local', { successRedirect: '/', failureRedirect: '/login', failureFlash: true }), function (req, res) {
});


app.get('/officers', verifyAdmin, getOfficers, function (req, res) {
  console.log(req.officer_details);
  for (var key in req.officer_details) {
    console.log(key);
  }
  res.render('all_officers', { user: req.user, officer_details: req.officer_details });
});

app.get('/officers/new', isAdminPage, verifyAdmin, function (req, res) {
  res.render('add_officer', { user: req.user });
});
app.post('/officers/new', isAdminPage, function (req, res, next) {
  var nric = req.body.nric;
  db.ref("officers/" + nric + "/").once('value').then(function (snapshot) {
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
    general_screener: dateToUNIX(general_screener),
    access_control: dateToUNIX(access_control),
    etd: dateToUNIX(etd),
    front_loader: dateToUNIX(front_loader),
    xray_hbs: dateToUNIX(xray_hbs),
    xray_pb: dateToUNIX(xray_pb),
    xray_cargo: dateToUNIX(xray_cargo)
  }*/

  db.ref("officers/" + nric + "/").set(add_user, function (error) {
    if (error) {
      res.render('add_officer', { user: req.user, message: "The officer could not be inserted. Please try again." });
    } else {
      res.redirect("/officers/");
      /*db.ref("officers/"+nric+"/certification/").set(add_user_certification, function(error2) {
        if (error2) {
          res.render('add_officer', {user: req.user, message: "The officer could not be inserted. Please try again."});
        } else {
          res.redirect("/officers/");
        }
      });*/
    }
  });
});

app.get('/officers/:nric', verifyAdmin, getEachOfficers, getLatestACRecord, getLatestGSRecord, function (req, res) {
  console.log(req.ac_details);
  res.render('officer_details', { user: req.user, officer_details: req.officer_details, ac_details: req.ac_details, gs_details: req.gs_details, nric: req.params.nric });
});

app.post('/officers/:nric', verifyAdmin, function (req, res, next) {

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
      general_screener: dateToUNIX(general_screener),
      access_control: dateToUNIX(access_control),
      etd: dateToUNIX(etd),
      front_loader: dateToUNIX(front_loader),
      xray_hbs: dateToUNIX(xray_hbs),
      xray_pb: dateToUNIX(xray_pb),
      xray_cargo: dateToUNIX(xray_cargo)
    }*/

    db.ref("officers/" + req.params.nric + "/").update(update_user);
    /*db.ref("officers/"+req.params.nric+"/certification/").update(update_user_certification);*/
    next();
  } else if (req.body.delete_btn != null) {
    db.ref("officers/" + req.params.nric + "/").set(null, function (error) {
      if (!error) {
        res.redirect("/officers/");
      }
    });
  } else if (req.body.view_cert_btn != null) {
    db.ref("officers/" + req.params.nric + "/certification/access_control").once('value').then(function (snapshot) {
      if (snapshot.exists()) {
        res.redirect("/access_control/" + req.params.nric);
      } else {
        res.redirect("/general_screener/" + req.params.nric);
      }
    });
  }
  //console.log(req.officer_details);
  //res.render('officer_details', {user: req.user, officer_details: req.officer_details, nric: req.params.id});
}, getEachOfficers, function (req, res) {
  console.log(req.officer_details);
  res.render('officer_details', { user: req.user, officer_details: req.officer_details, nric: req.params.id });
});

app.get('/access_control', getOfficers, function (req, res) {
  res.render('main_access_control', { user: req.user, officer_details: req.officer_details });
})

app.get('/access_control/:nric', verifyAdmin, getEachOfficers, getACRecords, function (req, res) {
  res.render('access_control', { user: req.user, officer_details: req.officer_details, ac_details: req.ac_details });
})

app.get('/access_control/new/:nric', isAdminPage, verifyAdmin, getEachOfficers, function (req, res) {
  var officer_id = req.params.id;
  res.render('new_access_control', { user: req.user, officer_details: req.officer_details })
})

app.post('/access_control/new/:nric', isAdminPage, verifyAdmin, getEachOfficers, function (req, res) {
  var officer_id = req.params.nric;

  var overall_status = req.body.overall_status;
  var certified_date = dateToUNIX(req.body.certified_date);
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
      date: dateToUNIX(ac_theory),
      status: ac_theory_status
    },
    hhmd: {
      date: dateToUNIX(ac_hhmd),
      status: ac_hhmd_status
    },
    pds: {
      date: dateToUNIX(ac_pds),
      status: ac_pds_status
    },
    wtmd: {
      date: dateToUNIX(ac_wtmd),
      status: ac_wtmd_status
    },
    etd: {
      date: dateToUNIX(ac_etd),
      status: ac_etd_status
    },
    mbs: {
      date: dateToUNIX(ac_mbs),
      status: ac_mbs_status
    },
    vs: {
      date: dateToUNIX(ac_vs),
      status: ac_vs_status
    }
  }

  var insertData = db.ref("officers/" + officer_id + "/certification/access_control/").push(data, function (error) {
    if (!error) {
      var dataId = insertData.key;
      res.redirect('/access_control/' + officer_id + '/' + dataId);
    }
  });
})

app.get('/access_control/:nric/:ac_id', verifyAdmin, getEachOfficers, getEachACRecord, function (req, res) {
  res.render('view_access_control', { user: req.user, officer_details: req.officer_details, ac_id: req.params.ac_id, ac_details: req.ac_details });
});

app.post('/access_control/:nric/:ac_id', verifyAdmin, function (req, res) {
  var officer_id = req.params.nric;
  var ac_id = req.params.ac_id;

  var editBtn = req.body.edit_btn;
  var deleteBtn = req.body.delete_btn;

  if (deleteBtn != null) { // IF DELETE BUTTON PRESSED
    db.ref("officers/" + officer_id + "/certification/access_control/" + ac_id).set(null, function (error) {
      if (!error) {
        res.redirect('/access_control/' + officer_id);
      }
    });
  } else if (editBtn != null) {
    var overall_status = req.body.overall_status;
    var certified_date = dateToUNIX(req.body.certified_date);
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
        date: dateToUNIX(ac_theory),
        status: ac_theory_status
      },
      hhmd: {
        date: dateToUNIX(ac_hhmd),
        status: ac_hhmd_status
      },
      pds: {
        date: dateToUNIX(ac_pds),
        status: ac_pds_status
      },
      wtmd: {
        date: dateToUNIX(ac_wtmd),
        status: ac_wtmd_status
      },
      etd: {
        date: dateToUNIX(ac_etd),
        status: ac_etd_status
      },
      mbs: {
        date: dateToUNIX(ac_mbs),
        status: ac_mbs_status
      },
      vs: {
        date: dateToUNIX(ac_vs),
        status: ac_vs_status
      }
    }

    db.ref("officers/" + officer_id + "/certification/access_control/" + ac_id).update(data, function (error) {
      if (!error) {
        res.redirect('/access_control/' + officer_id + '/' + ac_id);
      }
    });
  }
});

app.get('/general_screener', getOfficers, function (req, res) {
  res.render('main_general_screener', { user: req.user, officer_details: req.officer_details });
})

app.get('/general_screener/:nric', verifyAdmin, getEachOfficers, getGSRecords, function (req, res) {
  res.render('general_screener', { user: req.user, officer_details: req.officer_details, gs_details: req.gs_details });
})

app.get('/general_screener/new/:nric', isAdminPage, verifyAdmin, getEachOfficers, function (req, res) {
  var officer_id = req.params.id;
  res.render('new_general_screener', { user: req.user, officer_details: req.officer_details })
})

app.post('/general_screener/new/:nric', isAdminPage, verifyAdmin, getEachOfficers, function (req, res) {
  var officer_id = req.params.nric;

  var overall_status = req.body.overall_status;
  var certified_date = dateToUNIX(req.body.certified_date);
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
      date: dateToUNIX(gs_theory),
      status: gs_theory_status
    },
    hhmd: {
      date: dateToUNIX(gs_hhmd),
      status: gs_hhmd_status
    },
    pds: {
      date: dateToUNIX(gs_pds),
      status: gs_pds_status
    },
    wtmd: {
      date: dateToUNIX(gs_wtmd),
      status: gs_wtmd_status
    },
    fl: {
      date: dateToUNIX(gs_fl),
      status: gs_fl_status
    },
    etd: {
      date: dateToUNIX(gs_etd),
      status: gs_etd_status
    },
    mbs: {
      date: dateToUNIX(gs_mbs),
      status: gs_mbs_status
    }
  }

  var insertData = db.ref("officers/" + officer_id + "/certification/general_screener/").push(data, function (error) {
    if (!error) {
      var dataId = insertData.key;
      res.redirect('/general_screener/' + officer_id + '/' + dataId);
    }
  });
})

app.get('/general_screener/:nric/:gs_id', verifyAdmin, getEachOfficers, getEachGSRecord, function (req, res) {
  res.render('view_general_screener', { user: req.user, officer_details: req.officer_details, gs_id: req.params.gs_id, gs_details: req.gs_details });
});

app.post('/general_screener/:nric/:gs_id', verifyAdmin, function (req, res) {
  var officer_id = req.params.nric;
  var gs_id = req.params.gs_id;

  var editBtn = req.body.edit_btn;
  var deleteBtn = req.body.delete_btn;

  if (deleteBtn != null) { // IF DELETE BUTTON PRESSED
    db.ref("officers/" + officer_id + "/certification/general_screener/" + gs_id).set(null, function (error) {
      if (!error) {
        res.redirect('/general_screener/' + officer_id);
      }
    });
  } else if (editBtn != null) {
    var overall_status = req.body.overall_status;
    var certified_date = dateToUNIX(req.body.certified_date);
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
        date: dateToUNIX(gs_theory),
        status: gs_theory_status
      },
      hhmd: {
        date: dateToUNIX(gs_hhmd),
        status: gs_hhmd_status
      },
      pds: {
        date: dateToUNIX(gs_pds),
        status: gs_pds_status
      },
      wtmd: {
        date: dateToUNIX(gs_wtmd),
        status: gs_wtmd_status
      },
      fl: {
        date: dateToUNIX(gs_fl),
        status: gs_fl_status
      },
      etd: {
        date: dateToUNIX(gs_etd),
        status: gs_etd_status
      },
      mbs: {
        date: dateToUNIX(gs_mbs),
        status: gs_mbs_status
      }
    }

    db.ref("officers/" + officer_id + "/certification/general_screener/" + gs_id).update(data, function (error) {
      if (!error) {
        res.redirect('/general_screener/' + officer_id + '/' + gs_id);
      }
    });
  }
});

app.get('/admin', verifyAdmin, getAllAdmin, function (req, res) {
  res.render('administration', { user: req.user, admin_details: req.admin_details });
});

app.get('/admin/new', isAdminPage, verifyAdmin, function (req, res) {
  res.render('new_admin', { user: req.user, error: null });
});

app.post('/admin/new', isAdminPage, verifyAdmin, function (req, res) {
  var fname = req.body.fname;
  var lname = req.body.lname;
  var nric = req.body.nric;
  var username = req.body.username;
  var password = req.body.password;
  var role = req.body.role;
  var error = null;

  if (!checkUsername(username)) { // check if username exists, false = dont exist, true = exist
    var data = {
      fname: fname,
      lname: lname,
      nric: nric,
      username: username,
      password: password,
      role: role
    };

    db.ref("admin/" + username + "/").set(data, function (error) {
      if (!error) {
        res.redirect('/admin/');
      }
    });
  } else {
    error = "The username already exists.";
    res.render('new_admin', { user: req.user, error: error });
  }
});

app.get('/admin/view/:username', verifyAdmin, getEachAdmin, function (req, res) {
  res.render('view_admin', { user: req.user, admin_details: req.admin_details, error: null });
});

app.post('/admin/view/:username', verifyAdmin, getEachAdmin, function (req, res) {
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
    db.ref("/admin/" + username).update(data, function (error) {
      if (!error) {
        res.redirect('/admin/view/' + username);
      }
    });
  } else if (delete_btn != null) {
    db.ref("/admin/" + nric).set(null, function (error) {
      if (!error) {
        res.redirect('/admin/');
      }
    });
  }
});

app.get('/admin/changepw/:username', verifyAdmin, getEachAdmin, function (req, res) {
  res.render('change_admin', { user: req.user, admin_details: req.admin_details, notif: null })
});

app.post('/admin/changepw/:username', verifyAdmin, getEachAdmin, function (req, res) {
  var notif = null;
  var username = req.params.username;
  var password = req.body.password;
  var rpassword = req.body.rpassword;

  var data = { password: password }

  if (password == rpassword) {
    db.ref("/admin/" + username).update(data, function (error) {
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

app.get('/logout', function (req, res) {
  console.log('[LOGOUT] User ' + req.user);
  req.logout();
  res.redirect('/');
});

app.listen(3000, function () {
  console.log('Server started on port 3000.');
});
