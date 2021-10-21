/* global THREE, GCodePreview, Canvas2Image */
let gcodePreview;
let favIcon;
let thumb;
const chunkSize = 1000;

const startLayer = document.getElementById('start-layer');
const endLayer = document.getElementById('end-layer');
const toggleSingleLayerMode = document.getElementById('single-layer-mode');
const toggleExtrusion = document.getElementById('extrusion');
const toggleTravel = document.getElementById('travel');
const toggleHighlight = document.getElementById('highlight');
const layerCount = document.getElementById('layer-count');
const fileName = document.getElementById('file-name');
const fileSize = document.getElementById('file-size');
const snapshot = document.getElementById('snapshot');
const buildVolumeX = document.getElementById('buildVolumeX');
const buildVolumeY = document.getElementById('buildVolumeY');
const buildVolumeZ = document.getElementById('buildVolumeZ');
const drawBuildVolume = document.getElementById('drawBuildVolume');
// const lineWidth = document.getElementById('line-width');

// const prusaOrange = '#c86e3b';
const topLayerColor = new THREE.Color(`hsl(180, 50%, 50%)`).getHex();
const lastSegmentColor = new THREE.Color(`hsl(270, 50%, 50%)`).getHex();

function initDemo() { // eslint-disable-line no-unused-vars, @typescript-eslint/no-unused-vars
  const preview = (window.preview = new GCodePreview.WebGLPreview({
    canvas: document.querySelector('.gcode-previewer'),
    // targetId : 'renderer',
    topLayerColor: topLayerColor,
    lastSegmentColor: lastSegmentColor,
    // lineWidth: 4
    buildVolume: {x: 150, y: 150, z: 150},
    initialCameraPosition: [0,400,450],
    // debug: true
  }));

  preview.renderExtrusion = true;
  preview.renderTravel = false;

  startLayer.addEventListener('input', function() {
    preview.startLayer = +startLayer.value;
    endLayer.value = preview.endLayer = Math.max(preview.startLayer, preview.endLayer);
    preview.render();
  });

  endLayer.addEventListener('input', function() {
    preview.endLayer = +endLayer.value;
    startLayer.value = preview.startLayer = Math.min(preview.startLayer, preview.endLayer);
    preview.render();
  });

  toggleSingleLayerMode.addEventListener('click', function() {
    preview.singleLayerMode = toggleSingleLayerMode.checked;
    if (preview.singleLayerMode) {
      startLayer.setAttribute('disabled', 'disabled');
    } 
    else {
      startLayer.removeAttribute('disabled');
    }
    preview.render();
  });

  toggleExtrusion.addEventListener('click', function() {
    preview.renderExtrusion = toggleExtrusion.checked;
    preview.render();
  });

  toggleTravel.addEventListener('click', function() {
    preview.renderTravel = toggleTravel.checked;
    preview.render();
  });

  toggleHighlight.addEventListener('click', function() {
    if (toggleHighlight.checked) {
      preview.topLayerColor = topLayerColor;
      preview.lastSegmentColor = lastSegmentColor;
    } else {
      preview.topLayerColor = undefined;
      preview.lastSegmentColor = undefined;
    }
    preview.render();
  });

  function updateBuildVolume () {
    const x = parseInt(buildVolumeX.value, 10);
    const y = parseInt(buildVolumeY.value, 10);
    const z = parseInt(buildVolumeZ.value, 10);
    const draw = drawBuildVolume.checked;

    if (draw && !isNaN(x) && !isNaN(y)) {
      preview.buildVolume = { 
        x: x, 
        y: y,
        z: z
      }
    }
    else {
      preview.buildVolume = null;
    }
    
    preview.render();

    if (draw) {
      buildVolumeX.removeAttribute('disabled');
      buildVolumeY.removeAttribute('disabled');
      buildVolumeZ.removeAttribute('disabled');
    }
    else {
      buildVolumeX.setAttribute('disabled', 'disabled');
      buildVolumeY.setAttribute('disabled', 'disabled');
      buildVolumeZ.setAttribute('disabled', 'disabled');
    }
  }

  buildVolumeX.addEventListener('input', updateBuildVolume);
  buildVolumeY.addEventListener('input', updateBuildVolume);
  buildVolumeZ.addEventListener('input', updateBuildVolume);
  drawBuildVolume.addEventListener('input', updateBuildVolume);

  // lineWidth.addEventListener('change', function() {
  //   preview.lineWidth = parseInt(lineWidth.value,10);
  //   preview.render();
  // });

  window.addEventListener('resize', function() {
    preview.resize();
  });

  preview.canvas.addEventListener('dragover', function(evt) {
      evt.stopPropagation();
      evt.preventDefault();
      evt.dataTransfer.dropEffect = 'copy';
      document.body.className = "dragging";
  });

  preview.canvas.addEventListener('dragleave', function(evt) {
      evt.stopPropagation();
      evt.preventDefault();
      document.body.className = "";
  });

  preview.canvas.addEventListener('drop', function(evt) {
      evt.stopPropagation();
      evt.preventDefault();
      document.body.className = "";
      const files = evt.dataTransfer.files;
      const file = files[0];
      loadGCode(file);
  });

  snapshot.addEventListener('click', function(evt) {
    evt.stopPropagation();
    evt.preventDefault();

    Canvas2Image.saveAsJPEG(gcodePreview.canvas,innerWidth, innerHeight, fileName.innerText.replace('.gcode','.jpg'));
  });

  gcodePreview = preview;

  updateUI();

  return preview;
}

