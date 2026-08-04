(function () {
  var CDN_BASE = 'https://cdn.literaa.xyz/';
  var TIMEOUT_MS = 3000;
  var done = false;

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

  fetch(CDN_BASE + 'manifest.json', { cache: 'no-cache' })
    .then(function (r) {
      if (!r.ok) throw new Error('manifest ' + r.status);
      return r.json();
    })
    .then(function (m) {
      clearTimeout(timer);
      if (m && m.file) {
        inject(CDN_BASE + m.file);
      } else {
        fallback();
      }
    })
    .catch(function () {
      clearTimeout(timer);
      fallback();
    });
})();
