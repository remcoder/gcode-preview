import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Scene, PerspectiveCamera, WebGLRenderer, Group } from 'three';

declare class Thumbnail {
    size: string;
    width: number;
    height: number;
    charLength: number;
    chars: string;
    static parse(thumbInfo: string): Thumbnail;
    get src(): string;
    get isValid(): boolean;
}

declare type singleLetter = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h' | 'i' | 'j' | 'k' | 'l' | 'm' | 'n' | 'o' | 'p' | 'q' | 'r' | 's' | 't' | 'u' | 'v' | 'w' | 'x' | 'y' | 'z' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L' | 'M' | 'N' | 'O' | 'P' | 'Q' | 'R' | 'S' | 'T' | 'U' | 'V' | 'W' | 'X' | 'Y' | 'Z';
declare type CommandParams = {
    [key in singleLetter]?: number;
};
declare class GCodeCommand {
    src: string;
    gcode: string;
    params: CommandParams;
    comment?: string;
    constructor(src: string, gcode: string, params: CommandParams, comment?: string);
}
declare type Metadata = {
    thumbnails: Record<string, Thumbnail>;
};
declare class Layer {
    layer: number;
    commands: GCodeCommand[];
    lineNumber: number;
    constructor(layer: number, commands: GCodeCommand[], lineNumber: number);
}
declare class Parser {
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
interface Parser {
    parseGcode: typeof Parser.prototype.parseGCode;
}

declare type RenderLayer = {
    extrusion: number[];
    travel: number[];
    z: number;
};
declare type Vector3 = {
    x: number;
    y: number;
    z: number;
};
declare type Point = Vector3;
declare type BuildVolume = Vector3;
declare type GCodePreviewOptions = {
    canvas?: HTMLCanvasElement;
    endLayer?: number;
    startLayer?: number;
    targetId?: string;
    topLayerColor?: number;
    lastSegmentColor?: number;
    lineWidth?: number;
    buildVolume?: BuildVolume;
    initialCameraPosition?: number[];
    debug?: boolean;
    allowDragNDrop?: boolean;
};
declare class WebGLPreview {
    parser: Parser;
    targetId: string;
    scene: Scene;
    camera: PerspectiveCamera;
    renderer: WebGLRenderer;
    group: Group;
    backgroundColor: number;
    travelColor: number;
    extrusionColor: number;
    topLayerColor?: number;
    lastSegmentColor?: number;
    container: HTMLElement;
    canvas: HTMLCanvasElement;
    renderExtrusion: boolean;
    renderTravel: boolean;
    lineWidth?: number;
    startLayer?: number;
    endLayer?: number;
    singleLayerMode: boolean;
    buildVolume: BuildVolume;
    initialCameraPosition: number[];
    debug: boolean;
    allowDragNDrop: boolean;
    controls: OrbitControls;
    private disposables;
    constructor(opts: GCodePreviewOptions);
    get layers(): Layer[];
    get maxLayerIndex(): number;
    get minLayerIndex(): number;
    animate(): void;
    processGCode(gcode: string | string[]): void;
    render(): void;
    drawBuildVolume(): void;
    clear(): void;
    resize(): void;
    addLineSegment(layer: RenderLayer, p1: Point, p2: Point, extrude: boolean): void;
    addArcSegment(layer: RenderLayer, p1: Point, p2: Point, extrude: boolean): void;
    addLine(vertices: number[], color: number): void;
    addThickLine(vertices: number[], color: number): void;
    private _enableDropHandler;
    _readFromStream(stream: ReadableStream): Promise<void>;
}

declare const init: (opts: GCodePreviewOptions) => WebGLPreview;

export { WebGLPreview, init };
