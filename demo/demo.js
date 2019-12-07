let gcodePreview;

const slider = document.getElementById('layers');
const scaleSlider = document.getElementById('scale');
const toggleExtrusion = document.getElementById('extrusion');
const toggleTravel = document.getElementById('travel');
const toggleZoneColors = document.getElementById('zone-colors');
const layerCount = document.getElementById('layer-count');
const fileName = document.getElementById('file-name');
const fileSize = document.getElementById('file-size');
const snapshot = document.getElementById('snapshot');

function initDemo() {
  const preview = new GCodePreview.WebGLPreview({
      targetId : 'renderer' 
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
}

function loadGCode(file) {
  const reader = new FileReader();
  reader.onload = function(e) {
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
  console.log('lines', lines.length)
  const chunkSize = 5000;
  console.log('chunk size', chunkSize)
  const chunks = lines.length / chunkSize;
  console.log('chunks', chunks)
  updateUI();  
  
  let c = 0;
  function loadProgressive() {
    const start = c*chunkSize;
    const end = (c+1)*chunkSize;
    const chunk = lines.slice(start, end);
    gcodePreview.processGCode(chunk)
    updateUI();
    c++;
    if (c < chunks) { 
      requestAnimationFrame(loadProgressive);
    }
  }
  loadProgressive();
}

function humanFileSize(size) {
  var i = Math.floor( Math.log(size) / Math.log(1024) );
  return ( size / Math.pow(1024, i) ).toFixed(2) * 1 + ' ' + ['B', 'kB', 'MB', 'GB', 'TB'][i];
};
