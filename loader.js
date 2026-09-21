(function () {
  var CDN_BASE = 'https://cdn.literaa.xyz/';
  var TIMEOUT_MS = 6000;
  var MAX_ATTEMPTS = 4;
  var RETRY_DELAY_MS = 700;
  var RELOAD_KEY = '__litera_reload_attempted';
  var injected = false;
  var loaded = false;

  function inject(src, isLocal) {
    if (injected || !src) return;
    injected = true;
    var s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = function () { loaded = true; };
    s.onerror = function () {
      injected = false;
      console.warn('[Litera Loader] Bundle gagal dimuat:', src);
      if (!isLocal && window.literaLocalBundle) {
        inject(window.literaLocalBundle, true);
      } else if (!isLocal) {
        // Tidak ada bundle lokal: retry loop masih berjalan, biarkan sampai habis.
      } else {
        showFailure();
      }
    };
    document.body.appendChild(s);
  }

  function loadLocal() {
    if (window.literaLocalBundle) inject(window.literaLocalBundle, true);
  }

  function giveUp() {
    if (loaded) return;
    loadLocal();
    if (!loaded) showFailure();
  }

  function showFailure() {
    if (window.__literaFailureShown) return;
    window.__literaFailureShown = true;
    var el = document.getElementById('my-react-plugin-root') || document.getElementById('litera-widget-root');
    if (!el) return;
    el.innerHTML = '<div style="padding:14px 18px;margin:8px 0;border:1px solid #e2b39a;border-radius:12px;background:#fdf3ee;color:#8a4a2f;font:600 13px/1.5 system-ui,sans-serif;display:flex;align-items:center;gap:10px">'
      + '<span style="font-size:16px">⚠️</span>'
      + '<span>Widget Litera gagal termuat. <a href="#" id="litera-retry-link" style="color:#d07954;font-weight:700;text-decoration:underline">Coba lagi</a></span>'
      + '</div>';
    var link = document.getElementById('litera-retry-link');
    if (link) link.onclick = function (e) {
      e.preventDefault();
      window.__literaFailureShown = false;
      el.innerHTML = '';
      injected = false;
      loaded = false;
      attempt(1);
    };
  }

  function selfHeal(m) {
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
  }

  function attempt(n) {
    if (loaded) return;
    var timer = setTimeout(function () {
      if (loaded) return;
      loadLocal();
      if (n < MAX_ATTEMPTS) setTimeout(function () { attempt(n + 1); }, RETRY_DELAY_MS * n);
      else giveUp();
    }, TIMEOUT_MS);

    fetch(CDN_BASE + 'manifest.json?t=' + Date.now(), { cache: 'no-cache' })
      .then(function (r) {
        if (!r.ok) throw new Error('manifest ' + r.status);
        return r.json();
      })
      .then(function (m) {
        clearTimeout(timer);
        if (loaded) return;
        if (m && m.file) {
          window.__LITERA_EXPECTED_VERSION__ = m.version || null;
          window.__LITERA_MANIFEST_FILE__ = m.file;
          inject(CDN_BASE + m.file, false);
          selfHeal(m);
        } else {
          loadLocal();
          if (!loaded && n >= MAX_ATTEMPTS) giveUp();
        }
      })
      .catch(function () {
        clearTimeout(timer);
        if (loaded) return;
        if (n < MAX_ATTEMPTS) {
          setTimeout(function () { attempt(n + 1); }, RETRY_DELAY_MS * n);
        } else {
          giveUp();
        }
      });
  }

  attempt(1);
})();
