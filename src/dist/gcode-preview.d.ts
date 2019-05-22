import Colors from "./gcode-colors";
import { Parser, Layer } from "./gcode-parser";
export { Colors };
export declare class Preview {
    limit: number;
    rotation: number;
    rotationAnimation: Boolean;
    scale: number;
    zoneColors: Boolean;
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    targetId: string;
    layers: Layer[];
    header: {
        slicer: string;
    };
    center: {
        x: number;
        y: number;
    };
    parser: Parser;
    maxProjectionOffset: {
        x: number;
        y: number;
    };
    constructor(opts: any);
    clear(): void;
    resize(): void;
    getZoneColor(zone: any, layerIndex: any): any;
    renderZone(l: any, layerIndex: any): void;
    drawLayer(index: any, limit: any): void;
    render(): void;
    processGCode(gcode: any): void;
    animationLoop(): void;
    startAnimation(): void;
    stopAnimation(): void;
    getOuterBounds(layer: any): {
        minX: number;
        maxX: number;
        minY: number;
        maxY: number;
    };
    getCenter(layer: any): {
        x: number;
        y: number;
    };
    getAdjustedCenter(): {
        x: number;
        y: number;
    };
    getSize(layer?: Layer): {
        sizeX: number;
        sizeY: number;
    };
    drawBounds(layer: any): void;
    autoscale(): any;
    projectIso(point: {
        x: number;
        y: number;
    }, layerIndex: number): {
        x: number;
        y: number;
    };
}
