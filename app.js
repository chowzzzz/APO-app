var express = require('express');
var expressValidator = require('express-validator');
var bodyParser = require('body-parser');
var passport = require('passport'), LocalStrategy = require('passport-local').Strategy;
var path = require('path');
var flash = require('connect-flash');
var fileUpload = require('express-fileupload');
var routes = require('./controllers/routes');
var firebase = require('./controllers/firebase');

var app = express();

// flash
app.use(flash());
app.use(fileUpload());

//VIEW ENGINE
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '/public/views'));

// BODY PARSER MIDDLEWARE
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// SET STATIC PATH
app.use(express.static(path.join(__dirname, 'public')));
app.use("/uploads", express.static(__dirname + "/public/uploads"));

// EXPRESS VALIDATOR
app.use(expressValidator());

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
      firebase.db.ref("admin/" + username).once('value').then(function (snapshot) {
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

app.use('/', routes);

app.listen(5000, function () {
  console.log('Server started on port 5000.');
});