/* eslint-env node */
module.exports = {
  extends: [
    'eslint:recommended',
  ],
  ignorePatterns: [
    "three.min.js", 
    "OrbitControls.js",
    "canvas2image.js",
    "dist/**/*.js"
  ],
  env: {
    "browser": true
  }
};