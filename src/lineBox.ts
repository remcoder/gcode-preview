import THREE from 'three';

function box( width : number, height: number, depth: number, color: THREE.Color | number | string ) {
    width = width * 0.5,
    height = height * 0.5,
    depth = depth * 0.5;
  
    const geometry = new THREE.BufferGeometry();
    const position = [];
  
    position.push(
      - width, - height, - depth,
      - width, height, - depth,
  
      - width, height, - depth,
      width, height, - depth,
  
      width, height, - depth,
      width, - height, - depth,
  
      width, - height, - depth,
      - width, - height, - depth,
  
      - width, - height, depth,
      - width, height, depth,
  
      - width, height, depth,
      width, height, depth,
  
      width, height, depth,
      width, - height, depth,
  
      width, - height, depth,
      - width, - height, depth,
  
      - width, - height, - depth,
      - width, - height, depth,
  
      - width, height, - depth,
      - width, height, depth,
  
      width, height, - depth,
      width, height, depth,
  
      width, - height, - depth,
      width, - height, depth
     );
    geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( position, 3 ) );
  
    return geometry;
}
  
export  function LineBox(x: number,y: number,z: number, color: THREE.Color | number | string) {
    const geometryBox = box( x,y,z, color );

    const lineSegments = new THREE.LineSegments( geometryBox, new THREE.LineDashedMaterial( { color: new THREE.Color(color), dashSize: 3, gapSize: 1 } ) );
    lineSegments.computeLineDistances();

    return lineSegments;
}
  