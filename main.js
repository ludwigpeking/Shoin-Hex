import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import PineTree from './Pine';

let buildingBlocks = [];
let cols = 7;
let rows = 7;
let grid = [];
let unsolved = [];
const defaultSeed = 19;
let openEdge = true;
let captureImage = false;


// Get a reference to the checkbox
const checkbox = document.getElementById('myCheckbox');

// Add an event listener
checkbox.addEventListener('change', function() {
    openEdge = this.checked;  
    console.log(openEdge);}); 


class SeededRandom {
  constructor(seed = Date.now()) {
    this.m = 0x80000000; // 2**31;
    this.a = 1103515245;
    this.c = 321321;
    this.initialState = seed % this.m;  // Store the initial state
    this.state = this.initialState;
  }
  
  // Reset the internal state to its initial value
  reset() {
    this.state = this.initialState;
  }

  // Return a random float in [0, 1)
  nextFloat() {
    this.state = (this.a * this.state + this.c) % this.m;
    return this.state / this.m;
  }

  // Return a random int in [0, m)
  nextInt(m) {
    return Math.floor(this.nextFloat() * m);
  }
}

// Usage
let rng = new SeededRandom(defaultSeed); 
// console.log(rng)

class Tile {
  constructor(index, num, edges) {
    this.index = index;
    this.ro = num;
    this.edges = edges;
    this.up = [];
    this.right = [];
    this.down = [];
    this.left = [];
  }

  analyze(tiles) {
    for (let i = 0; i < tiles.length; i++) {
      // UP
      if (compareEdge(tiles[i].edges[2], this.edges[0])) {
        this.up.push(tiles[i]);
      }
      // RIGHT
      if (compareEdge(tiles[i].edges[3], this.edges[1])) {
        this.right.push(tiles[i]);
      }
      // DOWN
      if (compareEdge(tiles[i].edges[0], this.edges[2])) {
        this.down.push(tiles[i]);
      }
      // LEFT
      if (compareEdge(tiles[i].edges[1], this.edges[3])) {
        this.left.push(tiles[i]);
      }
    }
  }

  rotate(num) {
    // Rotate edges
    let newEdges = this.edges.slice(); // Copy array
    for (let i = 0; i < 4; i++) {
      newEdges[i] = this.edges[(i - num + 4) % 4];
    }
    return new Tile(this.index, num, newEdges);
  }
}

let tiles = [
  //4 axis of symmetry
  new Tile(0, 0, ["000", "000", "000", "000"]),
  new Tile(1, 0, ["DDD", "DDD", "DDD", "DDD"]),
  new Tile(2, 0, ["C3C", "C3C", "C3C", "C3C"]),
  new Tile(3, 0, ["NNN", "NNN", "NNN", "NNN"]),
  new Tile(4, 0, ["C3C", "C3C", "C3C", "C3C"]),
  new Tile(5, 0, ["NNN", "NNN", "NNN", "NNN"]),
  //2 axis of symmetry
  new Tile(6, 0, ["232", "DDD", "232", "DDD"]),
  //1 axis of symmetry
    new Tile(7, 0, ["012", "UUU", "210", "000"]),
  new Tile(8, 0, ["012", "PPP", "210", "000"]),
  new Tile(9, 0, ["012", "210", "000", "000"]),
  new Tile(10, 0, ["UUU", "UUU", "210", "012"]),
  new Tile(11, 0, ["PPP", "PPP", "210", "012"]),
  new Tile(12, 0, ["PPP", "UUU", "210", "012"]),
  new Tile(13, 0, ["UUU", "PPP", "210", "012"]),
  new Tile(14, 0, ["234", "444", "432", "DDD"]),
  new Tile(15, 0, ["234", "432", "DDD", "DDD"]),
  new Tile(16, 0, ["444", "444", "43C", "C34"]),
  new Tile(17, 0, ["23C", "C3C", "C32", "DDD"]),
  new Tile(18, 0, ["DDD", "232", "DDD", "DDD"]),
  new Tile(19, 0, ["DDD", "232", "DDD", "DDD"]),
  new Tile(20, 0, ["234", "43C", "C32", "DDD"]),
  new Tile(21, 0, ["432", "DDD", "23C", "C34"]),
  new Tile(22, 0, ["DDD", "DDD", "23C", "C32"]),
  new Tile(23, 0, ["2T4", "4T2", "DDD", "DDD"]),
  //1 axis of symmetry, landscape tiles
  new Tile(24, 0, ["N00", "000", "000", "00N"]),
  new Tile(25, 0, ["NNN", "N00", "00N", "NNN"]),
  new Tile(26, 0, ["N00", "000", "00N", "NNN"]),
  new Tile(27, 0, ["N00", "000", "00N", "NBN"]),
  new Tile(28, 0, ["N00", "00N", "N00", "00N"]),
  new Tile(29, 0, ["N00", "00N", "N00", "00N"]),
  new Tile(30, 0, ["00N", "NBN", "NNN", "N00"]),
  new Tile(31, 0, ["N00", "00N", "NNN", "NBN"])]

