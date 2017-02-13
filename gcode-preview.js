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
    ctx.fillStyle = color;
    for(var column = -canvas.width ; column < canvas.width ; column += columnWidth) {
        for(var row = -canvas.height ; row < canvas.height ; row += rowWidth) {
            if ((row+column) % 2)
                ctx.fillRect(column, row, columnWidth, rowWidth);
        }
    }
}
function parseLine(line) {
    const values = line.split(' ');
    const cmd = {};
    values.forEach( v => {
        cmd[ v.slice(0,1).toLowerCase() ] = +v.slice(1);
    });
    return cmd;
}

function groupIntoZones(lines) {
    const zones = [{lines: []}];
    var currentZone = zones[0];

    for(const l of lines) {
        if (l.startsWith(';TYPE:') ) {
            currentZone = {zone: l.slice(6).toLowerCase(), lines: [] };
            // console.log(currentZone.zone);
            zones.push(currentZone);
            continue;
        }

        currentZone.lines.push(l);
    }

    return zones;
}

function groupIntoLayers(lines) {
    const layers = [];
    var currentLayer;

    for(const l of lines) {
        if (l.startsWith(';LAYER:') ) {
            currentLayer = {layer: parseInt(l.slice(7), 10), lines: [] };
            // console.log(currentLayer.layer);
            layers.push(currentLayer);
            continue;
        }
        if (currentLayer)
            currentLayer.lines.push(l);
    }

    return layers;
}

function parseGcode(input) {
    const lines = input
        .split('\n')
        .filter(l => l.length>0); // discard empty lines

    const layers = groupIntoLayers(lines);
    for (layer of layers) {
        layer.zones = groupIntoZones(layer.lines);
    }
    // console.log(layers);

    layers.forEach(l => l.zones.forEach(z => z.commands = z.lines.map(parseLine)));

    return layers;
}

function renderZone(l) {
    // console.log(l.zone)
    ctx.strokeStyle = colors[l.zone];
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
    const scale = 5;

    // reset
    canvas.width = canvas.width;

    // make y go up
    ctx.scale(1,-1);

    // center on 0,0
    ctx.translate(canvas.width/2,-canvas.height/2);

    // draw background
    ctx.save()
    ctx.scale(scale, scale);
    grid(columnWidth, rowWidth, '#ddd');
    ctx.restore();
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
                renderZone(zone);
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
        renderZone(zone);
    }
    ctx.restore();

    setTimeout(function() {
        animateLayers(index+1, limit, layers);
    },16.6)
}

function getOuterBounds() {
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
    layers = parseGcode(gcode);
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
    slider.addEventListener('change', function(evt) {
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
        const files = evt.dataTransfer.files  // FileList object.
        const file = files[0]                 // File     object.
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
