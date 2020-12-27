import { Color, LineSegments } from 'three';
declare class GridHelper extends LineSegments {
    constructor(sizeX: number, stepX: number, sizeZ: number, stepZ: number, color1?: Color | string | number, color2?: Color | string | number);
}
export { GridHelper };
