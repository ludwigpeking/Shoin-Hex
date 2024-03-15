export class HexGrid {
  constructor(
    hexGridDiameter = 40,
    hexRingCount = 10,
    width = 800,
    height = 800
  ) {
    this.hexGridDiameter = hexGridDiameter;
    this.hexRingCount = hexRingCount;
    this.width = width;
    this.height = height;
    this.vertices = [];
    this.quads = [];
    this.mergedFaces = [];
    this.subdivVertices = [];
    this.edgeMidpointMap = new Map();
    this.faceCenterVertices = [];
    // Initialize grid upon creation
    this.initializeGrid();
  }

  initializeGrid() {
    this.createCentralPoint();
    this.populateVertices();
    this.createFaces();
    this.mergeTrianglesToQuadsRandomly();
    this.subdivideMesh();
    this.precalculateAdjacentFaces();
    let averageFaceArea = this.calculateAverageArea();
    this.relaxVertices(100, 0.1);
  }

  createCentralPoint() {
    const centralPoint = new Vertex(0, 0, 0, this.width, this.height);
    this.vertices.push(centralPoint);
  }

  populateVertices() {
    for (let i = 1; i <= this.hexRingCount; i++) {
      for (let j = 0; j < 6; j++) {
        // Six sides of a hexagon
        for (let k = 0; k < i; k++) {
          const vertex = new Vertex(i, j, k, this.width, this.height);
          this.vertices.push(vertex);
        }
      }
    }
  }

  createFaces() {
    //central ring
    const p0 = this.vertices[0];
    for (let j = 0; j < 6; j++) {
      const p1 = this.vertices[j + 1];
      const p2 = this.vertices[((j + 1) % 6) + 1];
      this.quads.push(new Quad([p0, p1, p2]));
      const p3 = this.vertices[6 + 2 + 2 * j];
      this.quads.push(new Quad([p1, p2, p3]));
    }
    //outer rings
    for (let i = 2; i < this.hexRingCount + 1; i++) {
      for (let j = 0; j < 6; j++) {
        for (let k = 0; k < i; k++) {
          const p0 =
            this.vertices[
              getVertexIndex(
                i - 1,
                (j + Math.floor(k / (i - 1))) % 6,
                k % (i - 1)
              )
            ];
          const p1 = this.vertices[getVertexIndex(i, j, k)];
          const p2 =
            this.vertices[
              getVertexIndex(i, (j + Math.floor(k / (i - 1))) % 6, (k + 1) % i)
            ];
          this.quads.push(new Quad([p0, p1, p2]));
          if (i < this.hexRingCount) {
            const p3 =
              this.vertices[
                getVertexIndex(
                  i + 1,
                  j + (Math.floor(k / i) % 6),
                  (k + 1) % (i + 1)
                )
              ];
            this.quads.push(new Quad([p1, p2, p3]));
          }
        }
      }
    }
  }

  mergeTrianglesToQuadsRandomly() {
    let toRemove = new Set();
    let mergedFacesTemp = [];

    // Create a list of all possible pairs
    let pairs = [];
    for (let i = 0; i < this.quads.length; i++) {
      for (let j = i + 1; j < this.quads.length; j++) {
        pairs.push([i, j]);
      }
    }

    // Shuffle the pairs to randomize the order of processing
    this.shuffleArray(pairs);

    // Attempt to merge pairs in the randomized order
    for (let [i, j] of pairs) {
      if (toRemove.has(i) || toRemove.has(j)) continue;

      let sharedVertices = this.quads[i].vertices.filter((v) =>
        this.quads[j].vertices.includes(v)
      );
      if (sharedVertices.length === 2) {
        let nonSharedVertices = this.quads[i].vertices
          .concat(this.quads[j].vertices)
          .filter((v) => !sharedVertices.includes(v));
        let orderedVertices = [
          sharedVertices[0],
          nonSharedVertices[0],
          sharedVertices[1],
          nonSharedVertices[1],
        ];

        mergedFacesTemp.push(new Quad(orderedVertices));
        toRemove.add(i).add(j);
        // Once a merge is made, you might choose to continue to try merging others or break, depending on desired randomness
      }
    }

    // Update the quads array
    this.quads = this.quads.filter((_, index) => !toRemove.has(index));
    this.quads = this.mergedFaces.concat(mergedFacesTemp, this.quads);
  }

  subdivideMesh() {
    let newFaces = []; // Store new subdivided quads here

    this.quads.forEach((face) => {
      // Compute edge midpoints
      let midpoints = [];
      for (let i = 0; i < face.vertices.length; i++) {
        let v1 = face.vertices[i];
        let v2 = face.vertices[(i + 1) % face.vertices.length];
        midpoints.push(this.getOrCreateEdgeMidpoint(v1, v2));
      }

      // Compute face center
      let centerVertex = this.createFaceCenter(face.vertices);

      // Form new quads for each segment of the original face
      for (let i = 0; i < face.vertices.length; i++) {
        let newQuadVertices = [
          face.vertices[i],
          midpoints[i],
          centerVertex,
          midpoints[(i - 1 + midpoints.length) % midpoints.length],
        ];
        newFaces.push(new Quad(newQuadVertices));
      }
    });

    this.quads = newFaces; // Replace old quads with the new subdivided quads
  }

  getOrCreateEdgeMidpoint(v1, v2) {
    let edgeKey = `${Math.min(v1.index, v2.index)}-${Math.max(
      v1.index,
      v2.index
    )}`;
    if (this.edgeMidpointMap.has(edgeKey)) {
      return this.edgeMidpointMap.get(edgeKey);
    } else {
      let midpoint = new SubdivVertex((v1.x + v2.x) / 2, (v1.y + v2.y) / 2);
      if (v1.edgy && v2.edgy) {
        midpoint.edgy = true;
      }
      this.subdivVertices.push(midpoint);
      this.edgeMidpointMap.set(edgeKey, midpoint);
      return midpoint;
    }
  }

  createFaceCenter(vertices) {
    let centerX = vertices.reduce((sum, v) => sum + v.x, 0) / vertices.length;
    let centerY = vertices.reduce((sum, v) => sum + v.y, 0) / vertices.length;
    let centerVertex = new SubdivVertex(centerX, centerY);
    this.faceCenterVertices.push(centerVertex);
    this.subdivVertices.push(centerVertex);
    return centerVertex;
  }

  precalculateAdjacentFaces() {
    this.vertices.forEach((vertex) => {
      vertex.adjacentFaces = []; // Initialize the array to hold adjacent quads
    });
    this.quads.forEach((face) => {
      face.vertices.forEach((vertex) => {
        vertex.adjacentFaces.push(face); // Add this face to the vertex's list of adjacent quads
      });
    });
  }
  relaxVertices(iterations, strength = 0.1) {
    for (let it = 0; it < iterations; it++) {
      this.shuffleArray(this.vertices);
      this.vertices.forEach((vertex) =>
        this.relaxVertexPosition(vertex, strength)
      ); // Assuming a relaxation strength of 0.1
    }
  }

  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  relaxVertexPosition(vertex, strength) {
    // Updated to ensure proper referencing of instance methods
    if (vertex.edgy || vertex.adjacentFaces.length === 0) return;

    let weightedSumX = 0;
    let weightedSumY = 0;
    let totalWeight = 0;

    vertex.adjacentFaces.forEach((face) => {
      let centroid = this.getFaceCentroid(face);
      let weight = this.calculateFaceArea(face);

      weightedSumX += centroid.x * weight;
      weightedSumY += centroid.y * weight;
      totalWeight += weight;
    });

    if (totalWeight > 0) {
      let avgX = weightedSumX / totalWeight;
      let avgY = weightedSumY / totalWeight;

      vertex.x += (avgX - vertex.x) * strength;
      vertex.y += (avgY - vertex.y) * strength;
    }
  }

  getFaceCentroid(face) {
    let x = 0,
      y = 0;
    face.vertices.forEach((v) => {
      x += v.x;
      y += v.y;
    });
    return { x: x / face.vertices.length, y: y / face.vertices.length };
  }

  calculateFaceArea(face) {
    // Assuming a simple method for calculating area; may need adjustments based on actual face structure
    let area = 0;
    for (let i = 0; i < face.vertices.length; i++) {
      const v1 = face.vertices[i];
      const v2 = face.vertices[(i + 1) % face.vertices.length];
      area += v1.x * v2.y - v2.x * v1.y;
    }
    return Math.abs(area / 2);
  }
  calculateAverageArea() {
    let totalArea = 0;
    this.quads.forEach((face) => {
      totalArea += this.calculateFaceArea(face);
    });
    return totalArea / this.quads.length;
  }

  // Additional methods (createFaces, mergeTrianglesToQuadsRandomly, etc.) adapted to use instance variables

  getQuads() {
    return this.quads;
  }

  // Any other methods you'd like to expose publicly
}

