var express = require('express');
var express_fileupload = require('express-fileupload');
var expressValidator = require('express-validator');
var bodyParser = require('body-parser');
var extend = require("jquery-extend");
var passport = require('passport'), LocalStrategy = require('passport-local').Strategy;
var path = require('path');
var flash = require('connect-flash');

var app = express();


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

passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(user, done) {
    done(null, user);
});
passport.use(new LocalStrategy({
        usernameField: 'inputUsername',
        passwordField: 'inputPassword'
    },
    function (username, password, done) {
        try {
          db.ref("admin/"+username).once('value').then(function (snapshot) {
              if (snapshot.val() == null) {
                  return done(null, false, { message: 'Incorrect username or password.' });
              } else {
                  if (snapshot.val().password == password) {
                    console.log('[LOGIN] User '+username);
                    return done(null, username);
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
app.use(bodyParser.urlencoded({extended: true}));

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
  db.ref("officers/"+req.params.id).once('value').then(function (snapshot) {
    req.officer_details = snapshot.val();
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

app.use(function(req, res, next) {
    //res.locals.user = req.user;
    //console.log("REQ.USER IS PUT INTO LOCALS");
    next();
});

app.get('/', function(req, res) {
    if (req.user == null) {
      res.redirect('/login');
    } else {
      db.ref("searches/").once('value').then(function (snapshot) {
        if (snapshot.val() != null) {
          console.log(snapshot.val().s1);
          res.render('index', {user: req.user, s1: snapshot.val().s1, s2: snapshot.val().s2, s3: snapshot.val().s3, s4: snapshot.val().s4, s5: snapshot.val().s5});
          console.log("[RENDER] INDEX");
          console.log("USER: "+req.user);
        } else {
          res.render('index', {user: req.user, s1: "", s2: "", s3: "", s4: "", s5: ""});
          console.log("[RENDER] INDEX");
          console.log("USER: "+req.user);
        }
      });

    }
});

app.post('/', function(req, res) {
    if (req.user == null) {
      res.redirect('/login');
    } else {
      search_nric = req.body.search_nric;
      try {
        db.ref("officers/"+search_nric+"/").once('value').then(function (snapshot) {
          if (snapshot.val() != null) {
            db.ref("searches/").once('value').then(function (searches) {
              if (searches.val() != null) {
                var s1 = searches.val().s1 || null;
                var s2 = searches.val().s2 || null;
                var s3 = searches.val().s3 || null;
                var s4 = searches.val().s4 || null;

                if (search_nric == s1 || search_nric == s2 || search_nric == s3 || search_nric == s4) {
                  res.redirect("officers/"+search_nric+"/");
                } else {
                  db.ref("searches/").set({s1: search_nric, s2: s1, s3: s2, s4: s3, s5: s4}, function (error) {
                    if (!error) {
                      res.redirect("officers/"+search_nric+"/");
                    }
                  });
                }
            } else {
              db.ref("searches/").set({s1: search_nric}, function (error) {
                if (!error) {
                  res.redirect("officers/"+search_nric+"/");
                }
              });
            }
            });
          } else {
            res.render('index', {user: req.user, error: "The NRIC does not exist!", s1: "", s2: "", s3: "", s4: "", s5: ""});
          }
        });
      } catch (error) {
        res.render('index', {user: req.user, error: "The NRIC does not exist!", s1: "", s2: "", s3: "", s4: "", s5: ""});
      }
    }
});

app.get('/login', function(req, res) {
    res.render('login', {flash: req.flash('error')});
});

app.post('/login', passport.authenticate('local', {successRedirect: '/', failureRedirect: '/login', failureFlash: true}), function(req, res) {
});


app.get('/officers', verifyAdmin, getOfficers, function(req, res) {
    console.log(req.officer_details);
    for (var key in req.officer_details) {
      console.log(key);
    }
    res.render('all_officers', {user: req.user, officer_details: req.officer_details});
});

app.get('/officers/new', verifyAdmin, function(req, res) {
    res.render('add_officer', {user: req.user});
});
app.post('/officers/new', function(req, res, next) {
    var nric = req.body.nric;
    db.ref("officers/"+nric+"/").once('value').then(function (snapshot) {
      if (snapshot.val() == null) {
        next();
      } else {
        res.render('add_officer', {user: req.user, message: "NRIC has been used before. Please try again."});
      }

    });
}, function(req, res) {
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

    var general_screener = req.body.general_screener || 0;
    var access_control = req.body.access_control || 0;
    var etd = req.body.etd || 0;
    var front_loader = req.body.front_loader || 0;
    var xray_hbs = req.body.xray_hbs || 0;
    var xray_pb = req.body.xray_pb || 0;
    var xray_cargo = req.body.xray_cargo || 0;

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

    var add_user_certification = {
      general_screener: dateToUNIX(general_screener),
      access_control: dateToUNIX(access_control),
      etd: dateToUNIX(etd),
      front_loader: dateToUNIX(front_loader),
      xray_hbs: dateToUNIX(xray_hbs),
      xray_pb: dateToUNIX(xray_pb),
      xray_cargo: dateToUNIX(xray_cargo)
    }

    db.ref("officers/"+nric+"/").set(add_user, function(error) {
      if (error) {
        res.render('add_officer', {user: req.user, message: "The officer could not be inserted. Please try again."});
      } else {
        db.ref("officers/"+nric+"/certification/").set(add_user_certification, function(error2) {
          if (error2) {
            res.render('add_officer', {user: req.user, message: "The officer could not be inserted. Please try again."});
          } else {
            res.redirect("/officers/");
          }
        });
      }
    });
});

app.get('/officers/:id', verifyAdmin, getEachOfficers, function(req, res) {
    console.log(req.officer_details);
    res.render('officer_details', {user: req.user, officer_details: req.officer_details, nric: req.params.id});
});

app.post('/officers/:id', function(req, res, next) {

    if (req.body.update_btn != null) {

      var cert_card_no = req.body.cert_card_no;
      var organisation = req.body.organisation;
      var gender = req.body.gender;
      var serial_no = req.body.serial_no;
      var designation = req.body.designation;
      var rank = req.body.rank;
      var remarks = req.body.remarks;

      var general_screener = req.body.general_screener || 0;
      var access_control = req.body.access_control || 0;
      var etd = req.body.etd || 0;
      var front_loader = req.body.front_loader || 0;
      var xray_hbs = req.body.xray_hbs || 0;
      var xray_pb = req.body.xray_pb || 0;
      var xray_cargo = req.body.xray_cargo || 0;

      var update_user = {
        cert_card_no: cert_card_no,
        organisation: organisation,
        gender: gender,
        serial_no: serial_no,
        designation: designation,
        rank: rank,
        remarks: remarks
      }

      var update_user_certification = {
        general_screener: dateToUNIX(general_screener),
        access_control: dateToUNIX(access_control),
        etd: dateToUNIX(etd),
        front_loader: dateToUNIX(front_loader),
        xray_hbs: dateToUNIX(xray_hbs),
        xray_pb: dateToUNIX(xray_pb),
        xray_cargo: dateToUNIX(xray_cargo)
      }

      db.ref("officers/"+req.params.id+"/").update(update_user);
      db.ref("officers/"+req.params.id+"/certification/").update(update_user_certification);
      console.log("UPDATED.");
      next();
    } else if (req.body.delete_btn != null) {
      db.ref("officers/"+req.params.id+"/").set(null, function(error) {
        if (!error) {
          res.redirect("/officers/");
        }
      });
    }
    //console.log(req.officer_details);
    //res.render('officer_details', {user: req.user, officer_details: req.officer_details, nric: req.params.id});
}, getEachOfficers, function (req, res) {
    console.log(req.officer_details);
    res.render('officer_details', {user: req.user, officer_details: req.officer_details, nric: req.params.id});
});

app.get('/logout', function (req, res) {
   console.log('[LOGOUT] User '+req.user);
   req.logout();
   res.redirect('/');
});

app.listen(3000, function() {
    console.log('Server started on port 3000.');
});
