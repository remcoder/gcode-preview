/* eslint-env node */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: [
    '@typescript-eslint',
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  ignorePatterns: ["dist"],
  env: {
    "browser": true
  },
  rules: {
    // Override our default settings just for this directory
    "eqeqeq": "warn"
  }
};