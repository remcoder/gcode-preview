/*eslint prefer-const: "error"*/

/* global THREE, GCodePreview, Canvas2Image */
let gcodePreview;
let favIcon;
let thumb;
const maxToolCount = 8;
let toolCount = 4;
let chunkSize = 1000;
let currentFile;
const FILE_SIZE_10MB = 10 * 1024 * 1024;

const canvasElement = document.querySelector('.gcode-previewer');
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
const fileSize = document.getElementById('file-size');
const snapshot = document.getElementById('snapshot');
const buildVolumeX = document.getElementById('buildVolumeX');
const buildVolumeY = document.getElementById('buildVolumeY');
const buildVolumeZ = document.getElementById('buildVolumeZ');
const drawBuildVolume = document.getElementById('drawBuildVolume');
const travelColor = document.getElementById('travel-color');

// const prusaOrange = '#c86e3b';
let topLayerColor = new THREE.Color(`hsl(180, 50%, 50%)`).getHex();
let lastSegmentColor = new THREE.Color(`hsl(270, 100%, 100%)`).getHex();

topLayerColorInput.value = '#' + new THREE.Color(topLayerColor).getHexString();
lastSegmentColorInput.value = '#' + new THREE.Color(lastSegmentColor).getHexString();

const preferDarkMode = window.matchMedia('(prefers-color-scheme: dark)');

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
    // lastSegmentColor: '#fff',
    renderExtrusion: true,
    renderTravel: false,
    renderTubes: true,
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

  backgroundColor.value = '#' + new THREE.Color(preview.backgroundColor).getHexString();
  travelColor.value = '#' + new THREE.Color(preview.travelColor).getHexString();

  preferDarkMode.addEventListener('change', (e) => {
    if (e.matches) {
      preview.backgroundColor = '#111';
    } else {
      preview.backgroundColor = '#eee';
    }
    backgroundColor.value = '#' + new THREE.Color(preview.backgroundColor).getHexString();
  });

  // preview.controls.autoRotate = true;

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
    preview.lineWidth = +lineWidth.value;
    lineWidthValue.innerText = lineWidth.value;
    preview.render();
  });

  toggleSingleLayerMode.addEventListener('click', function () {
    preview.singleLayerMode = toggleSingleLayerMode.checked;
    if (preview.singleLayerMode) {
      startLayer.setAttribute('disabled', 'disabled');
    } else {
      startLayer.removeAttribute('disabled');
    }
    preview.render();
  });

  toggleExtrusion.addEventListener('click', function () {
    preview.renderExtrusion = toggleExtrusion.checked;
    preview.render();
  });

  toggleRenderTubes.addEventListener('click', function () {
    preview.renderTubes = toggleRenderTubes.checked;
    if (preview.renderTubes && currentFile.size > FILE_SIZE_10MB) {
      confirm('This file is large and may take a while to render in this mode. Continue?')
        ? (preview.renderTubes = true)
        : (preview.renderTubes = false);
      toggleRenderTubes.checked = preview.renderTubes;
    }
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
      preview.backgroundColor = backgroundColor.value;
      preview.render();
    })
  );

  toggleTravel.addEventListener('click', function () {
    preview.renderTravel = toggleTravel.checked;
    preview.render();
  });
  travelColor.addEventListener('input', () =>
    throttle(() => {
      preview.travelColor = travelColor.value;
      preview.render();
    })
  );

  toggleHighlight.addEventListener('click', function () {
    if (toggleHighlight.checked) {
      preview.topLayerColor = topLayerColor;
      preview.lastSegmentColor = lastSegmentColor;
    } else {
      preview.topLayerColor = undefined;
      preview.lastSegmentColor = undefined;
    }
    preview.render();
  });

  topLayerColorInput.addEventListener('input', () =>
    throttle(() => {
      topLayerColor = new THREE.Color(topLayerColorInput.value);
      preview.topLayerColor = topLayerColor;
      preview.render();
    })
  );

  lastSegmentColorInput.addEventListener('input', () =>
    throttle(() => {
      lastSegmentColor = new THREE.Color(lastSegmentColorInput.value);
      preview.lastSegmentColor = lastSegmentColor;
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

    // preview.clear();
    if (preview.renderTubes && file.size > FILE_SIZE_10MB) {
      confirm('This file is large and may take a while to render in this mode. Change to line rendering?')
        ? (preview.renderTubes = false)
        : (preview.renderTubes = true);
    }
    preview.initScene();
    preview.clear();
    console.time('readFromStream');
    await preview._readFromStream(file.stream());
    console.timeEnd('readFromStream');
    updateUI();
    currentFile = file;

    console.time('render');
    preview.render();
    console.timeEnd('render');
  });

  function updateBuildVolume() {
    const x = parseInt(buildVolumeX.value, 10);
    const y = parseInt(buildVolumeY.value, 10);
    const z = parseInt(buildVolumeZ.value, 10);

    const draw = drawBuildVolume.checked;

    if (draw && !isNaN(x) && !isNaN(y)) {
      preview.buildVolume = {
        x: x,
        y: y,
        z: z
      };
    } else {
      preview.buildVolume = null;
    }

    preview.render();

    if (draw) {
      buildVolumeX.removeAttribute('disabled');
      buildVolumeY.removeAttribute('disabled');
      buildVolumeZ.removeAttribute('disabled');
    } else {
      buildVolumeX.setAttribute('disabled', 'disabled');
      buildVolumeY.setAttribute('disabled', 'disabled');
      buildVolumeZ.setAttribute('disabled', 'disabled');
    }

    storeSettings();
  }

  buildVolumeX.value = settings?.buildVolume?.x;
  buildVolumeY.value = settings?.buildVolume?.y;
  buildVolumeZ.value = settings?.buildVolume?.z;
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
  // lineWidth.value = gcodePreview.lineWidth ?? null;
  lineWidthValue.innerText = lineWidth.value;

  if (gcodePreview.renderTubes) toggleRenderTubes.setAttribute('checked', 'checked');
  else toggleRenderTubes.removeAttribute('checked');

  if (gcodePreview.renderExtrusion) toggleExtrusion.setAttribute('checked', 'checked');
  else toggleExtrusion.removeAttribute('checked');

  if (gcodePreview.renderTravel) toggleTravel.setAttribute('checked', 'checked');
  else toggleTravel.removeAttribute('checked');

  if (gcodePreview.topLayerColor !== undefined) toggleHighlight.setAttribute('checked', 'checked');
  else toggleHighlight.removeAttribute('checked');

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
  currentFile = filename;
  if (response.status !== 200) {
    console.error('ERROR. Status Code: ' + response.status);
    return;
  }

  const gcode = await response.text();
  _handleGCode(filename, gcode);
  fileName.setAttribute('href', filename);
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
    gcodePreview.parser.parseGCode(chunk);
    gcodePreview.renderIncremental();
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

function saveCameraPosition() {
  localStorage.setItem('camera.hasPosition', 'true');

  localStorage.setItem('camera.position.x', gcodePreview.camera.position.x.toString());
  localStorage.setItem('camera.position.y', gcodePreview.camera.position.y.toString());
  localStorage.setItem('camera.position.z', gcodePreview.camera.position.z.toString());
  localStorage.setItem('camera.rotation.x', gcodePreview.camera.rotation.x.toString());
  localStorage.setItem('camera.rotation.y', gcodePreview.camera.rotation.y.toString());
  localStorage.setItem('camera.rotation.z', gcodePreview.camera.rotation.z.toString());
  localStorage.setItem('controls.target.x', gcodePreview.controls.target.x.toString());
  localStorage.setItem('controls.target.y', gcodePreview.controls.target.y.toString());
  localStorage.setItem('controls.target.z', gcodePreview.controls.target.z.toString());
}

function loadCameraPosition() {
  if (localStorage.getItem('camera.hasPosition') !== 'true') return;

  gcodePreview.camera.position.x = parseFloat(localStorage.getItem('camera.position.x'));
  gcodePreview.camera.position.y = parseFloat(localStorage.getItem('camera.position.y'));
  gcodePreview.camera.position.z = parseFloat(localStorage.getItem('camera.position.z'));
  gcodePreview.camera.rotation.x = parseFloat(localStorage.getItem('camera.rotation.x'));
  gcodePreview.camera.rotation.y = parseFloat(localStorage.getItem('camera.rotation.y'));
  gcodePreview.camera.rotation.z = parseFloat(localStorage.getItem('camera.rotation.z'));
  gcodePreview.controls.target.x = parseFloat(localStorage.getItem('controls.target.x'));
  gcodePreview.controls.target.y = parseFloat(localStorage.getItem('controls.target.y'));
  gcodePreview.controls.target.z = parseFloat(localStorage.getItem('controls.target.z'));
}
