# GCode Preview [![npm version](http://img.shields.io/npm/v/gcode-preview.svg?style=flat)](https://npmjs.org/package/gcode-preview "View this project on npm") [![MIT license](http://img.shields.io/badge/license-MIT-brightgreen.svg)](http://opensource.org/licenses/MIT)
A simple [G-code](https://en.wikipedia.org/wiki/G-code) parser & viewer with 3D printing in mind. Written in Typescript. 

## 3D WebGL + pan/zoom/rotate controls
![Demo Animation](../assets/benchy.gif?raw=true)

## New in v2.2.0: build volume
The build volume will be rendered if the `buildVolume` parameter is passed. It has the following type: 
```
buildVolume: { 
  x: number; 
  y: number; 
  z: number
}
```

example:

<img src='https://user-images.githubusercontent.com/461650/103179898-c014a100-4890-11eb-8a25-13415c26f0f4.png' width=200>

## Demo
Go try the [interactive demo](https://gcode-preview.web.app/).


## Installation
[![npm version](http://img.shields.io/npm/v/gcode-preview.svg?style=flat)](https://npmjs.org/package/gcode-preview "View this project on npm") 

 `npm install gcode-preview`

or

`yarn add gcode-preview`


### Quick start

#### Html
```
  <div id="gcode-preview">
```

#### Javascript
```  
  const gcode = 'G0 X0 Y0 Z0.2\nG1 X42 Y42'; // draw a diagonal line
  const preview = new WebGLPreview({
      targetId: 'gcode-preview',
  });
  
  preview.processGCode(gcode);
  preview.render();
```

### Vue.js integration
There's a [Vue.js example](https://github.com/remcoder/gcode-preview/tree/develop/vue-demo) that has a [Vue component](https://github.com/remcoder/gcode-preview/blob/develop/vue-demo/src/components/GCodePreview.vue) to wrap the library.

## Known issues
### Preview doesn't render in Brave
This is caused by the device recognition shield in Brave. By changing the setting for "Device Recognition" in Shield settings to "Allow all device recognition attemps" or "Only block cross-site device recognition attemps" you should not get this error.
https://github.com/mrdoob/three.js/issues/16904

## Notice: deprecation of Canvas2D
In favor of WebGL, I'm deprecating the Canvas 2Drendering. My reasons for this are: 
 - WebGL (via THREE.js) gives me more options, like rotating the model
 - WebGL renders faster
 - I don't want to maintain 2 rendering methods due to time constraints

This means that as of version 2.1.0 only WebGL will be supported. I you really want to use Canvas 2D, stay at the 2.0.x version branch and/or consider forking.

## Sponsors

A big thanks to these sponsors for their contributions. 

[<img width=42 src="http://logo.q42.com/q42-logo.svg" /> Q42 ](http://q42.com)

[<img width=42 src="https://www.duet3d.com/image/catalog/logo/50_blue_wifi.png"> Duet3D](https://www.duet3d.com/)

## Contributing
If you want to help out, consider any of the following:
 - test the GCode Preview with a variety of gcode files, from different slicers
 - report any bugs you find and add as much detail as possible, or even better, a screenshot
 - even better yet: send in a pull request :-)
 - apart from the the code code, lots of improvements can still be made in:
  - documentation
  - unit tests
  - demos, especially in combination with frameworks like React, Svelte etc

If you want to show gratitude you can always buy me beer/coffee/filament 
[via a Paypal donation](https://www.paypal.com/paypalme/my/profile ) ^_^

## Changelog
Jump to the [CHANGELOG](CHANGELOG.md)
