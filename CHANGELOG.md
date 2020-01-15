## next

## alpha 2.1.0-alpha.2
- don't reset the layer limit after parsing the gcode
- highlight the top layer and the last segment
- top layer / last segment color is configurable
- clear() method added to reset parser state

## alpha 2.1.0-alpha.0
- add incremental parsing
- bugfix: only create a new layer when extruding
- allow input to be either a string or an array of strings
- remove 2.5d canvas version
- demo: shows how to use incremental parsing to render a file progressively

## 2.0
- updated demo page
- toggle rendering of travel 
- toggle rendering of extrusion
- WebGL rendering with pan/zoom/rotate controls
- added `lineWidth` option (canvas 2.5D only)
- fully typed

## 1.0.0
- ported to typescript
- added distributable library build in dist folder
- some minor fixes
