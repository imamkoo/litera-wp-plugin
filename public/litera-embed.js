/**
 * Litera Universal Embed — loader untuk situs non-WordPress.
 *
 * Pemakaian:
 *   <div id="litera"></div>
 *   <script async src="https://cdn.literaa.xyz/litera-embed.js"
 *           data-article="https://situs-anda.com/artikel"
 *           data-title="Judul Artikel"></script>
 *
 * Kontrak:
 *   - container: #litera. Fallback lama:
 *     #my-react-plugin-root, #litera-widget-root, #litera-nft-widget.
 *   - URL artikel: data-article di tag script. Fallback:
 *     data-url, data-article-url di script, data-article di container,
 *     tag <link rel="canonical" href="...">, atau window.location.href.
 *   - window.myReactPluginData = { permalink, title } untuk widget.
 *   - manifest.json → bundle.<hash>.js; fallback window.literaLocalBundle bila ada.
 */
(function () {
  'use strict';

  var CDN_BASE = 'https://cdn.literaa.xyz/';
  var ROOT_ID = 'litera';
  var LEGACY_ROOT_IDS = ['my-react-plugin-root', 'litera-widget-root', 'litera-nft-widget'];
  var TIMEOUT_MS = 6000;
  var MAX_ATTEMPTS = 4;
  var RETRY_DELAY_MS = 700;
  var GUARD = '__literaEmbedLoaded';
  var RELOAD_KEY = '__litera_embed_reload_attempted';
  var injected = false;
  var loaded = false;

  // ==========================================
  // CSP DOCTOR: Developer Self-Diagnostics
  // ==========================================
  function initCspDoctor() {
    if (typeof document.addEventListener !== 'function') return;
    document.addEventListener('securitypolicyviolation', function (e) {
      var uri = e.blockedURI || '';
      if (uri.indexOf('literaa.xyz') !== -1 || uri.indexOf('alchemy.com') !== -1 || uri.indexOf('infura.io') !== -1 || uri.indexOf('polygon') !== -1) {
        console.error(
          '[Litera CSP Doctor] 🚨 Content Security Policy browser memblokir koneksi Litera!\n' +
          'Blocked URI: ' + uri + '\n' +
          'Violated Directive: ' + (e.violatedDirective || 'script-src/connect-src') + '\n\n' +
          '👉 Solusi untuk Developer Mitra:\n' +
          'Tambahkan domain berikut ke header Content-Security-Policy situs Anda:\n' +
          '  script-src:  https://cdn.literaa.xyz\n' +
          '  connect-src: https://cdn.literaa.xyz https://*.literaa.xyz https://*.polygon.technology https://*.alchemy.com https://*.infura.io\n' +
          '  img-src:     https://cdn.literaa.xyz https://*.ipfs.dweb.link https://*.nftstorage.link'
        );
      }
    });
  }
  initCspDoctor();

  function getScriptEl() {
    return document.currentScript || (function () {
      var all = document.getElementsByTagName('script');
      for (var i = all.length - 1; i >= 0; i--) {
        if (all[i].src && all[i].src.indexOf('litera-embed') !== -1) return all[i];
      }
      return null;
    })();
  }

  function findRoot() {
    var root = document.getElementById(ROOT_ID);
    if (root) return root;
    for (var i = 0; i < LEGACY_ROOT_IDS.length; i++) {
      root = document.getElementById(LEGACY_ROOT_IDS[i]);
      if (root) return root;
    }
    return null;
  }

  function ensureContainer(scriptEl) {
    var root = findRoot();
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

  function getCanonicalUrl() {
    try {
      var link = document.querySelector('link[rel="canonical"]');
      if (link && link.getAttribute('href')) {
        return link.getAttribute('href').trim();
      }
    } catch (e) {}
    return '';
  }

  function readOptions(scriptEl) {
    var ds = (scriptEl && scriptEl.dataset) || {};
    var root = findRoot();
    var fromRoot = (root && root.getAttribute('data-article')) ||
      (root && root.getAttribute('data-url')) ||
      (root && root.getAttribute('data-litera-article')) || '';
    var canonical = getCanonicalUrl();

    return {
      articleUrl: ds.article || ds.url || ds.articleUrl || fromRoot || canonical || window.location.href,
      title: ds.title || (root && root.getAttribute('data-title')) || document.title,
    };
  }

  function inject(src, isLocal) {
    if (injected || !src) return;
    injected = true;
    var s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = function () { loaded = true; };
    s.onerror = function () {
      injected = false;
      console.warn('[Litera Embed] Bundle gagal dimuat:', src);
      if (!isLocal && window.literaLocalBundle) inject(window.literaLocalBundle, true);
      else if (isLocal) showFailure();
    };
    document.body.appendChild(s);
  }

  function giveUp() {
    if (loaded) return;
    if (window.literaLocalBundle) inject(window.literaLocalBundle, true);
    if (!loaded) showFailure();
  }

  function showFailure() {
    if (window.__literaFailureShown) return;
    window.__literaFailureShown = true;
    var el = findRoot();
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
            console.warn('[Litera Embed] Stale bundle detected (' + window.__LITERA_WIDGET_VERSION__ + ' vs ' + m.version + '). Performing one-time safe reload.');
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
      if (window.literaLocalBundle) inject(window.literaLocalBundle, true);
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
          if (window.literaLocalBundle) inject(window.literaLocalBundle, true);
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

  function remountIfReady() {
    var root = findRoot();
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

    attempt(1);
    window.addEventListener('litera:article-change', remountIfReady);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
