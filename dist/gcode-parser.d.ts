export declare class GCodeCommand {
    gcode?: string;
    comment?: string;
    constructor(gcode?: string, comment?: string);
}
export declare class MoveCommand extends GCodeCommand {
    params: MoveCommandParams;
    constructor(gcode: string, params: MoveCommandParams, comment?: string);
}
declare type MoveCommandParamName = 'x' | 'y' | 'z' | 'e' | 'f';
declare type MoveCommandParams = {
    [key in MoveCommandParamName]?: number;
};
export declare class Layer {
    layer: number;
    commands: GCodeCommand[];
    constructor(layer: number, commands: GCodeCommand[]);
}
export declare class Thumb {
    thumbInfo: string;
    infoParts: string[];
    size: string;
    sizeParts: string[];
    width: number;
    height: number;
    charLength: number;
    chars: string;
    constructor(thumbInfo: string);
    get src(): string;
}
export declare class Parser {
    layers: Layer[];
    currentLayer: Layer;
    curZ: number;
    maxZ: number;
    metadata: {
        thumbnails: Map<string, Thumb>;
    };
    parseMetadata: boolean;
    parseGcode(input: string | string[]): {
        layers: Layer[];
        thumbs: Map<string, Thumb>;
    };
    private lines2commands;
    parseCommand(line: string, keepComments?: boolean, parseMetadata?: boolean): GCodeCommand | null;
    parseMove(params: string[]): MoveCommandParams;
    groupIntoLayers(commands: MoveCommand[]): Layer[];
    processMetadata(metadata: GCodeCommand[]): Map<string, Thumb>;
}
export {};
