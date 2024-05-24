/*eslint prefer-const: "error"*/

/* global THREE, GCodePreview, Canvas2Image */
let gcodePreview;
let favIcon;
let thumb;
const chunkSize = 10000;
const maxToolCount = 8;
let toolCount = 4;

const canvasElement = document.querySelector('.gcode-previewer');
const settingsPreset = document.getElementById('settings-presets');
const startLayer = document.getElementById('start-layer');
const startLayerValue = document.getElementById('start-layer-value');
const endLayer = document.getElementById('end-layer');
const endLayerValue = document.getElementById('end-layer-value');
const lineWidth = document.getElementById('line-width');
const lineWidthValue = document.getElementById('line-width-value');
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
const layerCount = document.getElementById('layer-count');
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

const settingsPresets = {
  default: {
    file: 'gcodes/3DBenchy-Multi-part.gcode',
    lineWidth: 1,
    singleLayerMode: false,
    renderExtrusion: true,
    renderTubes: false,
    extrusionColor: ['#CF439D', 'rgb(84,74,187)', 'white', 'rgb(83,209,104)'],
    travel: false,
    travelColor: '#00FF00',
    highlightTopLayer: false,
    topLayerColor: '#40BFBF',
    lastSegmentColor: '#ffffff',
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
    extrusionColor: [],
    travel: true,
    travelColor: '#00FF00',
    highlightTopLayer: false,
    topLayerColor: '#40BFBF',
    lastSegmentColor: '#ffffff',
    drawBuildVolume: true,
    buildVolume: {
      x: 20,
      y: 20,
      z: ''
    }
  },
  benchy: {
    file: 'gcodes/benchy.gcode',
    lineWidth: 1,
    singleLayerMode: false,
    renderExtrusion: true,
    renderTubes: true,
    extrusionColor: ['#CF439D'],
    travel: false,
    travelColor: '#00FF00',
    highlightTopLayer: true,
    topLayerColor: '#40BFBF',
    lastSegmentColor: '#ffffff',
    drawBuildVolume: true,
    buildVolume: {
      x: 180,
      y: 180,
      z: 180
    }
  },
  'benchy-arcs': {
    file: 'gcodes/benchy arcs.gcode',
    lineWidth: 2,
    singleLayerMode: true,
    renderExtrusion: true,
    renderTubes: false,
    extrusionColor: ['#CF439D'],
    travel: false,
    travelColor: '#00FF00',
    highlightTopLayer: false,
    topLayerColor: '#40BFBF',
    lastSegmentColor: '#ffffff',
    drawBuildVolume: true,
    buildVolume: {
      x: 200,
      y: 200,
      z: 180
    }
  }
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
function initDemo() {
  // eslint-disable-line no-unused-vars, @typescript-eslint/no-unused-vars
  const settings = JSON.parse(localStorage.getItem('settings'));
  console.debug('settings loaded', settings);

  const preview = (window.preview = new GCodePreview.init({
    canvas: canvasElement,
    buildVolume: settings?.buildVolume || { x: 190, y: 210, z: 0 },
    initialCameraPosition: [180, 150, 300],
    // topLayerColor: 'rgb(0, 255, 255)',
    lastSegmentColor: '#fff',
    renderExtrusion: true,
    renderTravel: false,
    renderTubes: false,
    extrusionColor: ['#CF439D', 'rgb(84,74,187)', 'white', 'rgb(83,209,104)'],
    backgroundColor: preferDarkMode.matches ? '#111' : '#eee',
    travelColor: new THREE.Color('lime')
    // minLayerThreshold: 0.1
  }));

  // set default colors on inputs

  // loop through the extrusionColor object and set the value of the input
  for (let i = 0; i < maxToolCount; i++) {
    extrusionColor[i].value = '#' + new THREE.Color(preview.extrusionColor[i]).getHexString();
  }
  changeBackgroundColor('#' + new THREE.Color(preview.backgroundColor).getHexString());
  travelColor.value = '#' + new THREE.Color(preview.travelColor).getHexString();

  preferDarkMode.addEventListener('change', (e) => {
    if (e.matches) {
      changeBackgroundColor('#111');
    } else {
      changeBackgroundColor('#eee');
    }
  });

  // preview.controls.autoRotate = true;

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

  toggleSingleLayerMode.addEventListener('click', function () {
    changeSingleLayerMode(toggleSingleLayerMode.checked);
    preview.render();
  });

  toggleExtrusion.addEventListener('click', function () {
    changeRenderExtrusion(toggleExtrusion.checked);
    preview.render();
  });

  toggleRenderTubes.addEventListener('click', function () {
    changeRenderTubes(toggleRenderTubes.checked);
    preview.render();
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
    changeRenderTravel(toggleTravel.checked);
    preview.render();
  });

  travelColor.addEventListener('input', () =>
    throttle(() => {
      changeTravelColor(travelColor.value);
      preview.render();
    })
  );

  toggleHighlight.addEventListener('click', function () {
    changeHighlightTopLayer(toggleHighlight.checked);
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

    preview.clear();

    await preview._readFromStream(file.stream());
    updateUI();
    preview.render();
  });

  function updateBuildVolume() {
    const x = parseInt(buildVolumeX.value, 10);
    const y = parseInt(buildVolumeY.value, 10);
    const z = parseInt(buildVolumeZ.value, 10);

    const draw = drawBuildVolume.checked;

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
    preview.highlightTopLayer = enabled;
    toggleHighlight.checked = enabled;
    if (enabled) {
      topLayerColorInput.removeAttribute('disabled');
      lastSegmentColorInput.removeAttribute('disabled');
    } else {
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
    preview.topLayerColor = color;
    topLayerColorInput.value = color;
  }

  function changeLastSegmentColor(color) {
    preview.lastSegmentColor = color;
    lastSegmentColorInput.value = color;
  }

  function changeBuildVolume(volume) {
    buildVolumeX.value = volume.x;
    buildVolumeY.value = volume.y;
    buildVolumeZ.value = volume.z;
    preview.buildVolume = volume;
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
    changeToolColors(preset.extrusionColor);
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
  startLayer.setAttribute('max', gcodePreview.layers.length);
  endLayer.setAttribute('max', gcodePreview.layers.length);
  endLayer.value = gcodePreview.layers.length;
  endLayerValue.innerText = endLayer.value;

  startLayerValue.innerText = startLayer.value;

  layerCount.innerText = gcodePreview.layers && gcodePreview.layers.length + ' layers';

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
async function loadGCodeFromServer(file) {
  const response = await fetch(file);

  if (response.status !== 200) {
    console.error('ERROR. Status Code: ' + response.status);
    return;
  }

  const gcode = await response.text();
  _handleGCode(file, gcode);
  fileName.setAttribute('href', file);
}

function _handleGCode(filename, gcode) {
  // chunkSize = gcode.length / 1000;
  fileName.innerText = filename;
  fileSize.innerText = humanFileSize(gcode.length);

  updateUI();

  startLoadingProgressive(gcode);
}

function startLoadingProgressive(gcode) {
  let c = 0;
  startLayer.setAttribute('disabled', 'disabled');
  endLayer.setAttribute('disabled', 'disabled');
  function loadProgressive() {
    const start = c * chunkSize;
    const end = (c + 1) * chunkSize;
    const chunk = lines.slice(start, end);

    c++;
    if (c < chunks) {
      window.__loadTimer__ = requestAnimationFrame(loadProgressive);
    } else {
      startLayer.removeAttribute('disabled');
      endLayer.removeAttribute('disabled');
    }
    gcodePreview.processGCode(chunk);
    updateUI();
  }

  const lines = gcode.split('\n');
  const chunks = lines.length / chunkSize;
  gcodePreview.clear();
  if (window.__loadTimer__) clearTimeout(window.__loadTimer__);
  loadProgressive();
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
