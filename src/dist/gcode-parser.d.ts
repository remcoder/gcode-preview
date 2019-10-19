export declare abstract class GCodeCommand {
    gcode?: string;
    comment?: string;
    constructor(gcode?: string, comment?: string);
}
export declare class MoveCommand extends GCodeCommand {
    params: MoveCommandParams;
    constructor(gcode: string, params: MoveCommandParams, comment?: string);
}
declare type MoveCommandParams = {
    x?: number;
    y?: number;
    z?: number;
    e?: number;
};
export interface Layer {
    layer: number;
    commands: GCodeCommand[];
}
export declare class Parser {
    parseCommand(line: string, keepComments?: boolean): GCodeCommand | null;
    parseMove(params: string[]): MoveCommandParams;
    groupIntoLayers(commands: GCodeCommand[], header: any): Layer[];
    parseGcode(input: any): {
        header: {
            slicer: string;
        };
        layers: Layer[];
        limit: number;
    };
    parseHeader(commands: GCodeCommand[]): {
        slicer: string;
    };
}
export {};
