

// const prusaOrange = '#c86e3b';
let topLayerColor = new THREE.Color(`hsl(180, 50%, 50%)`).getHex();
let lastSegmentColor = new THREE.Color(`hsl(270, 100%, 100%)`).getHex();

const preferDarkMode = window.matchMedia('(prefers-color-scheme: dark)');

const previewContainer = document.querySelector('#preview-container');

const runBenchyBtn = document.getElementById('benchy');
const progress = document.getElementById('progress')
const iterationsInput = document.getElementById('iterations')

const table = document.getElementById('results')

// eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
function initDemo() {
  const canvasElement = document.createElement('canvas')
  canvasElement.classList.add(".gcode-previewer");
  previewContainer.appendChild(canvasElement);

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
  previewContainer.innerHTML = '';
  delete preview
  const destroyEnd = performance.now();

  return ({
    process: processEnd - processStart,
    init: initEnd - initStart,
    destroy: destroyEnd - destroyStart,
    total: destroyEnd - initStart
  })
}

runBenchyBtn.addEventListener('click', function () {
  runBenchyBtn.classList.add('hidden')
  progress.classList.remove('hidden')

  document.getElementById('it').innerHTML = 0
  table.querySelector('tbody').innerHTML = ""
  table.querySelector('tfoot').innerHTML = ""

  const num = parseInt(localStorage.getItem("iterations"))
  document.getElementById('num').innerHTML = num;

  console.profile("gcode previewer, create/destroy cycles, " + num + " iterations")

  let benchyResults = Promise.all(([...Array(num)]).map(async (_, it) => {
    result = await runBenchy();
    document.getElementById('it').innerHTML = it + 1;
    return result
  }));

  benchyResults.then ((results) => {
    console.profileEnd();
    printResults(results)
  })

})

function printResults(results) {
  runBenchyBtn.classList.remove('hidden')
  progress.classList.add('hidden')

  const num = results.length

  results.forEach ((row, i)=> {

    let tableRow = document.createElement('tr')
    let iteration = document.createElement('td')
    iteration.innerText = i

    let total = document.createElement('td')
    total.innerText = row.total.toFixed(2)

    let init = document.createElement('td')
    init.innerText = row.init.toFixed(2)

    let process = document.createElement('td')
    process.innerText = row.process.toFixed(2)

    let destroy = document.createElement('td')
    destroy.innerText = row.destroy.toFixed(2)

    tableRow.appendChild(iteration)
    tableRow.appendChild(total)
    tableRow.appendChild(init)
    tableRow.appendChild(process)
    tableRow.appendChild(destroy)

    table.querySelector('tbody').appendChild(tableRow)
  })

  const totalTime = results.map((v) => v.total).reduce((a, b) => a + b, 0)
  const initTime = results.map((v) => v.init).reduce((a, b) => a + b, 0)
  const processTime = results.map((v) => v.process).reduce((a, b) => a + b, 0)
  const destroyTime = results.map((v) => v.destroy).reduce((a, b) => a + b, 0)

  let tableRowSum = document.createElement('tr')

  let sum = document.createElement('td')
  sum.innerText = "Sum"

  let totalSum = document.createElement('td')
  totalSum.innerText = totalTime.toFixed(2)

  let initSum = document.createElement('td')
  initSum.innerText = initTime.toFixed(2)

  let processSum = document.createElement('td')
  processSum.innerText = processTime.toFixed(2)

  let destroySum = document.createElement('td')
  destroySum.innerText = destroyTime.toFixed(2)

  tableRowSum.appendChild(sum)
  tableRowSum.appendChild(totalSum)
  tableRowSum.appendChild(initSum)
  tableRowSum.appendChild(processSum)
  tableRowSum.appendChild(destroySum)

  let tableRowAvg = document.createElement('tr')

  let avg = document.createElement('td')
  avg.innerText = "Average"

  let totalAvg = document.createElement('td')
  totalAvg.innerText = (totalTime / num).toFixed(2)

  let initAvg = document.createElement('td')
  initAvg.innerText = (initTime / num).toFixed(2)

  let processAvg = document.createElement('td')
  processAvg.innerText = (processTime / num).toFixed(2)

  let destroyAvg = document.createElement('td')
  destroyAvg.innerText = (destroyTime/ num).toFixed(2)

  tableRowAvg.appendChild(avg)
  tableRowAvg.appendChild(totalAvg)
  tableRowAvg.appendChild(initAvg)
  tableRowAvg.appendChild(processAvg)
  tableRowAvg.appendChild(destroyAvg)

  table.querySelector('tfoot').appendChild(tableRowAvg)
  table.querySelector('tfoot').appendChild(tableRowSum)

}

iterationsInput.value = localStorage.getItem("iterations");

iterationsInput.addEventListener('change', function() {
  localStorage.setItem("iterations", iterationsInput.value);
})
