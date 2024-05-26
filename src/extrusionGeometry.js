import { BufferGeometry, Float32BufferAttribute, Vector2, Vector3 } from 'three';
import * as Curves from 'three/extras/curves/Curves.js';
class ExtrusionGeometry extends BufferGeometry {
  constructor(
    path = new Curves['QuadraticBezierCurve3'](new Vector3(-1, -1, 0), new Vector3(-1, 1, 0), new Vector3(1, 1, 0)),
    // Prototype notes:
    // I'm thinking of repuposing this parameter to change it's meaning. Instead of being the total number of segments,
    // it could be the number of segments per travel moves. For now, even with arc support, all travel moves are linear.
    tubularSegments = 64,
    radius = 1,
    radialSegments = 8,
    closed = false
  ) {
    super();

    this.type = 'TubeGeometry';

    this.parameters = {
      path: path,
      tubularSegments: tubularSegments,
      radius: radius,
      radialSegments: radialSegments,
      closed: closed
    };

    // The frenet frames are evenly distributed along the path and this current implementation of the TubeGeometry is
    // based on that. I wonder how to get the right frames, not based on a regular distribution, but based on the travel
    // moves.
    const frames = path.computeFrenetFrames(tubularSegments, closed);

    // expose internals

    this.tangents = frames.tangents;
    this.normals = frames.normals;
    this.binormals = frames.binormals;

    // helper variables

    const vertex = new Vector3();
    const normal = new Vector3();
    const uv = new Vector2();
    let P = new Vector3();

    // buffer

    const vertices = [];
    const normals = [];
    const uvs = [];
    const indices = [];

    // create buffer data

    generateBufferData();

    // build geometry

    this.setIndex(indices);
    this.setAttribute('position', new Float32BufferAttribute(vertices, 3));
    this.setAttribute('normal', new Float32BufferAttribute(normals, 3));
    this.setAttribute('uv', new Float32BufferAttribute(uvs, 2));

    // functions

    function generateBufferData() {
      // This is where the fun begins: we'd multiply the number of travel moves by the number of segments per move.
      // I'm not sure yet if we can still get that from a catmull curve, but we'll see.
      for (let i = 0; i < tubularSegments; i++) {
        generateSegment(i);
      }

      // if the geometry is not closed, generate the last row of vertices and normals
      // at the regular position on the given path
      //
      // if the geometry is closed, duplicate the first row of vertices and normals (uvs will differ)

      generateSegment(closed === false ? tubularSegments : 0);

      // uvs are generated in a separate function.
      // this makes it easy compute correct values for closed geometries

      generateUVs();

      // finally create faces

      generateIndices();
    }

    function generateSegment(i) {
      // As per explorations with the wireframe, the segments could be concentrated only at the ends of the travel moves
      // instead of evenly distributed. This would most likely reduce the number of segments needed to get a good result.
      P = path.getPointAt(i / tubularSegments, P);

      // retrieve corresponding normal and binormal

      const N = frames.normals[i];
      const B = frames.binormals[i];

      // generate normals and vertices for the current segment

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

        // Since we're going to change the shape of the extrusion, `radius` will no longer make sense. We'll have
        // to instead pass parameters that represents line height and line width. Let's bring back geometry class to
        // calculate ellipse points!
        vertex.x = P.x + radius * normal.x;
        vertex.y = P.y + radius * normal.y;
        vertex.z = P.z + radius * normal.z;

        vertices.push(vertex.x, vertex.y, vertex.z);
      }
    }

    function generateIndices() {
      for (let j = 1; j <= tubularSegments; j++) {
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
      for (let i = 0; i <= tubularSegments; i++) {
        for (let j = 0; j <= radialSegments; j++) {
          uv.x = i / tubularSegments;
          uv.y = j / radialSegments;

          uvs.push(uv.x, uv.y);
        }
      }
    }
  }

  copy(source) {
    super.copy(source);

    this.parameters = Object.assign({}, source.parameters);

    return this;
  }

  toJSON() {
    const data = super.toJSON();

    data.path = this.parameters.path.toJSON();

    return data;
  }

  static fromJSON(data) {
    // This only works for built-in curves (e.g. CatmullRomCurve3).
    // User defined curves or instances of CurvePath will not be deserialized.
    return new ExtrusionGeometry(
      new Curves[data.path.type]().fromJSON(data.path),
      data.tubularSegments,
      data.radius,
      data.radialSegments,
      data.closed
    );
  }
}

export { ExtrusionGeometry };
