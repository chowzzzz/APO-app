//firebase
var firebase = require('firebase');
var firebase_app = firebase.initializeApp({
  apiKey: 'AIzaSyA0x-NvH7ijuHfGnzSr0wonxDdIUeWpBv0',
  authDomain: 'fyp-apo-project.firebaseapp.com',
  databaseURL: 'https://fyp-apo-project.firebaseio.com/',
  messagingSenderId: '763828288510'
});
module.exports.db = firebase.database();