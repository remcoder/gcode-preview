import { BufferGeometry, Float32BufferAttribute, Color, LineSegments, LineDashedMaterial } from 'three';

function box(width: number, height: number, depth: number) {
  (width = width * 0.5), (height = height * 0.5), (depth = depth * 0.5);

  const geometry = new BufferGeometry();
  const position = [];

  position.push(
    -width,
    -height,
    -depth,
    -width,
    height,
    -depth,

    -width,
    height,
    -depth,
    width,
    height,
    -depth,

    width,
    height,
    -depth,
    width,
    -height,
    -depth,

    width,
    -height,
    -depth,
    -width,
    -height,
    -depth,

    -width,
    -height,
    depth,
    -width,
    height,
    depth,

    -width,
    height,
    depth,
    width,
    height,
    depth,

    width,
    height,
    depth,
    width,
    -height,
    depth,

    width,
    -height,
    depth,
    -width,
    -height,
    depth,

    -width,
    -height,
    -depth,
    -width,
    -height,
    depth,

    -width,
    height,
    -depth,
    -width,
    height,
    depth,

    width,
    height,
    -depth,
    width,
    height,
    depth,

    width,
    -height,
    -depth,
    width,
    -height,
    depth
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

  return lineSegments;
}
