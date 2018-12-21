

self.addEventListener('install',function(event){
	console.log('[Service Worker] Installing Service Worker...',event);
});


self.addEventListener('activate',function(event){
	console.log('[Service Worker] Activating Service Worker...',event);
});


self.addEventListener('fetch', function(event) {
  console.log('[Service Worker] Fetching something ....', event);
  if (event.request.cache === 'only-if-cached' && event.request.mode !== 'same-origin') { return; } 

});

