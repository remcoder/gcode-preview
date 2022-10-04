import { Thumbnail } from './thumbnail';
declare type singleLetter = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h' | 'i' | 'j' | 'k' | 'l' | 'm' | 'n' | 'o' | 'p' | 'q' | 'r' | 's' | 't' | 'u' | 'v' | 'w' | 'x' | 'y' | 'z' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L' | 'M' | 'N' | 'O' | 'P' | 'Q' | 'R' | 'S' | 'T' | 'U' | 'V' | 'W' | 'X' | 'Y' | 'Z';
declare type CommandParams = {
    [key in singleLetter]?: number;
};
declare type MoveCommandParamName = 'x' | 'y' | 'z' | 'e' | 'f';
declare type MoveCommandParams = {
    [key in MoveCommandParamName]?: number;
};
export declare class GCodeCommand {
    src: string;
    gcode: string;
    params: CommandParams;
    comment?: string;
    constructor(src: string, gcode: string, params: CommandParams, comment?: string);
}
export declare class MoveCommand extends GCodeCommand {
    params: MoveCommandParams;
    constructor(src: string, gcode: string, params: MoveCommandParams, comment?: string);
}
declare type Metadata = {
    thumbnails: Record<string, Thumbnail>;
};
export declare class Layer {
    layer: number;
    commands: GCodeCommand[];
    lineNumber: number;
    constructor(layer: number, commands: GCodeCommand[], lineNumber: number);
}
export declare class GCodeParser {
    lines: string[];
    preamble: Layer;
    layers: Layer[];
    currentLayer: Layer;
    curZ: number;
    maxZ: number;
    metadata: Metadata;
    parseGCode(input: string | string[]): {
        layers: Layer[];
        metadata: Metadata;
    };
    private lines2commands;
    private parseCommand;
    private parseMove;
    private isAlpha;
    private parseParams;
    private groupIntoLayers;
    parseMetadata(metadata: GCodeCommand[]): Metadata;
}
export {};
