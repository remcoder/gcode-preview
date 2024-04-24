# publish version checklist

## prepare release
 - update CHANGELOG
 - update version (npm run 'version:minor')
 - push develop
   - TODO: this should deploy the demo automatically
   - TODO: build & deploy other exmples
   - test https://gcode-preview.web.app/

## publish
 - merge into 'releases' and push
   - this auto publishes to npmjs

 - create a release in Github based on the tag
