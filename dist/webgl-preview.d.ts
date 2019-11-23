import { Parser, Layer } from './gcode-parser';
import * as THREE from 'three';
declare type RenderLayer = {
    extrusion: number[];
    travel: number[];
    z: number;
};
declare type Point = {
    x: number;
    y: number;
    z: number;
};
declare type WebGLPreviewOptions = Partial<{
    limit: number;
    targetId: string;
}>;
export declare class WebGLPreview implements WebGLPreviewOptions {
    parser: Parser;
    limit: number;
    targetId: string;
    layers: Layer[];
    header: {
        slicer: string;
    };
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    group: THREE.Group;
    backgroundColor: number;
    travelColor: number;
    extrusionColor: number;
    container: HTMLElement;
    canvas: HTMLCanvasElement;
    renderExtrusion: boolean;
    renderTravel: boolean;
    constructor(opts: WebGLPreviewOptions);
    animate(): void;
    processGCode(gcode: string): void;
    render(): void;
    resize(): void;
    addLineSegment(layer: RenderLayer, p1: Point, p2: Point, extrude: boolean): void;
    addLine(vertices: number[], color: number): void;
}
export {};
