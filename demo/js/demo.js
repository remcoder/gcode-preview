import * as GCodePreview from 'gcode-preview';
import * as THREE from 'three';
import * as Canvas2Image from 'canvas2image';

let gcodePreview;
let favIcon;
let thumb;
const maxToolCount = 8;
let toolCount = 4;
let gcode;
let renderProgressive = false;

const canvasElement = document.querySelector('.gcode-previewer');
const settingsPreset = document.getElementById('settings-presets');
const startLayer = document.getElementById('start-layer');
const startLayerValue = document.getElementById('start-layer-value');
const endLayer = document.getElementById('end-layer');
const endLayerValue = document.getElementById('end-layer-value');
const lineWidth = document.getElementById('line-width');
const lineWidthValue = document.getElementById('line-width-value');
const extrusionWidth = document.getElementById('extrusion-width');
const extrusionWidthValue = document.getElementById('extrusion-width-value');
const toggleSingleLayerMode = document.getElementById('single-layer-mode');
const toggleExtrusion = document.getElementById('extrusion');
const toggleRenderTubes = document.getElementById('render-tubes');
const extrusionColor = {};
for (let i = 0; i < maxToolCount; i++) {
  extrusionColor[i] = document.getElementById(`extrusion-color-t${i}`);
}
const addColorButton = document.getElementById('add-color');
const removeColorButton = document.getElementById('remove-color');

const backgroundColor = document.getElementById('background-color');
const toggleTravel = document.getElementById('travel');
const toggleHighlight = document.getElementById('highlight');
const topLayerColorInput = document.getElementById('top-layer-color');
const lastSegmentColorInput = document.getElementById('last-segment-color');
// const layerCount = document.getElementById('layer-count');
const fileName = document.getElementById('file-name');
const fileSelector = document.getElementById('file-selector');
const fileSize = document.getElementById('file-size');
const snapshot = document.getElementById('snapshot');
const buildVolumeX = document.getElementById('buildVolumeX');
const buildVolumeY = document.getElementById('buildVolumeY');
const buildVolumeZ = document.getElementById('buildVolumeZ');
const drawBuildVolume = document.getElementById('drawBuildVolume');
const travelColor = document.getElementById('travel-color');
const preferDarkMode = window.matchMedia('(prefers-color-scheme: dark)');

const defaultPreset = 'multicolor';

