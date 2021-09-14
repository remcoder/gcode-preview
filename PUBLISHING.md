# publish version checklist

 - update changelog

 - run 'version:minor', which will do the following: 
    - this updates the version
    - commits that
    - publishes to npm
    - and deploys to firebase

 
 - push develop to github
 - checkout master
 - merge tag
 - switch to develop
