export const settingsPresets = {
  multicolor: {
    title: 'Multicolor',
    file: 'gcodes/3DBenchy-Multi-part.gcode',
    lineWidth: 1, // no
    singleLayerMode: true, // no, no a constructor option
    renderExtrusion: true, // yes
    renderTubes: true, //yes
    extrusionColor: ['#CF439D', 'rgb(84,74,187)', 'white', 'rgb(83,209,104)'],
    renderTravel: false, // yes
    travelColor: 'red', // yes
    topLayerColor: undefined, //yes
    lastSegmentColor: undefined, //yes
    buildVolume: {
      x: 180,
      y: 180,
      z: 100
    } //yes
  },
  mach3: {
    title: 'CNC tool path',
    file: 'gcodes/mach3.gcode',
    lineWidth: 1,
    singleLayerMode: false,
    renderExtrusion: false,
    renderTubes: false,
    extrusionColor: [],
    renderTravel: true,
    travelColor: '#00FF00',
    topLayerColor: undefined,
    lastSegmentColor: undefined,
    buildVolume: {
      x: 20,
      y: 20,
      z: ''
    }
  },
  arcs: {
    title: 'Arcs with G2/G3',
    file: 'gcodes/screw.gcode',
    lineWidth: 2,
    singleLayerMode: true,
    renderExtrusion: true,
    renderTubes: true,
    extrusionColor: ['rgb(83,209,104)'],
    renderTravel: false,
    travelColor: '#00FF00',
    topLayerColor: undefined,
    lastSegmentColor: undefined,
    buildVolume: {
      x: 150,
      y: 150,
      z: 150
    }
  },
  'vase-mode': {
    title: 'Vase mode',
    file: 'gcodes/vase.gcode',
    lineWidth: 1,
    singleLayerMode: true,
    renderExtrusion: true,
    renderTubes: true,
    extrusionColor: ['rgb(84,74,187)'],
    renderTravel: false,
    travelColor: '#00FF00',
    topLayerColor: '#40BFBF',
    lastSegmentColor: '#ffffff',
    buildVolume: {
      x: 200,
      y: 200,
      z: 180
    }
  },
  'travel-moves': {
    title: 'Travel moves',
    file: 'gcodes/plant-sign.gcode',
    lineWidth: 2,
    singleLayerMode: false,
    renderExtrusion: true,
    renderTubes: true,
    extrusionColor: ['#777777'],
    renderTravel: true,
    travelColor: '#00FF00',
    topLayerColor: '#aaaaaa',
    lastSegmentColor: undefined,
    buildVolume: {
      x: 200,
      y: 200,
      z: 180
    }
  }
};
