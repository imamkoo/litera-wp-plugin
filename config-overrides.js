const path = require('path');

module.exports = function override(config) {
  config.resolve.alias = {
    ...(config.resolve.alias || {}),
    '@react-native-async-storage/async-storage': path.resolve(
      __dirname,
      'src/shims/asyncStorage.js'
    ),
  };

  return config;
};