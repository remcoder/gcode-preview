/* eslint-env node */
module.exports = {
  extends: [
    'eslint:recommended',
  ],
  ignorePatterns: [
    "js/three.min.js", 
    "js/gcode-preview.js",
    "js/canvas2image.js",
  ],
  env: {
    "browser": true
  }
};