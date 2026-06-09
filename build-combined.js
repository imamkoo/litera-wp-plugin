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

// 3. Matikan SplitChunks (Agar jadi 1 file bundle.js)
config.optimization.splitChunks = {
  cacheGroups: {
    default: false,
  },
};
config.optimization.runtimeChunk = false;

const webpack = require('webpack');
config.plugins.push(new webpack.optimize.LimitChunkCountPlugin({
  maxChunks: 1,
}));

// 4. Output harus konsisten namanya di root directory agar sesuai dengan litera.php
config.output.filename = '../bundle.js';
config.output.chunkFilename = '../[name].chunk.js';