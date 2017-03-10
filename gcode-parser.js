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

