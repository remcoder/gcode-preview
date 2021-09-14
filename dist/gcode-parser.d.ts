import { Thumbnail } from './thumbnail';
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
declare type Metadata = {
    thumbnails: Record<string, Thumbnail>;
};
export declare class Layer {
    layer: number;
    commands: GCodeCommand[];
    constructor(layer: number, commands: GCodeCommand[]);
}
export declare class Parser {
    layers: Layer[];
    currentLayer: Layer;
    curZ: number;
    maxZ: number;
    metadata: Metadata;
    parseGcode(input: string | string[]): {
        layers: Layer[];
        metadata: Metadata;
    };
    private lines2commands;
    parseCommand(line: string, keepComments?: boolean): GCodeCommand | null;
    parseMove(params: string[]): MoveCommandParams;
    groupIntoLayers(commands: MoveCommand[]): Layer[];
    parseMetadata(metadata: GCodeCommand[]): Metadata;
}
export {};
