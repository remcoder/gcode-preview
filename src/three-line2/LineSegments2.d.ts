import {
	Mesh,
} from 'three';

import { LineMaterial } from './LineMaterial';
import { LineSegmentsGeometry } from './LineSegmentsGeometry';

export class LineSegments2 extends Mesh {

	constructor( geometry?: LineSegmentsGeometry, material?: LineMaterial );
	readonly isLineSegments2: true;

	computeLineDistances(): this;

}
