function initCanvas() {
    var canvas = document.getElementById('renderer');
    var ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    return [canvas, ctx];
}

function title() {
    ctx.save()
    ctx.scale(1,-1)
    ctx.fillStyle = 'rgba(255,128,128,0.5)';
    ctx.font = '72px Verdana'
    ctx.fillText("GCode preview", -275,-120)
    ctx.restore();
}

function info() {
    ctx.save()
    ctx.scale(1,-1)
    ctx.fillStyle = 'rgba(255,128,128,0.5)';
    ctx.font = '36px Verdana'
    ctx.fillText("Drop a .gcode file here", -210,165)
    ctx.restore();
}

function loading() {
    ctx.save()
    ctx.scale(1,-1)
    ctx.fillStyle = 'rgba(255,128,128,0.5)';
    ctx.font = '42px Verdana'
    ctx.fillText("Loading..", -70,0)
    ctx.restore();
}

function grid(columnWidth, rowWidth, color) {
    ctx.save()
    ctx.scale(scale, scale);
    ctx.fillStyle = color;
    const columns = Math.round(canvas.width/columnWidth);
    const rows = Math.round(canvas.height/rowWidth);

    for(var column = -columns ; column < columns ; column++) {
        for(var row = -rows ; row < rows ; row++) {
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

function groupIntoZones(commands) {
    const zones = [{commands: []}];
    var currentZone = zones[0];

    for(const cmd of commands) {
        if (cmd.comment && cmd.comment.startsWith('TYPE:') ) {
            currentZone = {zone: cmd.comment.slice(5).toLowerCase(), commands: [] };
            // console.log(currentZone.zone);
            zones.push(currentZone);
            continue;
        }

        currentZone.commands.push(cmd);
    }

    return zones;
}

function groupIntoLayers(commands) {
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
            // console.log(currentLayer.layer);
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
    const layers = groupIntoLayers(commands);

    for (let layer of layers) {
        layer.zones = groupIntoZones(layer.commands);
    }
    // console.log(layers);
    return { header, layers };
}

function parseHeader(commands) {
    const comments = commands.filter(cmd => cmd.comment).map(cmd => cmd.comment);
    const slicer = comments
        .filter(com => /(G|g)enerated/.test(com) )
        .map(com => {
            console.log(com)
            if(com.includes('Slic3r'))
                return 'Slic3r';
            if (com.includes('Simplify3D'))
                return 'Simplify3D';
            if (com.includes('Cura_SteamEngine'))
                return 'Cura_SteamEngine';
        })[0];
    // console.log('slicer', slicer);
    return {
        slicer
    };
}

function renderZone(l, layerIndex) {
    // console.log(l.zone)
    const brightness = Math.round(layerIndex/layers.length * 100);
    ctx.strokeStyle = colors[l.zone] || 'hsl(0, 0%, '+brightness+'%)';
    ctx.beginPath();
    for (cmd of l.commands) {
        // console.log(cmd);
        if (cmd.g == 0)
            ctx.moveTo(cmd.x, cmd.y)
        else if (cmd.g == 1)
            ctx.lineTo(cmd.x, cmd.y)
    }
    ctx.stroke();
}

function renderLayers(layers, limit, animate) {
    const center = getCenter(layers[0]);
    // const size = getSize(layers[0]);
    // const screenSize = Math.max(innerHeight, innerWidth);

    // reset
    canvas.width = canvas.width;

    // make y go up
    ctx.scale(1,-1);

    // center on 0,0
    ctx.translate(canvas.width/2,-canvas.height/2);

    // draw background
    grid(columnWidth, rowWidth, '#ddd');

    title();
    info();

    ctx.scale(scale, scale);
    ctx.lineWidth = 0.1;

    // center model (doesn't work that goe)
    ctx.translate(-center.x, -center.y);


    if (animate)
        animateLayers(0, limit, layers);
    else
        for (let [index, layer] of layers.entries()) {
            if (index > limit) return;
            const offset = 0.1 * index;
            ctx.save();
            ctx.translate(offset, offset);
            for (zone of layer.zones) {
                renderZone(zone, index);
            }
            ctx.restore();
        }

}

function animateLayers(index, limit, layers) {
    if (index > limit) return;
    const layer = layers[index];
    if (!layer) return;
    const offset = 0.1 * index;
    ctx.save();
    ctx.translate(offset, offset);
    for (zone of layer.zones) {
        renderZone(zone, index);
    }
    ctx.restore();

    setTimeout(function() {
        animateLayers(index+1, limit, layers);
    },16.6)
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
    // console.log(bounds);

    return {
        x : bounds.minX + (bounds.maxX - bounds.minX) / 2,
        y : bounds.minY + (bounds.maxY - bounds.minY) / 2
    };
}

function getSize(layer) {
    const bounds = getOuterBounds(layer);

    const sizeX = bounds.maxX - bounds.minX;
    const sizeY = bounds.maxY - bounds.minY;
    // console.log(sizeX,sizeY);
    return Math.min(sizeX, sizeY);
}

function processGCode(gcode) {
    console.time('parsing');
    ({ header, layers } = parseGcode(gcode));
    console.timeEnd('parsing');

    console.log('layers', layers.length)

    console.time('rendering');
    renderLayers(layers, layers.length, true);
    // ctx.fillRect(center.x,center.y,10,10)
    console.timeEnd('rendering');
    var slider = document.getElementById('layers');
    slider.setAttribute('max', layers.length);
    // slider.setAttribute('value', layers.length);
    slider.value = layers.length;
}

function loadGCode(file) {
    console.log(file.name, file.size + " bytes")
    const reader = new FileReader();

    reader.onload = function(e) {
        processGCode(reader.result);
    }
    reader.readAsText(file);
}

function initEvents() {
    const slider = document.getElementById('layers');
    slider.addEventListener('input', function(evt) {
        renderLayers(layers, slider.value, false);
    });

    const scaleSlider = document.getElementById('scale');
    scaleSlider.addEventListener('input', function(evt) {
        scale = +scaleSlider.value;
        renderLayers(layers, slider.value, false);
    });

    window.addEventListener('resize', function() {
        canvas.width = innerWidth;
        canvas.height = innerHeight;
        renderLayers(layers, slider.value, false);
    });

    canvas.addEventListener(
    'dragover',
    function handleDragOver(evt) {
        evt.stopPropagation()
        evt.preventDefault()
        evt.dataTransfer.dropEffect = 'copy'
    });

    canvas.addEventListener(
    'drop',
    function(evt) {
        evt.stopPropagation()
        evt.preventDefault()
        const files = evt.dataTransfer.files
        const file = files[0]
        loadGCode(file);
    });
}

const G0 = 'G0';
const G1 = 'G1';

const colors = {
    skirt : 'lime',
    'wall-inner' : 'purple',
    'wall-outer' : 'blue',
    skin : 'red',
    fill : 'orange',
    support: 'rgba(255,255,255,0.5)'
};
const columnWidth = 25, rowWidth = 25;
let layers, header;
