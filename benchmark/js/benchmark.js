/*eslint prefer-const: "error"*/
/* global THREE, GCodePreview, Canvas2Image */
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
  const preview = new GCodePreview.init({
    canvas: canvasElement,
    buildVolume: { x: 190, y: 210, z: 0 },
    initialCameraPosition: [180, 150, 300],
    topLayerColor: 'rgb(0, 255, 255)',
    lastSegmentColor: '#fff',
    renderExtrusion: true,
    renderTravel: false,
    renderTubes: true,
    extrusionColor: 'hotpink',
    backgroundColor: preferDarkMode.matches ? '#111' : '#eee',
    travelColor: new THREE.Color('lime')
    // minLayerThreshold: 0.1
  });

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

  return preview;
}

async function runBenchy() {
  const response = await fetch('benchy.gcode');

  if (response.status !== 200) {
    console.error('ERROR. Status Code: ' + response.status);
    return;
  }
  const gcode = await response.text();

  const initStart = performance.now();
  let preview = initDemo();
  const initEnd = performance.now();

  const processStart = performance.now();
  await preview.processGCode(gcode);
  const processEnd = performance.now();

  const destroyStart = performance.now();
  delete preview
  const destroyEnd = performance.now();
  return ({
    process: processEnd - processStart,
    init: initEnd - initStart,
    destroy: destroyEnd - destroyStart,
    total: destroyEnd - initStart
  })
}

const runBenchyBtn = document.getElementById('benchy');

runBenchyBtn.addEventListener('click', function () {

  let benchyResults = Promise.all(([...Array(10)]).map(async () => {
    return await runBenchy();
  }));

  console.log(benchyResults)

  benchyResults.then ((r) => {
    console.log(r)
    const processTime = r.map((v) => v.process).reduce((a, b) => a + b, 0).toFixed(2)
    const initTime = r.map((v) => v.init).reduce((a, b) => a + b, 0).toFixed(2)
    const destroyTime = r.map((v) => v.destroy).reduce((a, b) => a + b, 0).toFixed(2)
    const totalTime = r.map((v) => v.total).reduce((a, b) => a + b, 0).toFixed(2)
    document.getElementById('benchy-init').innerHTML = initTime
    document.getElementById('benchy-process').innerHTML = processTime
    document.getElementById('benchy-destroy').innerHTML = destroyTime
    document.getElementById('benchy-total').innerHTML = totalTime
  })
})