// Add rotate tiles
tiles.push(tiles[6].rotate(1));
// Rotate tiles, add all 3 other directions
for (let i = 7; i < 32; i++) {
  for (let j = 1; j < 4; j++) {
    tiles.push(tiles[i].rotate(j));
  }
}
for (let p = 0; p < tiles.length; p++) {
  tiles[p].analyze(tiles);
}

class Cell {
  constructor(i, j, tiles) {
    this.i = i;
    this.j = j;
    this.collapsed = false;
    this.options = tiles.slice(); // Copy array
    this.chosen = null;
  }

  checkNeighbors(grid) {
    if (this.j < rows - 1) {
      let up = grid[this.i][this.j + 1];
      if (!up.collapsed) {
        up.options = checkValid(up.options, this.chosen.up);
      }
    }
    if (this.i < cols - 1) {
      let right = grid[this.i + 1][this.j];
      if (!right.collapsed) {
        right.options = checkValid(right.options, this.chosen.right);
      }
    }
    if (this.j > 0) {
      let down = grid[this.i][this.j - 1];
      if (!down.collapsed) {
        down.options = checkValid(down.options, this.chosen.down);
      }
    }
    if (this.i > 0) {
      let left = grid[this.i - 1][this.j];
      if (!left.collapsed) {
        left.options = checkValid(left.options, this.chosen.left);
      }
    }
  }
}
function reverseString(s) {
  return s.split('').reverse().join('');
}

function compareEdge(a, b) {
  //this is sensitive to efficiency and not stategized fully
  if ((a === "UUU" && b === "DDD") ||
      (a === "DDD" && b === "UUU") ||
      (a === "C3C" && b === "232") ||
      (a === "232" && b === "C3C") ||
      (a === "232" && b === "C32") ||
      (a === "C32" && b === "232") ||
      (a === "C34" && b === "432") ||
      (a === "432" && b === "C34") ||
      (a === "43C" && b === "234") ||
      (a === "234" && b === "43C") ||
      (a === "PPP" && b === "UUU") ||
      (a === "UUU" && b === "PPP")) {
    return true;
  }
  if ((a === "DDD" && b === "DDD") ||
      (a === "PPP" && b === "PPP") ||
      (a === "UUU" && b === "UUU")) {
    return false;
  }
  return a === reverseString(b);
}

// Create scene, camera, and renderer
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xccddff);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(cols * 8 , 12, rows * 8 );
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
renderer.shadowMap.enabled = true;
renderer.shadowMap.needsUpdate = true;
renderer.toneMappingExposure = 0.5;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

document.getElementById('setSeed').addEventListener('click', function() {
  let seedValue = document.getElementById('seedInput').value;
  if (seedValue === "") {
    // If the input is empty, generate a random seed
    seedValue = Date.now();
  } else {
    // Convert the seed to a number
    seedValue = parseInt(seedValue);
  }
  // Display the seed (useful for random seeds to reproduce results)
  document.getElementById('seedInput').value = seedValue;
  // Update the random number generator with the new seed
  rng = new SeededRandom(seedValue);
  clearScene();
  startOver() ;
});
// For example, to initialize with seed :
document.getElementById('seedInput').value = defaultSeed;

//add a directional light
const directionalLight = new THREE.DirectionalLight(0xffffee, 2);
directionalLight.position.set(-100, 100, 100); 
directionalLight.target.position.set(0, 0, 0); 
directionalLight.castShadow = true;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 500;
directionalLight.shadow.camera.left = -80; 
directionalLight.shadow.camera.right = 80; 
directionalLight.shadow.camera.top = 80; 
directionalLight.shadow.camera.bottom = -80; 
directionalLight.shadow.mapSize.width = 512;
directionalLight.shadow.mapSize.height = 512;
directionalLight.shadow.darkness = 0.3;//set the shadow darker
directionalLight.shadow.bias = -0.005;
scene.add(directionalLight);
scene.add(directionalLight.target); 
const cameraHelper = new THREE.CameraHelper(directionalLight.shadow.camera);
scene.add(cameraHelper);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
function createOrbitHelper(radius) {
  // Create a circle with only the outer edge
  const circleGeometry = new THREE.CircleGeometry(radius, 64);
  const edgesGeometry = new THREE.EdgesGeometry(circleGeometry); // Get only the outer edge
  const material = new THREE.LineBasicMaterial({ color: 0x888888 }); // Red color for visibility

  // Create a circle mesh
  const circle = new THREE.LineSegments(edgesGeometry, material);
  return circle;
}

