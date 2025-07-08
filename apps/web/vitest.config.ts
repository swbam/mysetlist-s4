
const base = require('@repo/testing');
const { mergeConfig } = require('vite');
const path = require('node:path');

module.exports = mergeConfig(base, {
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      '~': path.resolve(__dirname, './'),
    },
  },
}); 