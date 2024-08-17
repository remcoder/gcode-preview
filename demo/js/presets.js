export const settingsPresets = {
  multicolor: {
    title: 'Multicolor',
    file: 'gcodes/3DBenchy-Multi-part.gcode',
    lineWidth: 1,
    renderExtrusion: true,
    renderTubes: true,
    extrusionColor: ['#CF439D', 'rgb(84,74,187)', 'white', 'rgb(83,209,104)'],
    renderTravel: false,
    travelColor: 'red',
    topLayerColor: undefined,
    lastSegmentColor: undefined,
    buildVolume: {
      x: 180,
      y: 180,
      z: 100
    }
  },
  mach3: {
    title: 'CNC tool path',
    file: 'gcodes/mach3.gcode',
    lineWidth: 1,
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
