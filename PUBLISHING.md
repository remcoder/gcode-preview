# publish version checklist

## prepare release
 - update version (npm run 'version:minor')
  - this updates the version in package.js
  - this creates a version tag
 - push develop
   - this should deploy the demo automatically
   - TODO: build & deploy other examples
   - test https://gcode-preview.web.app/

## publish
 - merge into 'releases' and push (still needed?)
 - create a release in Github based on the tag
  - this auto publishes to npmjs
