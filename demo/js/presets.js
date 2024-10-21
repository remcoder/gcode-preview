export const presets = {
  multicolor: {
    title: 'multicolor benchy',
    file: 'gcodes/3DBenchy-Multi-part.gcode',
    extrusionColor: ['#CF439D', 'rgb(84,74,187)', 'white', 'rgb(83,209,104)'],
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
    renderTravel: true,
    travelColor: '#00FF00',
    buildVolume: {
      x: 10,
      y: 10,
      z: ''
    },
    initialCameraPosition: [-20, 20, 1.8]
  },
  arcs: {
    title: 'Arcs with G2/G3',
    file: 'gcodes/screw.gcode',
    extrusionWidth: 0.5,
    extrusionColor: ['rgb(83,209,104)'],
    travelColor: 'red',
    topLayerColor: undefined,
    lastSegmentColor: undefined,
    buildVolume: {
      x: 130,
      y: 150,
      z: 0
    }
  },
  'vase-mode': {
    title: 'Vase mode',
    file: 'gcodes/vase.gcode',
    lineWidth: 0,
    lineHeight: 0.4,
    renderExtrusion: true,
    renderTubes: true,
    extrusionColor: ['rgb(84,74,187)'],
    renderTravel: true,
    travelColor: '#00FF00',
    topLayerColor: undefined,
    lastSegmentColor: undefined,
    buildVolume: {
      x: 200,
      y: 200,
      z: 180
    },
    initialCameraPosition: [-404, 320, 184]
  },
  'travel-moves': {
    title: 'Travel moves',
    file: 'gcodes/plant-sign.gcode',
    lineWidth: 0,
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
      z: 150
    }
  }
};
