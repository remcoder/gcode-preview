import { BufferGeometry, Float32BufferAttribute, Vector2, Vector3 } from 'three';

class ExtrusionGeometry extends BufferGeometry {
  constructor(points: Vector3[] = [], lineWidth: number = 0.6, lineHeight: number = 0.2, radialSegments: number = 8) {
    super();

    this.type = 'ExtrusionGeometry';

    // helper variables

    const N = new Vector3();
    const B = new Vector3();
    const vec = new Vector3();
    const tangent = new Vector3();

    const vertex = new Vector3();
    const normal = new Vector3();
    const uv = new Vector2();
    let P = new Vector3();

    // buffer

    const vertices: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    let segments = 0;

    // create buffer data

    generateBufferData();

    // build geometry

    this.setIndex(indices);
    this.setAttribute('position', new Float32BufferAttribute(vertices, 3));
    this.setAttribute('normal', new Float32BufferAttribute(normals, 3));
    this.setAttribute('uv', new Float32BufferAttribute(uvs, 2));

    // functions

    function generateBufferData() {
      segments = 0;
      // This is where the fun begins: we'd multiply the number of travel moves by the number of segments per move.
      // I'm not sure yet if we can still get that from a catmull curve, but we'll see.
      for (let i = 0; i < points.length; i++) {
        generateSegment(i);
      }

      // if the geometry is not closed, generate the last row of vertices and normals
      // at the regular position on the given path
      //
      // if the geometry is closed, duplicate the first row of vertices and normals (uvs will differ)

      generateSegment(closed === false ? points.length - 1 : 0);

      // uvs are generated in a separate function.
      // this makes it easy compute correct values for closed geometries

      generateUVs();

      // finally create faces

      generateIndices();
    }

    function generateSegment(i: number) {
      segments++;

      P = points[i];

      tangent
        .copy(P)
        .subVectors(points[i + 1] || P, points[i - 1] || P)
        .normalize();

      let min = Number.MAX_VALUE;
      const tx = Math.abs(tangent.x);
      const ty = Math.abs(tangent.y);
      const tz = Math.abs(tangent.z);

      if (tx <= min) {
        min = tx;
        N.set(1, 0, 0);
      }

      if (ty <= min) {
        min = ty;
        N.set(0, 1, 0);
      }

      if (tz <= min) {
        N.set(0, 0, 1);
      }

      vec.crossVectors(tangent, N).normalize();

      N.crossVectors(tangent, vec);
      B.crossVectors(tangent, N);

      for (let j = 0; j <= radialSegments; j++) {
        const v = (j / radialSegments) * Math.PI * 2;
        const sin = Math.sin(v);
        const cos = -Math.cos(v);

        // normal
        normal.x = cos * N.x + sin * B.x;
        normal.y = cos * N.y + sin * B.y;
        normal.z = cos * N.z + sin * B.z;

        normal.normalize();
        normals.push(normal.x, normal.y, normal.z);

        // vertex

        vertex.x = P.x + lineWidth * normal.x * 0.5;
        vertex.y = P.y + lineWidth * normal.y * 0.5;
        vertex.z = P.z + lineHeight * normal.z * 0.5;
        vertices.push(vertex.x, vertex.y, vertex.z);
      }
    }

    function generateIndices() {
      for (let j = 1; j < segments; j++) {
        for (let i = 1; i <= radialSegments; i++) {
          const a = (radialSegments + 1) * (j - 1) + (i - 1);
          const b = (radialSegments + 1) * j + (i - 1);
          const c = (radialSegments + 1) * j + i;
          const d = (radialSegments + 1) * (j - 1) + i;

          // faces

          indices.push(a, b, d);
          indices.push(b, c, d);
        }
      }
    }

    function generateUVs() {
      for (let i = 0; i < segments; i++) {
        for (let j = 0; j <= radialSegments; j++) {
          uv.x = i / segments;
          uv.y = j / radialSegments;

          uvs.push(uv.x, uv.y);
        }
      }
    }
  }
}

export { ExtrusionGeometry };
