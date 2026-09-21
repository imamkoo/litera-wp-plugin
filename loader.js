(function () {
  var CDN_BASE = 'https://cdn.literaa.xyz/';
  var TIMEOUT_MS = 3000;
  var done = false;
  var RELOAD_KEY = '__litera_reload_attempted';

  function inject(src) {
    if (done || !src) return;
    done = true;
    var s = document.createElement('script');
    s.src = src;
    s.async = true;
    document.body.appendChild(s);
  }

  function fallback() {
    inject(window.literaLocalBundle);
  }

  var timer = setTimeout(fallback, TIMEOUT_MS);

  // Periksa manifest CDN dengan query timestamp untuk memotong cache browser/proxy
  fetch(CDN_BASE + 'manifest.json?t=' + Date.now(), { cache: 'no-cache' })
    .then(function (r) {
      if (!r.ok) throw new Error('manifest ' + r.status);
      return r.json();
    })
    .then(function (m) {
      clearTimeout(timer);
      if (m && m.file) {
        window.__LITERA_EXPECTED_VERSION__ = m.version || null;
        window.__LITERA_MANIFEST_FILE__ = m.file;
        inject(CDN_BASE + m.file);

        // Guard self-heal: jika versi aktif di window tidak cocok dengan manifest setelah 4s, coba reload sekali dengan cache-buster
        setTimeout(function () {
          try {
            if (m.version && window.__LITERA_WIDGET_VERSION__ && window.__LITERA_WIDGET_VERSION__ !== m.version) {
              if (!sessionStorage.getItem(RELOAD_KEY)) {
                sessionStorage.setItem(RELOAD_KEY, '1');
                console.warn('[Litera Loader] Stale bundle detected (' + window.__LITERA_WIDGET_VERSION__ + ' vs ' + m.version + '). Performing one-time safe reload.');
                window.location.reload();
              }
            } else {
              sessionStorage.removeItem(RELOAD_KEY);
            }
          } catch (e) {}
        }, 4000);
      } else {
        fallback();
      }
    })
    .catch(function () {
      clearTimeout(timer);
      fallback();
    });
})();
