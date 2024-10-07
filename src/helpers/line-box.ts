import { BufferGeometry, Float32BufferAttribute, Color, LineSegments, LineDashedMaterial } from 'three';

function box(xSize: number, ySize: number, zSize: number) {
  const x = xSize / 2;
  const y = ySize / 2;
  const z = zSize / 2;

  const geometry = new BufferGeometry();
  const position = [];

  position.push(
    -x,
    -y,
    -z,
    -x,
    y,
    -z,

    -x,
    y,
    -z,
    x,
    y,
    -z,

    x,
    y,
    -z,
    x,
    -y,
    -z,

    -x,
    -y,
    z,
    -x,
    y,
    z,

    -x,
    y,
    z,
    x,
    y,
    z,

    x,
    y,
    z,
    x,
    -y,
    z,

    -x,
    y,
    -z,
    -x,
    y,
    z,

    x,
    y,
    -z,
    x,
    y,
    z
  );
  geometry.setAttribute('position', new Float32BufferAttribute(position, 3));

  return geometry;
}

export function LineBox(
  x: number,
  y: number,
  z: number,
  color: Color | number | string
): LineSegments<BufferGeometry, LineDashedMaterial> {
  const geometryBox = box(x, y, z);

  const lineSegments = new LineSegments(
    geometryBox,
    new LineDashedMaterial({ color: new Color(color), dashSize: 3, gapSize: 1 })
  );
  lineSegments.computeLineDistances();

  // align the bottom of the box
  lineSegments.position.setY(y / 2);

  return lineSegments;
}
