# GCode Preview
A simple GCode parser & viewer with 3D printing in mind. Written in Typescript. 

See a [demo](https://gcode-preview.web.app/) here

## WebGL 3D + pan/zoom/rotate controls
<img src="https://user-images.githubusercontent.com/461650/69015936-812bd080-0999-11ea-94fc-67c63bf128af.png" width=400 />

## Canvas 2.5D (static perspective)
<img src="https://user-images.githubusercontent.com/461650/67150833-f9c93f80-f2bc-11e9-9887-3c721cf7bfa5.png" width=400 />

## Installation

 `npm install gcode-preview`

or

`yarn add gcode-preview`

### Vue.js example
See [here](https://github.com/remcoder/gcode-preview-vue-demo) for an example with Vue.js

### Quick start

html:
```
  <div id="gcode-preview">
```

javascript:
```  
  const preview = new WebGLPreview({
      targetId: 'gcode-preview',
  });
  
  preview.processGCode(this.gcode);
  preview.render();
```

## Known issues
### Preview doesn't render in Brave
This is caused by the device recognition shield in Brave. By changing the setting for "Device Recognition" in Shield settings to "Allow all device recognition attemps" or "Only block cross-site device recognition attemps" you should not get this error.
https://github.com/mrdoob/three.js/issues/16904

## Sponsors

A big thanks to these sponsors for their contributions. 

[<img width=42 src="http://logo.q42.com/q42-logo.svg" /> Q42 ](http://q42.com)

[<img width=42 src="https://www.duet3d.com/image/catalog/logo/50_blue_wifi.png"> Duet3D](https://www.duet3d.com/)
