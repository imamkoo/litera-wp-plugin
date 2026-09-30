const assert = require('assert');

function makeFakeDom({ existingRoot = null, scripts = [], canonicalHref = null, readyState = 'complete' }) {
  const created = [];
  const insertedBefore = [];
  const eventListeners = {};

  const documentStub = {
    readyState,
    title: 'Default Title',
    getElementById(id) {
      if (existingRoot && existingRoot.id === id) return existingRoot;
      return created.find((c) => c.id === id) || null;
    },
    getElementsByTagName(tag) {
      if (tag === 'script') return scripts.length ? scripts : [scriptEl];
      return [];
    },
    createElement(tag) {
      const el = {
        tagName: tag.toUpperCase(),
        id: '',
        src: '',
        async: false,
        dataset: {},
        getAttribute(attr) { return this[attr] || ''; },
        parentNode: null,
        appendChild(child) { created.push(child); child.parentNode = this; },
        insertBefore(child, ref) { created.push(child); insertedBefore.push({ child, ref }); child.parentNode = this; },
        innerHTML: '',
      };
      created.push(el);
      return el;
    },
    querySelector(sel) {
      if (sel === 'link[rel="canonical"]') {
        return canonicalHref ? { getAttribute: (attr) => attr === 'href' ? canonicalHref : null } : null;
      }
      return null;
    },
    addEventListener(evt, fn) {
      eventListeners[evt] = eventListeners[evt] || [];
      eventListeners[evt].push(fn);
    },
    removeEventListener(evt, fn) {},
    body: {
      appendChild(child) { created.push(child); child.parentNode = this; },
    },
  };

  const scriptEl = {
    tagName: 'SCRIPT',
    src: 'https://cdn.literaa.xyz/litera-embed.js',
    dataset: {},
    getAttribute(attr) { return this[attr] || ''; },
    parentNode: {
      insertBefore(child, ref) { insertedBefore.push({ child, ref }); child.parentNode = this; },
    },
  };

  return { documentStub, created, insertedBefore, scriptEl, eventListeners };
}

const ROOT_ID = 'litera';

function runEmbed(dom) {
  const windowStub = {
    document: dom.documentStub,
    location: { href: 'https://example.com/current-url' },
    addEventListener(evt, fn) {
      dom.eventListeners[evt] = dom.eventListeners[evt] || [];
      dom.eventListeners[evt].push(fn);
    },
    removeEventListener() {},
    sessionStorage: {
      getItem() { return null; },
      setItem() {},
      removeItem() {},
    },
    fetch() {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ version: '1.0.0', file: 'bundle.abc.js' }),
      });
    },
    setTimeout(fn) { return 1; },
    clearTimeout() {},
  };

  global.window = windowStub;
  global.document = dom.documentStub;

  const fs = require('fs');
  const path = require('path');
  const code = fs.readFileSync(path.join(__dirname, '../public/litera-embed.js'), 'utf8');
  eval(code);

  return windowStub;
}

function test1_makes_container_and_data() {
  const dom = makeFakeDom({});
  const w = runEmbed(dom);
  assert.strictEqual(w.myReactPluginData.permalink, 'https://example.com/current-url');
  assert.strictEqual(w.myReactPluginData.title, 'Default Title');
  const made = dom.created.filter((c) => c.id === ROOT_ID);
  assert.strictEqual(made.length, 1);
  pass++;
}

function test2_uses_existing_root_no_duplicate() {
  const existing = { id: ROOT_ID, getAttribute() { return ''; } };
  const dom = makeFakeDom({ existingRoot: existing });
  runEmbed(dom);
  const made = dom.created.filter((c) => c.id === ROOT_ID);
  assert.strictEqual(made.length, 0);
  pass++;
}

function test3_data_attrs_override_fallback() {
  const dom = makeFakeDom({});
  dom.scriptEl.dataset.article = 'https://mitra.com/artikel?utm=x#komentar';
  dom.scriptEl.dataset.title = 'Judul Mitra';
  const w = runEmbed(dom);
  assert.strictEqual(w.myReactPluginData.permalink, 'https://mitra.com/artikel?utm=x#komentar');
  assert.strictEqual(w.myReactPluginData.title, 'Judul Mitra');
  pass++;
}

function test4_backward_compatibility() {
  const dom = makeFakeDom({ existingRoot: { id: 'my-react-plugin-root', getAttribute() { return ''; } } });
  dom.scriptEl.dataset.articleUrl = 'https://mitra-legacy.com/artikel';
  const w = runEmbed(dom);
  assert.strictEqual(w.myReactPluginData.permalink, 'https://mitra-legacy.com/artikel');
  pass++;
}

function test5_canonical_dom_fallback() {
  const dom = makeFakeDom({ canonicalHref: 'https://mitra.com/canonical-article-slug' });
  const w = runEmbed(dom);
  assert.strictEqual(w.myReactPluginData.permalink, 'https://mitra.com/canonical-article-slug');
  pass++;
}

function test6_guard_blocks_double_boot() {
  const dom = makeFakeDom({});
  const w = runEmbed(dom);
  const dataBefore = w.myReactPluginData;
  dom.scriptEl.dataset.article = 'https://mitra.com/kedua';
  runEmbed(dom);
  assert.strictEqual(w.myReactPluginData, dataBefore);
  pass++;
}

let pass = 0;
for (const t of [
  test1_makes_container_and_data,
  test2_uses_existing_root_no_duplicate,
  test3_data_attrs_override_fallback,
  test4_backward_compatibility,
  test5_canonical_dom_fallback,
  test6_guard_blocks_double_boot,
]) {
  try {
    pass = pass;
    t();
    console.log(`PASS ${t.name}`);
  } catch (err) {
    console.error(`FAIL ${t.name}:`, err.message);
    process.exitCode = 1;
  }
}
console.log(`${pass}/6 tests passed`);
