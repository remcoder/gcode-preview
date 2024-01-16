/*eslint prefer-const: "error"*/
/* global THREE, GCodePreview, Canvas2Image */
let gcodePreview;
let favIcon;
let thumb;
const chunkSize = 1000;

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
const extrusionColor = document.getElementById('extrusion-color');
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
  console.debug('settings', settings);

  const preview = (window.preview = new GCodePreview.init({
    canvas: canvasElement,
    buildVolume: settings?.buildVolume || { x: 190, y: 210, z: 0 },
    initialCameraPosition: [180, 150, 300],
    topLayerColor: 'rgb(0, 255, 255)',
    lastSegmentColor: '#fff',
    renderExtrusion: true,
    renderTravel: false,
    renderTubes: false,
    extrusionColor: 'hotpink',
    backgroundColor: preferDarkMode.matches ? '#111' : '#eee',
    travelColor: new THREE.Color('lime')
    // minLayerThreshold: 0.1
  }));

  // set default colors on inputs
  extrusionColor.value = '#' + new THREE.Color(preview.extrusionColor).getHexString();
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
    preview.render();
  });

  extrusionColor.addEventListener('input', () =>
    throttle(() => {
      preview.extrusionColor = extrusionColor.value;
      preview.render();
    })
  );
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

  // console.log(gcodePreview.layers);

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
      console.debug(gcodePreview.parser.metadata.thumbnails);
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
