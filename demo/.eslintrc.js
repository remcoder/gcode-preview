/* eslint-env node */
module.exports = {
  extends: ['eslint:recommended'],
  ignorePatterns: ['js/three.min.js', 'js/gcode-preview.js'],
  env: {
    browser: true
  }
};
