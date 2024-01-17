/*eslint prefer-const: "error"*/
/* global THREE, GCodePreview, Canvas2Image */
let gcodePreview;
let favIcon;
let thumb;
const chunkSize = 1000;

const canvasElement = document.querySelector('.gcode-previewer');

// const prusaOrange = '#c86e3b';
let topLayerColor = new THREE.Color(`hsl(180, 50%, 50%)`).getHex();
let lastSegmentColor = new THREE.Color(`hsl(270, 100%, 100%)`).getHex();

const preferDarkMode = window.matchMedia('(prefers-color-scheme: dark)');

// eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
function initDemo() {

  const preview = (window.preview = new GCodePreview.init({
    canvas: canvasElement,
    buildVolume: { x: 190, y: 210, z: 0 },
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

  preferDarkMode.addEventListener('change', (e) => {
    if (e.matches) {
      preview.backgroundColor = '#111';
    } else {
      preview.backgroundColor = '#eee';
    }
    backgroundColor.value = '#' + new THREE.Color(preview.backgroundColor).getHexString();
  });

  window.addEventListener('resize', function () {
    preview.resize();
  });

  gcodePreview = preview;

  return preview;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
async function loadGCodeFromServer(file) {
  const response = await fetch(file);

  if (response.status !== 200) {
    console.error('ERROR. Status Code: ' + response.status);
    return;
  }

  const gcode = await response.text();
  preview.clear();

  const processStart = performance.now();
  await preview.processGCode(gcode);
  const processEnd = performance.now();

  const renderStart = performance.now();
  preview.render();
  const renderEnd = performance.now();
  return ({
    process: processEnd - processStart,
    render: renderEnd - renderStart,
    total: renderEnd - processStart
  })
}



async function runBenchy() {
  const gcodeDemo = initDemo();
  return loadGCodeFromServer('benchy.gcode')
}

const runBenchyBtn = document.getElementById('benchy');
runBenchyBtn.addEventListener('click', function () {
  let benchyResults = Promise.all(([...Array(10)]).map(async () => {
    return await runBenchy();
  }));

  console.log(benchyResults)

  benchyResults.then ((r) => {
    console.log(r)
    const processTime = r.map((v) => v.process).reduce((a, b) => a + b, 0)
    const renderTime = r.map((v) => v.render).reduce((a, b) => a + b, 0)
    const totalTime = r.map((v) => v.total).reduce((a, b) => a + b, 0)
    document.getElementById('benchy-process').innerHTML = processTime
    document.getElementById('benchy-render').innerHTML = renderTime
    document.getElementById('benchy-total').innerHTML = totalTime
  })
  

  
    

})