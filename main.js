import * as THREE from "three";
import { HexGrid } from "./HexGrid"; // Adjust the import path to where your HexGrid class is defined

// Create a new instance of HexGrid
const hexGrid = new HexGrid(40, 5, 800, 800);

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Add some ambient light
const light = new THREE.AmbientLight(0x404040); // soft white light
scene.add(light);

// Add a directional light
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
scene.add(directionalLight);

// Material for the quads
const material = new THREE.MeshBasicMaterial({
  color: 0x00ff00,
  wireframe: true,
});

hexGrid.getQuads().forEach((quad) => {
  const geometry = new THREE.BufferGeometry();
  const vertices = [];

  quad.vertices.forEach((vertex) => {
    if (!isNaN(vertex.x) && !isNaN(vertex.y)) {
      // Check if vertex coordinates are valid
      vertices.push(vertex.x, vertex.y, 0); // Assuming z-axis is 0
    }
  });

  // Ensure the loop is closed by repeating the first vertex
  if (vertices.length >= 3) {
    // Make sure there's at least one vertex to repeat
    vertices.push(vertices[0], vertices[1], vertices[2]);
  }

  // Only proceed if we have a valid geometry
  if (vertices.length > 0) {
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3)
    );
    const lineLoop = new THREE.LineLoop(geometry, material);
    scene.add(lineLoop);
  } else {
    console.error("Invalid vertices detected for a quad", quad);
  }
});

// Adjust the camera position so the hex grid is visible
camera.position.z = 100;

// Render loop
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

animate();
