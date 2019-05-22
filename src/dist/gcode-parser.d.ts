export interface Layer {
    layer: number;
    commands: any[];
    zones: any[];
}
export declare class Parser {
    parseLine(line: any, index: any): any;
    getZone(cmd: any, header: any): string | null;
    groupIntoZones(commands: any, header: any): {
        zone: any;
        commands: any[];
    }[];
    groupIntoLayers(commands: any[], header: any): Layer[];
    parseGcode(input: any): {
        header: {
            slicer: any;
        };
        layers: Layer[];
        limit: number;
    };
    parseHeader(commands: any): {
        slicer: any;
    };
}
