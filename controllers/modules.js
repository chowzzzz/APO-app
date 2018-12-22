var firebase = require('./firebase');

// Admin
module.exports.verifyAdmin = function (req, res, next) {
  if (req.user == null) {
    res.redirect('/login');
  } else {
    next();
  }
}

module.exports.getAllAdmin = function (req, res, next) {
  firebase.db.ref("admin/").once('value').then(function (snapshot) {
    req.admin_details = snapshot.val();
    next();
  });
}

module.exports.checkUsername = function (username) {
  firebase.db.ref("admin/" + username).once('value').then(function (snapshot) {
    if (snapshot.exists()) {
      return true;
    } else {
      return false;
    }
  });
}

module.exports.getEachAdmin = function (req, res, next) {
  firebase.db.ref("admin/" + req.params.username).once('value').then(function (snapshot) {
    req.admin_details = snapshot.val();
    next();
  });
}

module.exports.isAdminPage = function (req, res, next) {
  if (req.user.role > 1) {
    res.redirect('back');
  } else {
    next();
  }
}

// Officers
module.exports.getOfficers = function (req, res, next) {
  firebase.db.ref("officers/").once('value').then(function (snapshot) {
    req.officer_details = snapshot.val();
    next();
  });
}

module.exports.getEachOfficers = function (req, res, next) {
  firebase.db.ref("officers/" + req.params.nric).once('value').then(function (snapshot) {
    req.officer_details = snapshot.val();
    next();
  });
}

// Access Control
module.exports.getACRecords = function (req, res, next) {
  firebase.db.ref("officers/" + req.params.nric + "/certification/access_control/").once('value').then(function (snapshot) {
    req.ac_details = snapshot.val();
    next();
  });
}

module.exports.getLatestACRecord = function (req, res, next) {
  firebase.db.ref("officers/" + req.params.nric + "/certification/access_control/").orderByKey().limitToLast(1).once('value').then(function (snapshot) {
    req.ac_details = snapshot.val();
    next();
  });
}

module.exports.getEachACRecord = function (req, res, next) {
  firebase.db.ref("officers/" + req.params.nric + "/certification/access_control/" + req.params.ac_id).once('value').then(function (snapshot) {
    req.ac_details = snapshot.val();
    next();
  });
}

// General Screener
module.exports.getGSRecords = function (req, res, next) {
  firebase.db.ref("officers/" + req.params.nric + "/certification/general_screener/").once('value').then(function (snapshot) {
    req.gs_details = snapshot.val();
    next();
  });
}

module.exports.getLatestGSRecord = function (req, res, next) {
  firebase.db.ref("officers/" + req.params.nric + "/certification/general_screener/").orderByKey().limitToLast(1).once('value').then(function (snapshot) {
    req.gs_details = snapshot.val();
    next();
  });
}

module.exports.getEachGSRecord = function (req, res, next) {
  firebase.db.ref("officers/" + req.params.nric + "/certification/general_screener/" + req.params.gs_id).once('value').then(function (snapshot) {
    req.gs_details = snapshot.val();
    next();
  });
}

// Date
module.exports.dateToUNIX = function (textDate) {
  try {
    var parts = textDate.split("/");
    var date = new Date(parts[2], parts[1] - 1, parts[0]);
    return date.getTime() / 1000;
  } catch (error) {
    return 0;
  }
}