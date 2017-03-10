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

class GCodePreview {
    constructor(opts) {
        this.targetId = opts.targetId;
        this.limit = opts.limit;
        this.scale = opts.scale;
        this.rotation = opts.rotation === undefined ? 0 : opts.rotation;
        this.rotationAnimation = opts.rotationAnimation;
        this.zoneColors = opts.zoneColors;

        const target = document.getElementById(this.targetId);
        if (!target) throw new Error('Unable to find element ' + targetId);

        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        target.appendChild(this.canvas);
        this.resize();
    }

    resize (canvas) {
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight;
    }

    getZoneColor(zone, layerIndex) {

        const brightness = Math.round(layerIndex/this.layers.length * 80);
        if (!this.zoneColors)
            return 'hsl(0, 0%, '+brightness+'%)';

        const colors = Colors[this.header.slicer];
        return colors[zone];
    }

    renderZone(l, layerIndex) {
        this.ctx.strokeStyle = this.getZoneColor(l.zone, layerIndex);
        this.ctx.beginPath();
        for (const cmd of l.commands) {
            if (cmd.g == 0)
                this.ctx.moveTo(cmd.x, cmd.y)
            else if (cmd.g == 1)
                this.ctx.lineTo(cmd.x, cmd.y)
        }
        this.ctx.stroke();
    }


    drawLayer(index, limit) {
        if (index > limit) return;

        const layer = this.layers[index];
        const offset = 0.1 * index;

        this.ctx.save();

        this.ctx.scale(this.scale, this.scale);
        this.ctx.translate(0, offset);
        this.ctx.rotate(this.rotation * Math.PI / 180);

        // center model
        const center = getCenter(this.layers[0]);
        this.ctx.translate(-center.x, -center.y);

        // draw zones
        for (const zone of layer.zones) {
            this.renderZone(zone, index);
        }
        this.ctx.restore();
    }

    render() {
        // reset
        this.canvas.width = this.canvas.width;
        this.ctx.lineWidth = 0.1;

        // info();

        this.ctx.scale(1,-1);

        // center on 0,0
        this.ctx.translate(this.canvas.width/2,-this.canvas.height/2);

        for (let index=0 ; index < this.layers.length ; index++ ) {
            this.drawLayer(index, this.limit);
        }
    }

    processGCode(gcode) {
        console.time('parsing');
        const { header, layers, limit } = parseGcode(gcode);
        console.timeEnd('parsing');

        this.header = header;
        this.layers = layers;
        this.limit = limit;

        console.time('rendering');
        this.render();
        console.timeEnd('rendering');
    }

    animationLoop() {
        if (!this.rotationAnimation) return;
        requestAnimationFrame(this.animationLoop.bind(this));

        this.rotation += 2;
        this.rotation %= 360;
        // rotationSlider.value = rotation;
        this.render();
    }

    startAnimation() {
        this.rotationAnimation = true;
        // rotationSlider.setAttribute('disabled', 'disabled');
        this.animationLoop();
    }
    stopAnimation() {
        this.rotationAnimation = false;
        // rotationSlider.removeAttribute('disabled');
    }
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

