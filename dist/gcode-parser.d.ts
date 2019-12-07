export declare abstract class GCodeCommand {
    gcode?: string;
    comment?: string;
    constructor(gcode?: string, comment?: string);
}
export declare class MoveCommand extends GCodeCommand {
    params: MoveCommandParams;
    constructor(gcode: string, params: MoveCommandParams, comment?: string);
}
declare type MoveCommandParamName = "x" | "y" | "z" | "e";
declare type MoveCommandParams = {
    [key in MoveCommandParamName]?: number;
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
    parseCommand(line: string, keepComments?: boolean): GCodeCommand | null;
    parseMove(params: string[]): MoveCommandParams;
    groupIntoLayers(commands: GCodeCommand[]): Layer[];
    parseGcode(input: string | string[]): {
        layers: Layer[];
    };
    private lines2commands;
}
export {};
