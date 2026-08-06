const webpack = require('webpack');
const path = require('path');

module.exports = function override(config) {
  config.resolve.alias = {
    ...(config.resolve.alias || {}),
    '@react-native-async-storage/async-storage': path.resolve(
      __dirname,
      'src/shims/asyncStorage.js'
    ),
  };

  config.module.rules.push({
    test: /\.m?js/,
    resolve: {
      fullySpecified: false
    }
  });

  config.plugins.push(
    new webpack.NormalModuleReplacementPlugin(
      /@phosphor-icons\/webcomponents/,
      (resource) => {
        resource.request = path.resolve(__dirname, 'src/shims/icon-mock.mjs');
      }
    )
  );

  return config;
};