function updateUI() {
  startLayer.setAttribute('max', gcodePreview.layers.length);
  endLayer.setAttribute('max', gcodePreview.layers.length);
  endLayer.value = gcodePreview.layers.length;
  
  layerCount.innerText =
    gcodePreview.layers && gcodePreview.layers.length + ' layers';

  // console.log(gcodePreview.layers);

  if (gcodePreview.renderExtrusion)
    toggleExtrusion.setAttribute('checked', 'checked');
  else toggleExtrusion.removeAttribute('checked');

  if (gcodePreview.renderTravel)
    toggleTravel.setAttribute('checked', 'checked');
  else toggleTravel.removeAttribute('checked');

  if (gcodePreview.topLayerColor !== undefined)
    toggleHighlight.setAttribute('checked', 'checked');
  else toggleHighlight.removeAttribute('checked');

  if (favIcon != gcodePreview.parser.metadata.thumbnails['16x16']) {
    favIcon = gcodePreview.parser.metadata.thumbnails['16x16'];
    setFavicons(favIcon?.src);
  }
  
  if(thumb != gcodePreview.parser.metadata.thumbnails['220x124']) {
    thumb = gcodePreview.parser.metadata.thumbnails['220x124'];
    document.getElementById('thumb').src = thumb?.src ?? 'https://via.placeholder.com/120x60?text=noThumbnail';
  }
}

function loadGCode(file) {
  const reader = new FileReader();
  reader.onload = function() {
    _handleGCode(file.name, reader.result);
  };
  reader.readAsText(file);
  fileName.setAttribute('href', '#');
}

async function loadGCodeFromServer(file) { // eslint-disable-line no-unused-vars, @typescript-eslint/no-unused-vars
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
      window.__loadTimer__ = requestAnimationFrame(loadProgressive)
    }
    else {
      startLayer.removeAttribute('disabled');
      endLayer.removeAttribute('disabled');
      console.log(preview.parser.metadata.thumbnails);
    }
    gcodePreview.processGCode(chunk);
    updateUI();
  }

  const lines = gcode.split('\n');
  console.log('lines', lines.length);
  console.log('chunk size', chunkSize);
  const chunks = lines.length / chunkSize;
  console.log('chunks', chunks);
  console.log('loading');
  gcodePreview.clear();
  if (window.__loadTimer__) clearTimeout(window.__loadTimer__);
  loadProgressive();
}

function humanFileSize(size) {
  var i = Math.floor(Math.log(size) / Math.log(1024));
  return (
    (size / Math.pow(1024, i)).toFixed(2) * 1 +
    ' ' +
    ['B', 'kB', 'MB', 'GB', 'TB'][i]
  );
}

function setFavicons(favImg){
  let headTitle = document.querySelector('head');
  let setFavicon = document.createElement('link');
  setFavicon.setAttribute('rel','shortcut icon');
  setFavicon.setAttribute('href',favImg);
  headTitle.appendChild(setFavicon);
}
