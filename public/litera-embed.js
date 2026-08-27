/**
 * Litera Universal Embed — loader untuk situs non-WordPress.
 *
 * Pemakaian (satu tag, semua atribut opsional):
 *   <script src="https://cdn.literaa.xyz/litera-embed.js"
 *           data-article-url="https://situs-anda.com/artikel"
 *           data-title="Judul Artikel"
 *           async></script>
 *
 * Kontrak:
 *   - container: pakai #my-react-plugin-root yang sudah ada, atau buat baru
 *     tepat sebelum tag skrip ini.
 *   - window.myReactPluginData = { permalink, title } untuk widget.
 *   - manifest.json → bundle.<hash>.js; fallback window.literaLocalBundle bila ada.
 */
(function () {
  'use strict';

  var CDN_BASE = 'https://cdn.literaa.xyz/';
  var ROOT_ID = 'my-react-plugin-root';
  var TIMEOUT_MS = 3000;
  var GUARD = '__literaEmbedLoaded';

  function getScriptEl() {
    return document.currentScript || (function () {
      var all = document.getElementsByTagName('script');
      for (var i = all.length - 1; i >= 0; i--) {
        if (all[i].src && all[i].src.indexOf('litera-embed') !== -1) return all[i];
      }
      return null;
    })();
  }

  function ensureContainer(scriptEl) {
    var root = document.getElementById(ROOT_ID);
    if (root) return root;

    root = document.createElement('div');
    root.id = ROOT_ID;
    if (scriptEl && scriptEl.parentNode) {
      scriptEl.parentNode.insertBefore(root, scriptEl);
    } else {
      document.body.appendChild(root);
    }
    return root;
  }

  function readOptions(scriptEl) {
    var ds = (scriptEl && scriptEl.dataset) || {};
    return {
      articleUrl: ds.articleUrl || window.location.href,
      title: ds.title || document.title,
    };
  }

  function inject(src) {
    var s = document.createElement('script');
    s.src = src;
    s.async = true;
    document.body.appendChild(s);
  }

  function loadBundle() {
    var timer = setTimeout(function () {
      if (window.literaLocalBundle) inject(window.literaLocalBundle);
    }, TIMEOUT_MS);

    fetch(CDN_BASE + 'manifest.json?t=' + Date.now(), { cache: 'no-cache' })
      .then(function (r) {
        if (!r.ok) throw new Error('manifest ' + r.status);
        return r.json();
      })
      .then(function (m) {
        clearTimeout(timer);
        if (m && m.file) inject(CDN_BASE + m.file);
        else if (window.literaLocalBundle) inject(window.literaLocalBundle);
      })
      .catch(function () {
        clearTimeout(timer);
        if (window.literaLocalBundle) inject(window.literaLocalBundle);
      });
  }

  function remountIfReady() {
    var root = document.getElementById(ROOT_ID);
    if (root && typeof window.literaMount === 'function') window.literaMount(root);
  }

  function boot() {
    if (window[GUARD]) return;
    window[GUARD] = true;

    var scriptEl = getScriptEl();
    var opts = readOptions(scriptEl);

    ensureContainer(scriptEl);

    window.myReactPluginData = {
      permalink: opts.articleUrl,
      title: opts.title,
    };

    loadBundle();
    window.addEventListener('litera:article-change', remountIfReady);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
