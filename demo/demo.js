let gcodePreview;

const slider = document.getElementById('layers');
const toggleExtrusion = document.getElementById('extrusion');
const toggleTravel = document.getElementById('travel');
const toggleHighlight = document.getElementById('highlight');
const layerCount = document.getElementById('layer-count');
const fileName = document.getElementById('file-name');
const fileSize = document.getElementById('file-size');

function initDemo() {
  const preview = new GCodePreview.WebGLPreview({
    targetId : 'renderer',
    topLayerColor: new THREE.Color(`hsl(180, 50%, 50%)`).getHex(),
    lastSegmentColor: new THREE.Color(`hsl(270, 50%, 50%)`).getHex()
  });

  slider.addEventListener('input', function(evt) {
    preview.limit = +slider.value;
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
      preview.topLayerColor = new THREE.Color(`hsl(180, 50%, 50%)`).getHex();
      preview.lastSegmentColor = new THREE.Color(`hsl(270, 50%, 50%)`).getHex();
    }
    else {
      preview.topLayerColor = null;
      preview.lastSegmentColor = null;
    }
    preview.render();
  });

  window.addEventListener('resize', function() {
    preview.resize();
  });

  preview.canvas.addEventListener('dragover', function(evt) {
    evt.stopPropagation();
    evt.preventDefault();
    evt.dataTransfer.dropEffect = 'copy'
  });

  preview.canvas.addEventListener('drop', function(evt) {
    evt.stopPropagation();
    evt.preventDefault();
    const files = evt.dataTransfer.files;
    const file = files[0];
    loadGCode(file);
  });

  gcodePreview = preview;
  
  updateUI();

  return preview;
}

function updateUI() {
  slider.setAttribute('max', gcodePreview.layers.length-1);
  slider.value = gcodePreview.layers.length-1;
  layerCount.innerText = gcodePreview.layers && gcodePreview.layers.length + ' layers';
  
  if (gcodePreview.renderExtrusion)
    toggleExtrusion.setAttribute("checked", "checked");
  else
    toggleExtrusion.removeAttribute("checked");
  
  if (gcodePreview.renderTravel)
    toggleTravel.setAttribute("checked", "checked");
  else
    toggleTravel.removeAttribute("checked");

  if (gcodePreview.topLayerColor !== undefined)
    toggleHighlight.setAttribute("checked", "checked");
  else
    toggleHighlight.removeAttribute("checked");
}

function loadGCode(file) {
  const reader = new FileReader();
  reader.onload = function() {
    _handleGCode(file.name, reader.result);
  }
  reader.readAsText(file);
  fileName.setAttribute('href', '#');
}

async function loadGCodeFromServer(file) {
  const response = await fetch(file);
    
  if (response.status !== 200) {
    console.error('ERROR. Status Code: ' +
      response.status);
    return;
  }

  const gcode = await response.text()
  _handleGCode(file, gcode); 
  fileName.setAttribute('href', file);
}

function _handleGCode(filename, gcode) {
  fileName.innerText = filename;
  fileSize.innerText = humanFileSize(gcode.length);
  
  const lines = gcode.split('\n');
  console.log('lines', lines.length);
  const chunkSize = 1000;
  console.log('chunk size', chunkSize);
  const chunks = lines.length / chunkSize;
  console.log('chunks', chunks);
  updateUI();  
  
  let c = 0;
  function loadProgressive() {
    const start = c*chunkSize;
    const end = (c+1)*chunkSize;
    const chunk = lines.slice(start, end);
    gcodePreview.processGCode(chunk);
    updateUI();
    c++;
    if (c < chunks) { 
      setTimeout(loadProgressive, 100);
    }
  }
  console.log('loading')
  gcodePreview.clear();
  loadProgressive();
}

function humanFileSize(size) {
  var i = Math.floor( Math.log(size) / Math.log(1024) );
  return ( size / Math.pow(1024, i) ).toFixed(2) * 1 + ' ' + ['B', 'kB', 'MB', 'GB', 'TB'][i];
};
