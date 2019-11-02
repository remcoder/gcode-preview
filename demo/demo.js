let gcodePreview;

const slider = document.getElementById('layers');
const scaleSlider = document.getElementById('scale');
const rotationSlider = document.getElementById('rotation');
const toggleAnimation = document.getElementById('toggle-animation');
const toggleZoneColors = document.getElementById('zone-colors');
const lineWidth = document.getElementById('line-width');

function initDemo() {
    const preview = new GCodePreview.WebGlPreview({
        targetId : 'renderer',
        scale: 7,
        lineWidth: 0.6
    });

    info(preview.canvas);

    slider.addEventListener('input', function(evt) {
        preview.limit = +slider.value;
        preview.render();
    });

    scaleSlider.addEventListener('input', function(evt) {
        preview.scale = +scaleSlider.value;
        preview.render();
    });


    window.addEventListener('resize', function() {
        preview.resize();
    });

    // preview.canvas.addEventListener('dragover', function(evt) {
    //     evt.stopPropagation()
    //     evt.preventDefault()
    //     evt.dataTransfer.dropEffect = 'copy'
    // });

    // preview.canvas.addEventListener('drop', function(evt) {
    //     evt.stopPropagation()
    //     evt.preventDefault()
    //     const files = evt.dataTransfer.files
    //     const file = files[0]
    //     loadGCode(file);
    // });

    // toggleZoneColors.addEventListener('click', function() {
    //     preview.zoneColors = toggleZoneColors.checked;
    //     preview.render();
    // });

    gcodePreview = preview;
    
    // updateUI();
    
    return preview;
}

function updateUI() {
    slider.setAttribute('max', gcodePreview.limit);
    slider.value = gcodePreview.limit;

    // if (gcodePreview.header && !!GCodePreview.Colors[gcodePreview.header.slicer]) {
    //     toggleZoneColors.removeAttribute('disabled');
    // }
    // else {
    //     toggleZoneColors.checked = false;
    //     toggleZoneColors.setAttribute('disabled', 'disabled');
    //     gcodePreview.zoneColors = false;
    // }

    const layerCount = document.getElementById('layer-count');
    layerCount.innerText = gcodePreview.layers && gcodePreview.layers.length + ' layers';
}

function loadGCode(file) {
    gcodePreview.clear();

    loading(gcodePreview.canvas);

    const reader = new FileReader();
    const fileInfo = document.getElementById('file-info');
    fileInfo.innerText = file.name + ': ' + file.size + " bytes";

    reader.onload = function(e) {
        gcodePreview.processGCode(reader.result);
        // const slider = document.getElementById('layers');
        slider.setAttribute('max', gcodePreview.limit);
        slider.value = gcodePreview.limit;

        if (!!GCodePreview.Colors[gcodePreview.header.slicer]) {
            toggleZoneColors.removeAttribute('disabled');
        }
        else {
            toggleZoneColors.checked = false;
            toggleZoneColors.setAttribute('disabled', 'disabled');
            gcodePreview.zoneColors = false;
        }
    }
    reader.readAsText(file);
}

function backgroundText(canvas, text, x,y, fontSize) {
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.translate(canvas.width/2,canvas.height/2);
    // ctx.rotate(rotation * Math.PI / 180);
    ctx.fillStyle = '#ccc';
    ctx.font = fontSize + 'px Verdana';
    ctx.fillText(text, x, y);
    ctx.restore();
}

function title(canvas) {
    //backgroundText(canvas, 'GCode previewer', -300, -150, 72);
}

function info(canvas) {
    //backgroundText(canvas, 'Drop a .gcode file here', -210, 165, 36);
}

function loading(canvas) {
    //backgroundText(canvas, 'Loading..', -90, 165, 42);
}
