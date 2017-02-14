
const Colors = {
    Cura_SteamEngine : {
        skirt : 'lime',
        'wall-inner' : 'purple',
        'wall-outer' : 'blue',
        skin : 'red',
        fill : 'orange',
        support: 'rgba(255,255,255,0.5)'
    },
    Simplify3D : {
        skirt : 'lime',
        'inner perimeter' : 'purple',
        'outer perimeter' : 'blue',
        skin : 'solid layer',
        fill : 'infill',
        support: 'rgba(255,255,255,0.5)'
    }
};

function initCanvas() {
    const canvas = document.getElementById('renderer');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    return [canvas, ctx];
}

function backgroundText(text, x,y, fontSize) {
    ctx.save();
    // ctx.rotate(rotation * Math.PI / 180);
    ctx.scale(1,-1);
    ctx.fillStyle = '#ccc';
    ctx.font = fontSize + 'px Verdana';
    ctx.fillText(text, x, y);
    ctx.restore();
}

function title() {
    backgroundText('GCode previewer', -300, -150, 72);
}

function info() {
    backgroundText('Drop a .gcode file here', -210, 165, 36);
}

function loading() {
    backgroundText('Loading..', -90, 165, 42);
}

function grid() {
    const columnWidth = 25, rowWidth = 25;
    const columns = Math.round(canvas.width/columnWidth);
    const rows = Math.round(canvas.height/rowWidth);

    ctx.save();
    ctx.scale(scale, scale);
    ctx.rotate(rotation * Math.PI / 180);
    ctx.fillStyle = '#eee';

    for(let column = -columns ; column < columns ; column++) {
        for(let row = -rows ; row < rows ; row++) {
            if ((row+column) % 2)
                ctx.fillRect(column * columnWidth,
                    row * rowWidth,
                    columnWidth,
                    rowWidth);
        }
    }
    ctx.restore();
}

function parseLine(line, index) {
    const cmd = {};
    if (line.startsWith(';'))
        cmd.comment = line.slice(1);
    else {
        const values = line.split(' ');

        values.forEach( v => {
            cmd[ v.slice(0,1).toLowerCase() ] = +v.slice(1);
        });
    }
    return cmd;
}

function getZone(cmd, header) {
    if (header.slicer == 'Cura_SteamEngine')
        if (cmd.comment.startsWith('TYPE:'))
            return cmd.comment.slice(5).toLowerCase();

    if (header.slicer == 'Simplify3D')
        for (let zoneType of Object.keys(Colors.Simplify3D)) {
            if (cmd.comment.includes(zoneType))
                return zoneType;
        }

    // Slic3r gcode doesn't seem to carry info about zones

    return null;
}

function groupIntoZones(commands, header) {
    const zones = [{commands: []}];
    let currentZone = zones[0];

    for(const cmd of commands) {
        if (cmd.comment) {
            const zone  = getZone(cmd, header);
            if (zone) {
                currentZone = {zone: zone, commands: [] };
                zones.push(currentZone);
                continue;
            }
        }

        currentZone.commands.push(cmd);
    }

    return zones;
}

function groupIntoLayers(commands, header) {
    const layers = [];
    let currentLayer;
    let maxZ = 0;
    const firstLayerMaxZ = 1;

    for(const cmd of commands) {
        // create a new layer when
        // 1. z movement is detected
        // 2. the z movement reaches a new height (allows up/down movement within a layer)
        // 3. the first z movement isn't higher than 1 (keeps initial high z movement from being interpreted as a layer floatin in the air)
        if (cmd.z && (cmd.z > maxZ && (maxZ != 0 || cmd.z < firstLayerMaxZ))) {
            maxZ = cmd.z;
            currentLayer = {layer: layers.length, commands: [] };
            layers.push(currentLayer);
            continue;
        }
        if (currentLayer)
            currentLayer.commands.push(cmd);
    }

    return layers;
}

function parseGcode(input) {
    const lines = input
        .split('\n')
        .filter(l => l.length>0); // discard empty lines

    const commands = lines.map(parseLine);
    const header = parseHeader(commands);
    const layers = groupIntoLayers(commands, header);
    const limit = layers.length - 1;

    for (let layer of layers) {
        layer.zones = groupIntoZones(layer.commands, header);
    }
    return { header, layers, limit };
}

function parseHeader(commands) {
    const comments = commands.filter(cmd => cmd.comment).map(cmd => cmd.comment);
    const slicer = comments
        .filter(com => /(G|g)enerated/.test(com) )
        .map(com => {
            if(com.includes('Slic3r'))
                return 'Slic3r';
            if (com.includes('Simplify3D'))
                return 'Simplify3D';
            if (com.includes('Cura_SteamEngine'))
                return 'Cura_SteamEngine';
        })[0];

    return {
        slicer
    };
}

function getZoneColor(zone, layerIndex) {

    const brightness = Math.round(layerIndex/layers.length * 100);
    if (!zoneColors)
        return 'hsl(0, 0%, '+brightness+'%)';

    const colors = Colors[header.slicer];
    return colors[zone];
}

