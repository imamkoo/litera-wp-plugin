const rewire = require('rewire');
const defaults = rewire('react-scripts/scripts/build');
const config = defaults.__get__('config');

// 1. Matikan CSS Extraction (agar CSS masuk ke JS)
config.plugins = config.plugins.filter(
  (plugin) => plugin.constructor.name !== 'MiniCssExtractPlugin' && plugin.constructor.name !== 'ForkTsCheckerWebpackPlugin'
);

// 2. Ubah rule CSS agar menggunakan style-loader alih-alih file terpisah
config.module.rules.forEach((rule) => {
  if (rule.oneOf) {
    rule.oneOf.forEach((loader) => {
      if (loader.test && loader.test.toString().includes('css')) {
        loader.use = loader.use.map((u) => {
          if (typeof u === 'string' && u.includes('mini-css-extract-plugin')) {
            return require.resolve('style-loader');
          }
          if (u.loader && u.loader.includes('mini-css-extract-plugin')) {
            return { loader: require.resolve('style-loader') };
          }
          return u;
        });
      }
    });
  }
});

// 3. SplitChunks: izinkan chunk async (dynamic import) terpisah dari bundle
// utama. Sebelumnya semua dipaksa jadi 1 file (maxChunks: 1) yang membuat
// Reown AppKit (~5MB: x402, fiat-onramp, wallet UI) masuk ke bundle utama
// padahal hanya dibutuhkan saat user klik connect wallet.
// chunks: 'async' hanya memisahkan dynamic import; entry tetap 1 file.
config.optimization.splitChunks = {
  chunks: 'async',
  minSize: 20000,
  cacheGroups: { defaultVendors: false, default: false },
};
config.optimization.runtimeChunk = false;

// Bundle utama tetap 1 file bernama bundle.js (dibutuhkan litera.php).
// Catatan: JANGAN pakai LimitChunkCountPlugin({maxChunks:1}) — plugin itu
// memaksa SEMUA chunk (termasuk async) menyatu, membatalkan lazy-load
// Web3Modal. chunks:'async' di splitChunks sudah menjamin entry tetap 1
// file sementara dynamic import terpisah sebagai [name].chunk.js.

// 4. Output harus konsisten namanya di root directory agar sesuai dengan litera.php
// Chunk async dapat hash konten (cache-busting CDN yang benar).
config.output.filename = 'bundle.js';
config.output.chunkFilename = '[name].[contenthash:8].chunk.js';