// Create circles for each plane
const orbitHelperXY = createOrbitHelper(50);
const orbitHelperYZ = createOrbitHelper(50);
const orbitHelperXZ = createOrbitHelper(50);

// Rotate them to align with the planes
orbitHelperYZ.rotation.y = Math.PI / 2;
orbitHelperXZ.rotation.x = Math.PI / 2;

// Add the orbit helpers to the scene
scene.add(orbitHelperXY, orbitHelperYZ, orbitHelperXZ);


// Create an AxesHelper with a given size
const axesHelper = new THREE.AxesHelper(50);
scene.add(axesHelper);

// Add environmental lighting
const cubeTextureLoader = new THREE.CubeTextureLoader();
const environmentMapTexture = cubeTextureLoader.load([
  '/cubeTexture/posx.jpg',
  '/cubeTexture/negx.jpg',
  '/cubeTexture/posy.jpg',
  '/cubeTexture/negy.jpg',
  '/cubeTexture/posz.jpg',
  '/cubeTexture/negz.jpg',
]);
scene.environment = environmentMapTexture;
scene.background = environmentMapTexture;
const manager = new THREE.LoadingManager();

manager.onLoad = function() {
  // Called when all resources are loaded
  startOver();
};
manager.itemStart('buildingBlocks');
// // Initial load
loadBuildingBlocks();

function startOver() {
  unsolved = [];
  grid = [];
  // Create cell for each spot on the grid
  for (let i = 0; i < cols; i++) {
    grid.push([]);
    for (let j = 0; j < rows; j++) {
      grid[i].push(new Cell(i, j, tiles));
      unsolved.push(grid[i][j]);
    }
  }
  if(rng.nextFloat() < 0.5){
  let randomCell = grid[Math.floor(rng.nextFloat(cols / 3)+ cols / 3 )][Math.floor(rng.nextFloat(rows / 3)+rows / 3)]
  console.log('tower',randomCell.i, randomCell.j)
  randomCell.chosen = tiles[23];
  randomCell.collapsed = true;
  randomCell.checkNeighbors(grid);
  let index = unsolved.indexOf(randomCell);
if (index > -1) {
  unsolved.splice(index, 1);
}}
 
  if(rng.nextFloat() < 0.5){
    let randomCell = grid[cols-1][rows-1];
    console.log('pond',randomCell.i, randomCell.j)
    randomCell.chosen = tiles[3];
    randomCell.collapsed = true;
    randomCell.checkNeighbors(grid);
    let index = unsolved.indexOf(randomCell);
  if (index > -1) {
    unsolved.splice(index, 1);
  }}

  if (openEdge === true){
        for (let i = 0; i < cols; i++) {
          for (let j = 0; j < rows; j++) {
            if (i === 0 || i === cols - 1 || j === 0 || j === rows - 1) {
              grid[i][j].chosen = tiles[0];
              grid[i][j].collapsed = true;
              grid[i][j].checkNeighbors(grid);
              let index = unsolved.indexOf(grid[i][j]);
              if (index > -1) {
                unsolved.splice(index, 1);
              }
            }
          }
        }
      }

  collapse(unsolved, grid);
}

function collapse(unsolved, grid) {
  while (unsolved.length > 0) {
    unsolved.sort((a, b) => a.options.length - b.options.length);
    if (unsolved[0].options.length === 0) {
      startOver(); 
      break;
    } else {
      let chosen = unsolved[0].options[Math.floor(rng.nextFloat() * unsolved[0].options.length)];
      unsolved[0].chosen = chosen;
      unsolved[0].collapsed = true;
      unsolved[0].checkNeighbors(grid);
      unsolved.shift();
    }
  }

  if (unsolved.length === 0) {
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        // Get the chosen building block
        let chosenBlock = buildingBlocks[grid[i][j].chosen.index];
        // Clone the building block
        // console.log('chosenBlock',chosenBlock)
        let house = chosenBlock.clone();
         // Make the object visible
        house.visible = true;
        house.castShadow = true; // this building will cast shadows
        house.receiveShadow = true; // this building will receive shadows
        house.position.set(i*6 , 0, j * 6);
        house.scale.set(1, 1, -1); //to adapt from blender
        house.rotation.set(0, grid[i][j].chosen.ro * Math.PI / 2 , 0);
        // Add the house to the scene
        house.generatedBlock = true;
        scene.add(house);
      }
    }
  }
}

