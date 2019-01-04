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

module.exports.checkUsername = function (req, res, next) {
  firebase.db.ref("admin/" + req.body.username).once('value').then(function (snapshot) {
    if (snapshot.exists()) {
      req.error = "The username already exists.";
      next();
    } else {
      next();
    }
  });
}

// OLD VERSION THAT DOESN'T WORK
/*module.exports.checkUsername = function (username) {
  firebase.db.ref("admin/" + username).once('value').then(function (snapshot) {
    if (snapshot.exists()) {
      return true;
    } else {
      return false;
    }
  });
}*/

module.exports.checkNRIC = function (req, res, next) {
  firebase.db.ref("admin/").once('value').then(function (snapshot) {
    var admin_details = snapshot.val();
    var exist_NRIC = false;
    var counter = 0; // need to use this because for loop is async
    var arr_length = Object.keys(admin_details).length;

    for (var id in admin_details) {
      counter++;
      loop_nric = admin_details[id].nric;
      if (loop_nric == req.body.nric) {
        exist_NRIC = true;
        req.error = "The NRIC already exists.";
        next();
      }
      if (counter == arr_length) {
        next();
      }
    }
  });
}

/*module.exports.checkNRIC = function (nric) {
  firebase.db.ref("admin/").once('value').then(function (snapshot) {
    var admin_details = snapshot.val();
    var exist_NRIC = false;
    var counter=0; // need to use this because for loop is async
    var arr_length = Object.keys(admin_details).length;
    console.log("ARRAY LENGTH: "+arr_length);
    for (var id in admin_details) {
      counter++;
      loop_nric = admin_details[id].nric;
      console.log("NRIC:" + loop_nric);
      if (loop_nric == nric) {
        console.log("NRIC EXIST");
        exist_NRIC = true;
      }
      if (counter == arr_length) {
        return exist_NRIC;
      }
    }
  });
}*/

module.exports.checkAdminCount = function (req, res, next) {
  firebase.db.ref("admin/").once('value').then(function (snapshot) {
    var admin_details = snapshot.val();
    var exist_NRIC = false;
    var counter = 0; // need to use this because for loop is async
    var admin_count = 0;
    var arr_length = Object.keys(admin_details).length;

    for (var id in admin_details) {
      counter++;
      admin_role = admin_details[id].role;
      if (admin_role == "1") { admin_count++; }
      if (counter == arr_length) {
        req.admin_count = admin_count;
        next();
      }
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

// X-RAY HBS
module.exports.getXrayHBSRecords = function (req, res, next) {
  firebase.db.ref("officers/" + req.params.nric + "/certification/xray_hbs/").once('value').then(function (snapshot) {
    req.xray_hbs_details = snapshot.val();
    next();
  });
}

module.exports.getLatestXrayHBSRecord = function (req, res, next) {
  firebase.db.ref("officers/" + req.params.nric + "/certification/xray_hbs/").orderByKey().limitToLast(1).once('value').then(function (snapshot) {
    req.xray_hbs_details = snapshot.val();
    next();
  });
}

module.exports.getEachXrayHBSRecord = function (req, res, next) {
  firebase.db.ref("officers/" + req.params.nric + "/certification/xray_hbs/" + req.params.xray_hbs_id).once('value').then(function (snapshot) {
    req.xray_hbs_details = snapshot.val();
    next();
  });
}

// X-RAY PB
module.exports.getXrayPBRecords = function (req, res, next) {
  firebase.db.ref("officers/" + req.params.nric + "/certification/xray_pb/").once('value').then(function (snapshot) {
    req.xray_pb_details = snapshot.val();
    next();
  });
}

module.exports.getLatestXrayPBRecord = function (req, res, next) {
  firebase.db.ref("officers/" + req.params.nric + "/certification/xray_pb/").orderByKey().limitToLast(1).once('value').then(function (snapshot) {
    req.xray_pb_details = snapshot.val();
    next();
  });
}

module.exports.getEachXrayPBRecord = function (req, res, next) {
  firebase.db.ref("officers/" + req.params.nric + "/certification/xray_pb/" + req.params.xray_pb_id).once('value').then(function (snapshot) {
    req.xray_pb_details = snapshot.val();
    next();
  });
}

// X-RAY CARGO
module.exports.getXrayCargoRecords = function (req, res, next) {
  firebase.db.ref("officers/" + req.params.nric + "/certification/xray_cargo/").once('value').then(function (snapshot) {
    req.xray_cargo_details = snapshot.val();
    next();
  });
}

module.exports.getLatestXrayCargoRecord = function (req, res, next) {
  firebase.db.ref("officers/" + req.params.nric + "/certification/xray_cargo/").orderByKey().limitToLast(1).once('value').then(function (snapshot) {
    req.xray_cargo_details = snapshot.val();
    next();
  });
}

module.exports.getEachXrayCargoRecord = function (req, res, next) {
  firebase.db.ref("officers/" + req.params.nric + "/certification/xray_cargo/" + req.params.xray_cargo_id).once('value').then(function (snapshot) {
    req.xray_cargo_details = snapshot.val();
    next();
  });
}

// Security Test 
module.exports.getSTRecords = function (req, res, next) {
  firebase.db.ref("officers/" + req.params.nric + "/security_records/security_test/").once('value').then(function (snapshot) {
    req.security_test_details = snapshot.val();
    next();
  });
}

module.exports.getLatestSTRecord = function (req, res, next) {
  firebase.db.ref("officers/" + req.params.nric + "/security_records/security_test/").orderByKey().limitToLast(1).once('value').then(function (snapshot) {
    req.security_test_details = snapshot.val();
    next();
  });
}

module.exports.getEachSTRecord = function (req, res, next) {
  firebase.db.ref("officers/" + req.params.nric + "/security_records/security_test/" + req.params.security_test_id).once('value').then(function (snapshot) {
    req.security_test_details = snapshot.val();
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
