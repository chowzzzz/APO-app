self.addEventListener('install', function (event) {
	event.waitUntil(preLoad());
});

var preLoad = function () {
	console.log('Install Event processing');
	return caches.open('app-cache').then(function (cache) {
		console.log('Cached index and offline page during Install');
		return cache.addAll([
			'./css/main.css',
			'./logosizes/16x16.png',
			'./logosizes/32x32.png',
			'./logosizes/57x57.png',
			'./logosizes/60x60.png',
			'./logosizes/72x72.png',
			'./logosizes/76x76.png',
			'./logosizes/96x96.png',
			'./logosizes/120x120.png',
			'./logosizes/144x144.png',
			'./logosizes/152x152.png',
			'./logosizes/180x180.png',
			'./logosizes/192x192.png',
			'./logosizes/512x512.png',
			'./res/betloader.gif',
			'./res/logo.ico',
			'./res/logo.png',
			'./res/Preloader_3.gif',
			'./uploads/3-2-claw-scratch-png-6.png',
			'./uploads/393604_1492185700771_1142476008_n.jpg',
			'./uploads/13199561_10153516768997321_1389034973_o.jpg',
			'./uploads/13237755_1089347254479507_2099486769241408614_n.jpg',
			'./uploads/app-icon-144x144.png',
			'./uploads/app-icon-512x512.png',
			'./uploads/char.png',
			'./uploads/logo.png',
			'./uploads/magician.jpg',
			'./uploads/man.jpg',
			'./uploads/sOdSY_Z1G7nbdEh8CFLh4S9ypHbkD5axKJte6MWX9eh866F2oL_m-s1slFwdCA0ZiCxI=w300.png',
			'./uploads/telegram.jpg',
			'./views/access_control.ejs',
			'./views/add_officer.ejs',
			'./views/administration.ejs',
			'./views/all_officers.ejs',
			'./views/change_pwd.ejs',
			'./views/expiring_ac.ejs',
			'./views/expiring_gs.ejs',
			'./views/expiring_xrcg.ejs',
			'./views/expiring_xrhbs.ejs',
			'./views/expiring_xrpb.ejs',
			'./views/general_screener.ejs',
			'./views/index.ejs',
			'./views/login.ejs',
			'./views/main_access_control.ejs',
			'./views/main_general_screener.ejs',
			'./views/main_others.ejs',
			'./views/main_security_breach.ejs',
			'./views/main_security_test.ejs',
			'./views/main_xray_cargo.ejs',
			'./views/main_xray_hbs.ejs',
			'./views/main_xray_pb.ejs',
			'./views/new_access_control.ejs',
			'./views/new_admin.ejs',
			'./views/new_general_screener.ejs',
			'./views/new_others.ejs',
			'./views/new_security_breach.ejs',
			'./views/new_security_test.ejs',
			'./views/new_xray_cargo.ejs',
			'./views/new_xray_hbs.ejs',
			'./views/new_xray_pb.ejs',
			'./views/officer_details.ejs',
			'./views/others.ejs',
			'./views/profile.ejs',
			'./views/securitybreach.ejs',
			'./views/security_breach.ejs',
			'./views/security_test.ejs',
			'./views/securitytestfailure.ejs',
			'./views/view_access_control.ejs',
			'./views/view_admin.ejs',
			'./views/view_general_screener.ejs',
			'./views/view_others.ejs',
			'./views/view_security_breach.ejs',
			'./views/view_security_test.ejs',
			'./views/view_xray_cargo.ejs',
			'./views/view_xray_hbs.ejs',
			'./views/view_xray_pb.ejs',
			'./views/xray_cargo.ejs',
			'./views/xray_hbs.ejs',
			'./views/xray_pb.ejs',
			'./views/partials/footer.ejs',
			'./views/partials/header.ejs',
			'./views/partials/nav.ejs',
			'./',
			'./manifest.json',
			'./sw.js'
		]);
	});
};

self.addEventListener('fetch', function (event) {
	console.log('The service worker is providing the asset.');
	event.respondWith(
		checkResponse(event.request).catch(function () {
			return returnFromCache(event.request);
		})
	);
	event.waitUntil(addToCache(event.request));
});

var checkResponse = function (request) {
	return new Promise(function (fulfill, reject) {
		fetch(request).then(function (response) {
			if (response.status !== 404) {
				fulfill(response);
			} else {
				reject();
			}
		}, reject);
	});
};

var addToCache = function (request) {
	return caches.open('app-cache').then(function (cache) {
		return fetch(request).then(function (response) {
			console.log('Add page to offline' + response.url);
			return cache.put(request, response);
		});
	});
};

var returnFromCache = function (request) {
	return caches.open('app-cache').then(function (cache) {
		return cache.match(request).then(function (matching) {
			if (!matching || matching.status == 404) {
				return cache.match('offline.html');
			} else {
				return matching;
			}
		});
	});
};