function checkValid(arr, valid) {
  for (let i = arr.length - 1; i >= 0; i--) {
    let element = arr[i];
    if (valid.indexOf(element) === -1) {
      arr.splice(i, 1);
    }
  }
  return arr;
}

function clearScene() {
  // Get a list of objects to remove
  const objectsToRemove = scene.children.filter((object) => object.generatedBlock === true);
  // Remove each object from the scene
  objectsToRemove.forEach((object) => {
    scene.remove(object);
  });
}

function loadBuildingBlocks() {
  // Clear existing mesh if any

  scene.children.forEach((object) => {
    if (object.isMesh) {
      scene.remove(object);
    }
  });
  
  // Load GLB file
  let loader = new GLTFLoader(manager);
  loader.load('/20230812_refactor.glb', function (gltf){
    gltf.scene.children.forEach((child) => {
        child.visible = false;
        // Store building blocks for future reference
        buildingBlocks[parseInt(child.name)] = child;
    });
    
    scene.add(gltf.scene);

    gltf.scene.traverse((child) => {
      if (child.isMesh) {
        // Enable casting and receiving shadows for the mesh
        child.castShadow = true;
        child.receiveShadow = true;
    
        // Modify material properties if needed
        if (child.material.transparent) {
          child.material.transparent = true;
        }
      }
    });
    manager.itemEnd('buildingBlocks');
  });
}
// Add regeneration button

document.getElementById('apply').addEventListener('click', function() {
  // Read the values from the input fields
  let newRows = parseInt(document.getElementById('rows').value);
  let newCols = parseInt(document.getElementById('cols').value);

  // Check for valid input
  if (newRows > 1 && newCols > 1 && newRows <= 9 && newCols <= 9) {
    // Update the rows and cols variables
    rows = Math.round(newRows);
    cols = Math.round(newCols);

    // Clear the current scene
    rng.reset();
    clearScene();
    startOver() ;
  } else {
    alert('Please enter valid numbers for rows and columns: 2 - 9');
  }
});

document.getElementById('regenerate').addEventListener('click', regenerate);

// //add a large plane down below at y = -10 to catch shadows
const planeGeometry = new THREE.PlaneGeometry(10000, 10000);
const planeMaterial = new THREE.MeshStandardMaterial({
  color: 0xaaccaa,
  side: THREE.DoubleSide,
});
const plane = new THREE.Mesh(planeGeometry, planeMaterial);
plane.receiveShadow = true;
plane.rotation.x = Math.PI / 2;
plane.position.y = -1;
scene.add(plane);

function regenerate() {
  // Generate a new seed based on the current time
  const newSeed = Date.now();
  // Update the random number generator with the new seed
  rng = new SeededRandom(newSeed);
  //update rows and cols from dom input value
  rows = Math.round(document.getElementById('rows').value);
  cols = Math.round(document.getElementById('cols').value);
  // Display the new seed in the input box
  document.getElementById('seedInput').value = newSeed;
  // Clear the current scene and start over with the new seed
  clearScene();
  startOver() ;
}

document.getElementById('saveImage').addEventListener('click', function() {
  captureImage = true;
});

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
  if (captureImage) {
    const dataURL = renderer.domElement.toDataURL('image/png');

    // Create a link element
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = 'screenshot.png';
    link.click();

    // Reset the captureImage flag
    captureImage = false;
  }

}
animate(); //call the loop

window.addEventListener('resize', onWindowResize, false);
function onWindowResize() {
  // Update camera's aspect ratio and projection matrix
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  // Update renderer's size
  renderer.setSize(window.innerWidth, window.innerHeight);
}


const pine = new PineTree(15, 40, 40, 0.5, 30, 0.3);
pine.addToScene(scene);
//add a cylinder at the pine tree's position
const cylinderGeometry = new THREE.CylinderGeometry(0.5, 0.5, 5, 32);
const cylinderMaterial = new THREE.MeshStandardMaterial({
  color: 0x00ff00,
  side: THREE.DoubleSide,
});
const cylinder = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
cylinder.position.set(40, 0, 40);
scene.add(cylinder);