function renderZone(l, layerIndex) {
    ctx.strokeStyle = getZoneColor(l.zone, layerIndex);
    ctx.beginPath();
    for (let cmd of l.commands) {
        if (cmd.g == 0)
            ctx.moveTo(cmd.x, cmd.y)
        else if (cmd.g == 1)
            ctx.lineTo(cmd.x, cmd.y)
    }
    ctx.stroke();
}

function render() {
    // reset
    canvas.width = canvas.width;
    ctx.lineWidth = 0.1;

    // make y go up
    ctx.scale(1,-1);

    // center on 0,0
    ctx.translate(canvas.width/2,-canvas.height/2);

    // draw background
    // grid();
    // title();
    info();

    for (let index=0 ; index < layers.length ; index++ ) {
        drawLayer(index, limit);
    }
}

function drawLayer(index, limit) {
    if (index > limit) return;

    const layer = layers[index];
    const offset = 0.1 * index;

    ctx.save();
    ctx.scale(scale, scale);
    ctx.translate(0, offset);
    ctx.rotate(rotation * Math.PI / 180);

    // center model
    const center = getCenter(layers[0]);
    ctx.translate(-center.x, -center.y);

    // draw zones
    for (zone of layer.zones) {
        renderZone(zone, index);
    }
    ctx.restore();
}

function getOuterBounds(layer) {
    let minX = Infinity,
        maxX = -Infinity,
        minY = Infinity,
        maxY = -Infinity;

    outer:
    for(let zone of layer.zones) {
        inner:
        for(let cmd of zone.commands) {
            if (cmd.g == 91) break outer; // quick hack to detect we're at the end
            if (cmd.g != 0 && cmd.g != 1) continue inner;
            if (cmd.x < minX) minX = cmd.x;
            if (cmd.x > maxX) maxX = cmd.x;
            if (cmd.y < minY) minY = cmd.y;
            if (cmd.y > maxY) maxY = cmd.y;
        }
    }

    return {
        minX,
        maxX,
        minY,
        maxY
    };
}

function getCenter(layer) {
    const bounds = getOuterBounds(layer);

    return {
        x : bounds.minX + (bounds.maxX - bounds.minX) / 2,
        y : bounds.minY + (bounds.maxY - bounds.minY) / 2
    };
}

function getSize(layer) {
    const bounds = getOuterBounds(layer);

    const sizeX = bounds.maxX - bounds.minX;
    const sizeY = bounds.maxY - bounds.minY;
    return Math.min(sizeX, sizeY);
}

function processGCode(gcode) {
    console.time('parsing');
    ({ header, layers, limit } = parseGcode(gcode));
    console.timeEnd('parsing');

    const layerCount = document.getElementById('layer-count');
    layerCount.innerText = layers.length + ' layers';

    // const slider = document.getElementById('layers');
    slider.setAttribute('max', limit);
    slider.value = limit;

    if (!!Colors[header.slicer]) {
        toggleZoneColors.removeAttribute('disabled');
    }
    else {
        toggleZoneColors.checked = false;
        toggleZoneColors.setAttribute('disabled', 'disabled');
        zoneColors = false;
    }

    console.time('rendering');
    render();
    console.timeEnd('rendering');
}

function loadGCode(file) {
    const reader = new FileReader();
    const fileInfo = document.getElementById('file-info');
    fileInfo.innerText = file.name + ': ' + file.size + " bytes";

    reader.onload = function(e) {
        processGCode(reader.result);
    }
    reader.readAsText(file);
}

function animationLoop() {
    if (!rotationAnimation) return;
    requestAnimationFrame(animationLoop);

    rotation += 2;
    rotation %= 360;
    rotationSlider.value = rotation;
    render();
}

function startAnimation() {
    rotationAnimation = true;
    rotationSlider.setAttribute('disabled', 'disabled');
    animationLoop();
}
function stopAnimation() {
    rotationAnimation = false;
    rotationSlider.removeAttribute('disabled');
}

const slider = document.getElementById('layers');
const scaleSlider = document.getElementById('scale');
const rotationSlider = document.getElementById('rotation');
const toggleAnimation = document.getElementById('toggle-animation');
const toggleZoneColors = document.getElementById('zone-colors');

function initEvents() {
    slider.addEventListener('input', function(evt) {
        limit = +slider.value;
        render();
    });

    scaleSlider.addEventListener('input', function(evt) {
        scale = +scaleSlider.value;
        render();
    });

    rotationSlider.addEventListener('input', function(evt) {
        rotation = +rotationSlider.value;
        render();
    })

    window.addEventListener('resize', function() {
        canvas.width = innerWidth;
        canvas.height = innerHeight;
        render();
    });

    canvas.addEventListener('dragover', function(evt) {
        evt.stopPropagation()
        evt.preventDefault()
        evt.dataTransfer.dropEffect = 'copy'
    });

    canvas.addEventListener('drop', function(evt) {
        evt.stopPropagation()
        evt.preventDefault()
        const files = evt.dataTransfer.files
        const file = files[0]
        loadGCode(file);
    });

    toggleAnimation.addEventListener('click', function() {
        rotationAnimation ? stopAnimation() : startAnimation();
    });

    toggleZoneColors.addEventListener('click', function() {
        zoneColors = toggleZoneColors.checked;
        render();
    });
}
