import { BufferGeometry, Float32BufferAttribute, Color, LineSegments, LineDashedMaterial } from 'three';

class LineBoxHelper extends LineSegments {
  constructor(x: number, y: number, z: number, color: Color | number | string) {
    // Create geometry for the box
    const geometryBox = LineBoxHelper.createBoxGeometry(x, y, z);

    // Create material for the lines with dashed effect
    const material = new LineDashedMaterial({ color: new Color(color), dashSize: 3, gapSize: 1 });

    // Initialize the LineSegments with the geometry and material
    super(geometryBox, material);

    // Compute line distances for the dashed effect
    this.computeLineDistances();

    // Align the bottom of the box to Y position
    this.position.setY(y / 2);
  }

  // Static method to create the box geometry
  static createBoxGeometry(xSize: number, ySize: number, zSize: number): BufferGeometry {
    const x = xSize / 2;
    const y = ySize / 2;
    const z = zSize / 2;

    const geometry = new BufferGeometry();
    const position: number[] = [];

    // Define box edges for LineSegments
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

  // Dispose method to clean up resources
  dispose() {
    this.geometry.dispose();
    if (Array.isArray(this.material)) {
      this.material.forEach((material) => material.dispose());
    } else {
      this.material.dispose();
    }
  }
}

export { LineBoxHelper };
