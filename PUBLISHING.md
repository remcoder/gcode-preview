# publish version checklist

 - update changelog

 - run 'version:minor', which will do the following: 
    - this updates the version
    - commits that
    - publishes to npm
    - and deploys to firebase

 - test https://gcode-preview.web.app/
 - push develop to github
 - checkout master
 - merge tag & push
 - switch to develop
 - create a release in Github based on the tag