const settingsPresets = {
  multicolor: {
    file: 'gcodes/3DBenchy-Multi-part.gcode',
    lineWidth: 1,
    singleLayerMode: false,
    renderExtrusion: true,
    renderTubes: true,
    extrusionColors: ['#CF439D', 'rgb(84,74,187)', 'white', 'rgb(83,209,104)'],
    travel: false,
    travelColor: '#00FF00',
    highlightTopLayer: false,
    topLayerColor: undefined,
    lastSegmentColor: undefined,
    drawBuildVolume: true,
    buildVolume: {
      x: 180,
      y: 180,
      z: 200
    }
  },
  mach3: {
    file: 'gcodes/mach3.gcode',
    lineWidth: 1,
    singleLayerMode: false,
    renderExtrusion: false,
    renderTubes: false,
    extrusionColors: [],
    travel: true,
    travelColor: '#00FF00',
    highlightTopLayer: false,
    topLayerColor: undefined,
    lastSegmentColor: undefined,
    drawBuildVolume: true,
    buildVolume: {
      x: 20,
      y: 20,
      z: ''
    }
  },
  arcs: {
    file: 'gcodes/screw.gcode',
    lineWidth: 2,
    singleLayerMode: true,
    renderExtrusion: true,
    renderTubes: true,
    extrusionColors: ['rgb(83,209,104)'],
    travel: false,
    travelColor: '#00FF00',
    highlightTopLayer: false,
    topLayerColor: undefined,
    lastSegmentColor: undefined,
    drawBuildVolume: true,
    buildVolume: {
      x: 200,
      y: 200,
      z: 180
    }
  },
  'vase-mode': {
    file: 'gcodes/vase.gcode',
    lineWidth: 1,
    singleLayerMode: true,
    renderExtrusion: true,
    renderTubes: true,
    extrusionColors: ['rgb(84,74,187)'],
    travel: false,
    travelColor: '#00FF00',
    highlightTopLayer: true,
    topLayerColor: '#40BFBF',
    lastSegmentColor: '#ffffff',
    drawBuildVolume: true,
    buildVolume: {
      x: 200,
      y: 200,
      z: 220
    }
  },
  'travel-moves': {
    file: 'gcodes/plant-sign.gcode',
    lineWidth: 2,
    singleLayerMode: false,
    renderExtrusion: true,
    renderTubes: true,
    extrusionColors: ['#777777'],
    travel: true,
    travelColor: '#00FF00',
    highlightTopLayer: true,
    topLayerColor: '#aaaaaa',
    lastSegmentColor: undefined,
    drawBuildVolume: true,
    buildVolume: {
      x: 200,
      y: 200,
      z: 220
    }
  }
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
export function initDemo() {
  // eslint-disable-line no-unused-vars, @typescript-eslint/no-unused-vars
  const settings = JSON.parse(localStorage.getItem('settings'));

  const initialBackgroundColor = preferDarkMode.matches ? '#111' : '#eee';

  const preview = (window.preview = new GCodePreview.init({
    canvas: canvasElement,
    buildVolume: settings?.buildVolume || { x: 190, y: 210, z: 0 },
    initialCameraPosition: [180, 150, 300],
    backgroundColor: initialBackgroundColor,
    lineHeight: 0.3,
    devMode: {
      camera: true,
      renderer: true,
      parser: true,
      buildVolume: true,
      devHelpers: true,
      statsContainer: document.querySelector('.sidebar')
    }
  }));

  backgroundColor.value = initialBackgroundColor;

  loadSettingPreset(defaultPreset);

  settingsPreset.addEventListener('change', function (e) {
    loadSettingPreset(e.target.value);
  });

  fileSelector.addEventListener('change', function (e) {
    const fileName = e.target.value;
    changeFile(fileName);
  });

  startLayer.addEventListener('input', function () {
    preview.startLayer = +startLayer.value;
    startLayerValue.innerText = startLayer.value;
    endLayer.value = preview.endLayer = Math.max(preview.startLayer, preview.endLayer);
    endLayerValue.innerText = endLayer.value;
    preview.render();
  });

  endLayer.addEventListener('input', function () {
    preview.endLayer = +endLayer.value;
    endLayerValue.innerText = endLayer.value;
    startLayer.value = preview.startLayer = Math.min(preview.startLayer, preview.endLayer);
    startLayerValue.innerText = startLayer.value;
    preview.render();
  });

  lineWidth.addEventListener('input', function () {
    changeLineWidth(lineWidth.value);
    preview.render();
  });

  extrusionWidth.addEventListener('input', function () {
    preview.extrusionWidth = +extrusionWidth.value;
    extrusionWidthValue.innerText = extrusionWidth.value;
    preview.render();
  });

  toggleSingleLayerMode.addEventListener('click', function () {
    changeSingleLayerMode(!!toggleSingleLayerMode.checked);
    preview.render();
  });

  toggleExtrusion.addEventListener('click', function () {
    changeRenderExtrusion(!!toggleExtrusion.checked);
    preview.render();
  });

  toggleRenderTubes.addEventListener('click', function () {
    changeRenderTubes(!!toggleRenderTubes.checked);
    startLoadingProgressive(gcode);
  });

  for (let i = 0; i < 8; i++) {
    extrusionColor[i].addEventListener('input', () =>
      debounce(() => {
        const colors = preview.extrusionColor;
        colors[i] = extrusionColor[i].value;
        preview.extrusionColor = colors;
        preview.render();
      })
    );
  }

  addColorButton.addEventListener('click', function () {
    if (toolCount >= maxToolCount) return;
    toolCount++;
    showExtrusionColors();
  });

  removeColorButton.addEventListener('click', function () {
    if (toolCount <= 1) return;
    toolCount--;
    showExtrusionColors();
  });

  backgroundColor.addEventListener('input', () =>
    throttle(() => {
      changeBackgroundColor(backgroundColor.value);
      preview.render();
    })
  );

  toggleTravel.addEventListener('click', function () {
    changeRenderTravel(!!toggleTravel.checked);
    preview.render();
  });

  travelColor.addEventListener('input', () =>
    throttle(() => {
      changeTravelColor(travelColor.value);
      preview.render();
    })
  );

  toggleHighlight.addEventListener('click', function () {
    changeHighlightTopLayer(!!toggleHighlight.checked);
    preview.render();
  });

  topLayerColorInput.addEventListener('input', () =>
    throttle(() => {
      changeTopLayerColor(topLayerColorInput.value);
      preview.render();
    })
  );

  lastSegmentColorInput.addEventListener('input', () =>
    throttle(() => {
      changeLastSegmentColor(lastSegmentColorInput.value);
      preview.render();
    })
  );

  canvasElement.addEventListener('dragover', (evt) => {
    evt.stopPropagation();
    evt.preventDefault();
    evt.dataTransfer.dropEffect = 'copy';
    canvasElement.classList.add('dragging');
  });

  canvasElement.addEventListener('dragleave', (evt) => {
    evt.stopPropagation();
    evt.preventDefault();
    canvasElement.classList.remove('dragging');
  });

  canvasElement.addEventListener('drop', async (evt) => {
    evt.stopPropagation();
    evt.preventDefault();
    preview.topLayerColor = undefined;
    preview.lastSegmentColor = undefined;
    canvasElement.classList.remove('dragging');
    const files = evt.dataTransfer.files;
    const file = files[0];

    fileName.innerText = file.name;
    fileSize.innerText = humanFileSize(file.size);

    // await preview._readFromStream(file.stream());
    _handleGCode(file.name, await file.text());
    updateUI();
  });

  function updateBuildVolume() {
    const x = parseInt(buildVolumeX.value, 10);
    const y = parseInt(buildVolumeY.value, 10);
    const z = parseInt(buildVolumeZ.value, 10);

    const draw = !!drawBuildVolume.checked;

    changeDrawBuildVolume(draw);
    changeBuildVolume({ x, y, z });

    preview.render();

    storeSettings();
  }

  buildVolumeX.addEventListener('input', updateBuildVolume);
  buildVolumeY.addEventListener('input', updateBuildVolume);
  buildVolumeZ.addEventListener('input', updateBuildVolume);
  drawBuildVolume.addEventListener('input', updateBuildVolume);

  // lineWidth.addEventListener('change', function() {
  //   preview.lineWidth = parseInt(lineWidth.value,10);
  //   preview.render();
  // });

  window.addEventListener('resize', function () {
    preview.resize();
  });

  snapshot.addEventListener('click', function (evt) {
    evt.stopPropagation();
    evt.preventDefault();

    Canvas2Image.saveAsJPEG(gcodePreview.canvas, innerWidth, innerHeight, fileName.innerText.replace('.gcode', '.jpg'));
  });

  function changeFile(name) {
    fileSelector.value = name;
    loadGCodeFromServer(name);
  }

  function changeLineWidth(width) {
    lineWidthValue.innerText = parseInt(width, 10);
    lineWidth.value = parseInt(width, 10);
    preview.lineWidth = parseInt(width, 10);
  }

  function changeSingleLayerMode(enabled) {
    preview.singleLayerMode = enabled;
    toggleSingleLayerMode.checked = enabled;
    if (preview.singleLayerMode) {
      startLayer.setAttribute('disabled', 'disabled');
    } else {
      startLayer.removeAttribute('disabled');
    }
  }

  function changeRenderExtrusion(enabled) {
    preview.renderExtrusion = enabled;
    toggleExtrusion.checked = enabled;
    if (enabled) {
      for (let i = 0; i < 8; i++) {
        extrusionColor[i].removeAttribute('disabled');
      }
      toggleRenderTubes.removeAttribute('disabled');
    } else {
      for (let i = 0; i < 8; i++) {
        extrusionColor[i].setAttribute('disabled', 'disabled');
      }
      toggleRenderTubes.setAttribute('disabled', 'disabled');
    }
  }

  function changeRenderTubes(enabled) {
    preview.renderTubes = enabled;
    toggleRenderTubes.checked = enabled;
  }

  function changeRenderTravel(enabled) {
    preview.renderTravel = enabled;
    toggleTravel.checked = enabled;
    if (enabled) {
      travelColor.removeAttribute('disabled');
    } else {
      travelColor.setAttribute('disabled', 'disabled');
    }
  }

  function changeHighlightTopLayer(enabled) {
    toggleHighlight.checked = enabled;
    if (enabled) {
      changeTopLayerColor(preview.topLayerColor || '#40BFBF');
      changeLastSegmentColor(preview.lastSegmentColor || '#ffffff');
      topLayerColorInput.removeAttribute('disabled');
      lastSegmentColorInput.removeAttribute('disabled');
    } else {
      preview.topLayerColor = undefined;
      preview.lastSegmentColor = undefined;
      topLayerColorInput.setAttribute('disabled', 'disabled');
      lastSegmentColorInput.setAttribute('disabled', 'disabled');
    }
  }

  function changeTravelColor(color) {
    preview.travelColor = color;
    travelColor.value = color;
  }

  function changeBackgroundColor(color) {
    preview.backgroundColor = color;
    backgroundColor.value = color;
  }

  function changeTopLayerColor(color) {
    topLayerColorInput.value = color;
    preview.topLayerColor = color;
  }

  function changeLastSegmentColor(color) {
    lastSegmentColorInput.value = color;
    preview.lastSegmentColor = color;
  }

  function changeBuildVolume(volume) {
    buildVolumeX.value = volume.x;
    buildVolumeY.value = volume.y;
    buildVolumeZ.value = volume.z;
    preview.buildVolume.x = volume.x;
    preview.buildVolume.y = volume.y;
    preview.buildVolume.z = volume.z;
  }

  function changeDrawBuildVolume(draw) {
    drawBuildVolume.checked = draw;
    if (draw) {
      buildVolumeX.removeAttribute('disabled');
      buildVolumeY.removeAttribute('disabled');
      buildVolumeZ.removeAttribute('disabled');
    } else {
      buildVolumeX.setAttribute('disabled', 'disabled');
      buildVolumeY.setAttribute('disabled', 'disabled');
      buildVolumeZ.setAttribute('disabled', 'disabled');
    }
  }

  function changeToolColors(colors) {
    toolCount = colors.length;
    for (let i = 0; i < toolCount; i++) extrusionColor[i].value = '#' + new THREE.Color(colors[i]).getHexString();
    preview.extrusionColor = colors;
    showExtrusionColors();
  }

  function loadSettingPreset(name) {
    const preset = settingsPresets[name];
    changeLineWidth(preset.lineWidth);
    changeSingleLayerMode(preset.singleLayerMode);
    changeRenderExtrusion(preset.renderExtrusion);
    changeRenderTubes(preset.renderTubes);
    changeRenderTravel(preset.travel);
    changeHighlightTopLayer(preset.highlightTopLayer);
    changeTravelColor(preset.travelColor);
    changeTopLayerColor(preset.topLayerColor);
    changeLastSegmentColor(preset.lastSegmentColor);
    changeDrawBuildVolume(preset.drawBuildVolume);
    changeBuildVolume(preset.buildVolume);
    changeToolColors(preset.extrusionColors);
    changeFile(preset.file);
  }

  gcodePreview = preview;

  updateUI();

  return preview;
}

function storeSettings() {
  localStorage.setItem(
    'settings',
    JSON.stringify({
      buildVolume: {
        x: gcodePreview.buildVolume.x,
        y: gcodePreview.buildVolume.y,
        z: gcodePreview.buildVolume.z
      }
    })
  );
}

function updateUI() {
  // startLayer.setAttribute('max', gcodePreview.layers.length);
  // endLayer.setAttribute('max', gcodePreview.layers.length);
  // endLayer.value = gcodePreview.layers.length;
  // endLayerValue.innerText = endLayer.value;

  startLayerValue.innerText = startLayer.value;

  // layerCount.innerText = gcodePreview.layers && gcodePreview.layers.length + ' layers';

  if (favIcon != gcodePreview.parser.metadata.thumbnails['16x16']) {
    favIcon = gcodePreview.parser.metadata.thumbnails['16x16'];
    setFavicons(favIcon?.src);
  }

  if (thumb != gcodePreview.parser.metadata.thumbnails['220x124']) {
    thumb = gcodePreview.parser.metadata.thumbnails['220x124'];
    document.getElementById('thumb').src = thumb?.src ?? 'https://via.placeholder.com/120x60?text=noThumbnail';
  }

  showExtrusionColors();
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
async function loadGCodeFromServer(filename) {
  const response = await fetch(filename);
  if (response.status !== 200) {
    console.error('ERROR. Status Code: ' + response.status);
    return;
  }

  const gcode = await response.text();
  _handleGCode(filename, gcode);
  fileName.setAttribute('href', filename);
}

function _handleGCode(filename, text) {
  gcode = text;
  fileName.innerText = filename;
  fileSize.innerText = humanFileSize(text.length);

  updateUI();

  startLoadingProgressive(text);
}

async function startLoadingProgressive(gcode) {
  startLayer.setAttribute('disabled', 'disabled');
  endLayer.setAttribute('disabled', 'disabled');

  gcodePreview.clear();
  if (renderProgressive) {
    gcodePreview.parser.parseGCode(gcode);
    updateUI();
    // await gcodePreview.renderAnimated(Math.ceil(gcodePreview.layers.length / 60));
  } else {
    gcodePreview.processGCode(gcode);
  }
  updateUI();

  startLayer.removeAttribute('disabled');
  endLayer.removeAttribute('disabled');
}

function humanFileSize(size) {
  var i = Math.floor(Math.log(size) / Math.log(1024));
  return (size / Math.pow(1024, i)).toFixed(2) * 1 + ' ' + ['B', 'kB', 'MB', 'GB', 'TB'][i];
}

function setFavicons(favImg) {
  const headTitle = document.querySelector('head');
  const setFavicon = document.createElement('link');
  setFavicon.setAttribute('rel', 'shortcut icon');
  setFavicon.setAttribute('href', favImg);
  headTitle.appendChild(setFavicon);
}

let throttleTimer;
const throttle = (callback, time) => {
  if (throttleTimer) return;
  throttleTimer = true;
  setTimeout(() => {
    callback();
    throttleTimer = false;
  }, time);
};

// debounce function
let debounceTimer;
const debounce = (callback) => {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(callback, 300);
};

function showExtrusionColors() {
  // loop through inputs and show/hide them
  for (let i = 0; i < 8; i++) {
    // find parent element
    const parent = extrusionColor[i].parentNode;
    if (i < toolCount) {
      parent.style.display = 'flex';
    } else {
      parent.style.display = 'none';
    }
  }
}
