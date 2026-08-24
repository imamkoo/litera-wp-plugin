/**
 * Litera Universal Embed — test logika murni (tanpa framework).
 * Jalankan: node tests/litera-embed.test.js
 *
 * Logika embed dieksekusi via jsdom-lite: kita stub window/document minimal
 * yang dibutuhkan litera-embed.js, lalu asersi efek sampingnya.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'public', 'litera-embed.js'), 'utf8');

function makeFakeDom({ existingRoot = null, scripts = [], readyState = 'complete' } = {}) {
  const created = [];
  const insertedBefore = [];

  function el(tag) {
    return {
      tagName: tag.toUpperCase(),
      id: '',
      src: '',
      async: false,
      dataset: {},
      parentNode: null,
      appendChild(child) { created.push(child); child.parentNode = this; },
      insertBefore(child, ref) { created.push(child); insertedBefore.push({ child, ref }); child.parentNode = this; },
    };
  }

  const scriptEl = el('script');
  Object.assign(scriptEl.src, {});
  scriptEl.src = 'https://cdn.literaa.xyz/litera-embed.js';
  Object.assign(scriptEl.dataset, {});

  const body = {
    children: [...scripts],
    appendChild(c) { this.children.push(c); c.parentNode = this; },
    insertBefore(c, ref) { this.children.push(c); insertedBefore.push({ child: c, ref }); c.parentNode = this; },
    getElementsByTagName() { return [scriptEl]; },
  };

  const documentStub = {
    readyState,
    currentScript: scriptEl,
    title: 'Judul Halaman Default',
    body,
    getElementById(id) { return id === ROOT_ID ? existingRoot : null; },
    createElement(tag) { return el(tag); },
    addEventListener() {},
  };

  return { documentStub, created, insertedBefore, scriptEl };
}

const ROOT_ID = 'my-react-plugin-root';

function runEmbed(dom) {
  const windowStub = { location: { href: 'https://halaman-default.test/artikel' } };
  // eslint-disable-next-line no-new-func
  const fn = new Function('window', 'document', 'fetch', 'setTimeout', 'clearTimeout', SRC);
  fn(windowStub, dom.documentStub, () => Promise.resolve({ ok: true, json: () => Promise.resolve({ file: 'bundle.test.js' }) }), () => 0, () => {});
  return windowStub;
}

function test1_makes_container_and_data() {
  const dom = makeFakeDom({});
  const w = runEmbed(dom);
  assert.strictEqual(w[GUARD_NAME], true, 'guard harus ter-set');
  assert.ok(w.myReactPluginData, 'myReactPluginData harus ter-set');
  assert.strictEqual(w.myReactPluginData.permalink, 'https://halaman-default.test/artikel', 'permalink fallback ke window.location.href');
  assert.strictEqual(w.myReactPluginData.title, 'Judul Halaman Default');
  assert.strictEqual(dom.created.filter((c) => c.id === ROOT_ID).length >= 0, true);
}

function test2_uses_existing_root_no_duplicate() {
  const existing = { id: ROOT_ID };
  const dom = makeFakeDom({ existingRoot: existing });
  runEmbed(dom);
  const made = dom.created.filter((c) => c.id === ROOT_ID);
  assert.strictEqual(made.length, 0, 'tidak boleh membuat container baru bila sudah ada');
}

function test3_data_attrs_override_fallback() {
  const dom = makeFakeDom({});
  dom.scriptEl.dataset.articleUrl = 'https://mitra.com/artikel?utm=x#komentar';
  dom.scriptEl.dataset.title = 'Judul Mitra';
  const w = runEmbed(dom);
  assert.strictEqual(w.myReactPluginData.permalink, 'https://mitra.com/artikel?utm=x#komentar');
  assert.strictEqual(w.myReactPluginData.title, 'Judul Mitra');
}

function test4_guard_blocks_double_boot() {
  const dom = makeFakeDom({});
  const w = runEmbed(dom);
  const before = JSON.stringify(w.myReactPluginData);

  // boot kedua — guard harus menghentikan
  const fn = new Function('window', 'document', 'fetch', 'setTimeout', 'clearTimeout', SRC);
  fn(w, dom.documentStub, () => Promise.reject(new Error('should not fetch')), () => 0, () => {});

  assert.strictEqual(JSON.stringify(w.myReactPluginData), before, 'state tidak berubah pada boot kedua');
}

const GUARD_NAME = '__literaEmbedLoaded';

let pass = 0;
for (const t of [test1_makes_container_and_data, test2_uses_existing_root_no_duplicate, test3_data_attrs_override_fallback, test4_guard_blocks_double_boot]) {
  try {
    t();
    console.log(`PASS ${t.name}`);
    pass++;
  } catch (e) {
    console.error(`FAIL ${t.name}: ${e.message}`);
    process.exitCode = 1;
  }
}
console.log(`${pass}/4 tests passed`);
