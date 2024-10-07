import { BufferGeometry, Color, Float32BufferAttribute, LineBasicMaterial, LineSegments } from 'three';

class GridHelper extends LineSegments {
  constructor(
    sizeX: number, // Size along the X axis
    stepX: number, // Step distance along the X axis
    sizeZ: number, // Size along the Z axis
    stepZ: number, // Step distance along the Z axis
    color: Color | string | number = 0x888888 // Single color for all grid lines
  ) {
    // Convert color input to a Color object
    color = new Color(color);

    // Calculate the number of steps along each axis
    const xSteps = Math.round(sizeX / stepX);
    const zSteps = Math.round(sizeZ / stepZ);

    // Adjust sizes to center the grid
    const halfSizeX = (xSteps * stepX) / 2;
    const halfSizeZ = (zSteps * stepZ) / 2;

    const vertices: number[] = [];
    const colors: number[] = [];
    let j = 0;

    // Generate vertices and colors for lines parallel to the X-axis (moving along Z)
    for (let z = -halfSizeZ; z <= halfSizeZ; z += stepZ) {
      vertices.push(
        -halfSizeX,
        0,
        z, // Start point (on the X-axis)
        halfSizeX,
        0,
        z // End point (on the X-axis)
      );

      // Assign the same color to all lines
      color.toArray(colors, j);
      j += 3;
      color.toArray(colors, j);
      j += 3;
    }

    // Generate vertices and colors for lines parallel to the Z-axis (moving along X)
    for (let x = -halfSizeX; x <= halfSizeX; x += stepX) {
      vertices.push(
        x,
        0,
        -halfSizeZ, // Start point (on the Z-axis)
        x,
        0,
        halfSizeZ // End point (on the Z-axis)
      );

      // Assign the same color to all lines
      color.toArray(colors, j);
      j += 3;
      color.toArray(colors, j);
      j += 3;
    }

    // Create BufferGeometry and assign the vertices and colors
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));

    // Create material for the grid lines
    const material = new LineBasicMaterial({ vertexColors: true, toneMapped: false });

    // Call the parent class constructor with the geometry and material
    super(geometry, material);
  }

  // Override the type property for clarity and identification
  override readonly type = 'GridHelper';

  // Add dispose method for resource management
  dispose() {
    this.geometry.dispose();
    if (Array.isArray(this.material)) {
      this.material.forEach((material) => material.dispose());
    } else {
      this.material.dispose();
    }
  }
}

export { GridHelper };