class Vertex {
  constructor(i, j, k, width = 800, height = 800) {
    this.i = i;
    this.j = j;
    this.k = k;
    this.index = i + j + k === 0 ? 0 : 1 + (i * 6 * (i - 1)) / 2 + j * i + k;
    this.edgy = i === hexRingCount;
    this.calculatePosition(width, height);
  }

  calculatePosition(width, height) {
    // Convert p5.js specific functions to generic JavaScript
    const angleStep = Math.PI / 3;
    this.p1 = {
      x: width / 2 + this.i * hexGridDiameter * Math.cos(this.j * angleStep),
      y: height / 2 + this.i * hexGridDiameter * Math.sin(this.j * angleStep),
    };
    this.p2 = {
      x:
        width / 2 +
        this.i * hexGridDiameter * Math.cos((this.j + 1) * angleStep),
      y:
        height / 2 +
        this.i * hexGridDiameter * Math.sin((this.j + 1) * angleStep),
    };
    if (this.i === 0) {
      this.x = this.p1.x;
      this.y = this.p1.y;
    } else {
      this.x = this.p1.x + ((this.p2.x - this.p1.x) * this.k) / this.i;
      this.y = this.p1.y + ((this.p2.y - this.p1.y) * this.k) / this.i;
    }
  }
}

class SubdivVertex {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
}

class Quad {
  constructor(vertices) {
    this.vertices = vertices;
  }
}

function getVertexIndex(i, j, k) {
  if (i === 0) return 0; // Central point
  return 1 + (i * 6 * (i - 1)) / 2 + j * i + k;
}

export default HexGrid;
