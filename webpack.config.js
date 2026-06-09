const defaultConfig = require('@wordpress/scripts/config/webpack.config');
const { merge } = require('webpack-merge');
const path = require('path');

module.exports = merge(defaultConfig, {
  resolve: {
    alias: {
      // handle semua kemungkinan import path
      '@react-native-async-storage/async-storage':
        path.resolve(__dirname, './src/shims/asyncStorage.js'),
      '@react-native-async-storage/async-storage/lib/module':
        path.resolve(__dirname, './src/shims/asyncStorage.js'),
    },
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
  },
});