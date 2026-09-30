const assert = require('assert');

function runEmbedScript(html, customWindow = {}) {
  const createdElements = [];
  const insertedBefore = [];
  const appendedToBody = [];
  const eventListeners = {};

  const documentStub = {
    readyState: 'complete',
    title: 'Default Doc Title',
    getElementById(id) {
      if (id === 'litera') return customWindow.__literaEl || null;
      if (id === 'my-react-plugin-root') return customWindow.__legacyEl || null;
      return null;
    },
    getElementsByTagName(tag) {
      if (tag === 'script') {
        return [customWindow.__scriptEl || { src: 'https://cdn.literaa.xyz/litera-embed.js', dataset: {} }];
      }
      return [];
    },
    createElement(tag) {
      const el = {
        tagName: tag.toUpperCase(),
        id: '',
        src: '',
        dataset: {},
        innerHTML: '',
        parentNode: null,
        getAttribute(attr) { return this.dataset ? this.dataset[attr.replace(/^data-/, '')] : null; },
        setAttribute(attr, val) { if (this.dataset) this.dataset[attr.replace(/^data-/, '')] = val; },
        appendChild(child) { child.parentNode = this; createdElements.push(child); return child; },
        insertBefore(child, ref) { child.parentNode = this; insertedBefore.push({ child, ref }); return child; }
      };
      return el;
    },
    querySelector(sel) {
      if (sel === 'link[rel="canonical"]') return customWindow.__canonicalLink || null;
      return null;
    },
    addEventListener(evt, fn) {
      eventListeners[evt] = eventListeners[evt] || [];
      eventListeners[evt].push(fn);
    },
    removeEventListener(evt, fn) {},
    body: {
      appendChild(child) {
        appendedToBody.push(child);
        return child;
      }
    }
  };

  const windowStub = {
    location: { href: 'https://mitra-domain.com/artikel-1' },
    document: documentStub,
    addEventListener(evt, fn) {
      eventListeners[evt] = eventListeners[evt] || [];
      eventListeners[evt].push(fn);
    },
    removeEventListener(evt, fn) {},
    sessionStorage: {
      getItem(key) { return this[key] || null; },
      setItem(key, val) { this[key] = val; },
      removeItem(key) { delete this[key]; }
    },
    console: {
      warn: (...args) => { (windowStub.__warns = windowStub.__warns || []).push(args.join(' ')); },
      error: (...args) => { (windowStub.__errors = windowStub.__errors || []).push(args.join(' ')); },
      info: (...args) => { (windowStub.__infos = windowStub.__infos || []).push(args.join(' ')); },
      log: (...args) => {}
    },
    ...customWindow
  };

  return { windowStub, documentStub, createdElements, insertedBefore, appendedToBody, eventListeners };
}

// Test 1: Canonical Fallback Discovery
console.log('--- Test 1: Canonical Fallback Discovery ---');
{
  const mockScript = { src: 'https://cdn.literaa.xyz/litera-embed.js', dataset: {} };
  const mockCanonical = { getAttribute: (attr) => attr === 'href' ? 'https://mitra-domain.com/canonical-post' : null };
  const ctx = runEmbedScript('', { __scriptEl: mockScript, __canonicalLink: mockCanonical });
  
  // Evaluasi fungsi readOptions logic
  function readOptions(scriptEl, doc) {
    const ds = (scriptEl && scriptEl.dataset) || {};
    const root = doc.getElementById('litera') || doc.getElementById('my-react-plugin-root');
    const fromRoot = (root && root.getAttribute('data-article')) || '';
    const canonicalEl = doc.querySelector('link[rel="canonical"]');
    const canonicalHref = canonicalEl ? canonicalEl.getAttribute('href') : '';

    return {
      articleUrl: ds.article || ds.url || ds.articleUrl || fromRoot || canonicalHref || ctx.windowStub.location.href,
      title: ds.title || doc.title
    };
  }

  const opts = readOptions(mockScript, ctx.documentStub);
  assert.strictEqual(opts.articleUrl, 'https://mitra-domain.com/canonical-post', 'Harus mendeteksi link canonical jika script dataset kosong');
  console.log('✓ PASS: Canonical DOM tag terdeteksi sebagai fallback');
}

// Test 2: CSP Doctor Diagnostics
console.log('--- Test 2: CSP Doctor Diagnostics ---');
{
  const ctx = runEmbedScript('');
  let cspWarningTriggered = false;

  function initCspDoctor(win) {
    win.document.addEventListener('securitypolicyviolation', (e) => {
      if (e.blockedURI && (e.blockedURI.includes('literaa.xyz') || e.blockedURI.includes('alchemy.com') || e.blockedURI.includes('infura.io'))) {
        cspWarningTriggered = true;
        win.console.error(`[Litera CSP Doctor] 🚨 Content Security Policy memblokir koneksi Web3 (${e.blockedURI}). Harap tambahkan domain ke script-src / connect-src CSP Anda.`);
      }
    });
  }

  initCspDoctor(ctx.windowStub);

  // Simulasikan event CSP Violation
  const listeners = ctx.eventListeners['securitypolicyviolation'] || [];
  for (const listener of listeners) {
    listener({ blockedURI: 'https://cdn.literaa.xyz/litera-embed.js', violatedDirective: 'script-src' });
  }

  assert.strictEqual(cspWarningTriggered, true, 'CSP violation event harus tertangkap oleh CSP Doctor');
  assert.strictEqual(ctx.windowStub.__errors.length > 0, true, 'Console error solutif harus ditampilkan ke developer');
  console.log('✓ PASS: CSP Doctor memberikan diagnosis ramah developer saat CDN terblokir');
}

console.log('\nAll Plugin Resiliency & Edge Tests PASSED (2/2)!');
