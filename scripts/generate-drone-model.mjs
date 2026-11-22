import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";

// GLTFExporter uses FileReader for its final Blob conversion. This small
// implementation keeps the asset generator runnable in the app's Node setup.
class NodeFileReader {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((result) => {
      this.result = result;
      this.onloadend?.();
    });
  }

  readAsDataURL(blob) {
    blob.arrayBuffer().then((result) => {
      this.result = `data:${blob.type};base64,${Buffer.from(result).toString("base64")}`;
      this.onloadend?.();
    });
  }
}

globalThis.FileReader = NodeFileReader;

const drone = new THREE.Group();
drone.name = "SkyTrack procedural quadrotor";

const bodyMaterial = new THREE.MeshBasicMaterial({
  color: "#171923",
});
const frameMaterial = new THREE.MeshBasicMaterial({
  color: "#303440",
});
const accentMaterial = new THREE.MeshBasicMaterial({
  color: "#ac9cff",
});
const rotorMaterial = new THREE.MeshBasicMaterial({
  color: "#ac9cff",
  transparent: true,
  opacity: 0.68,
});
const lensMaterial = new THREE.MeshStandardMaterial({
  color: "#232831",
  roughness: 0.3,
  metalness: 0.2,
});

function addPart(name, geometry, material, position, rotation = [0, 0, 0]) {
  const part = new THREE.Mesh(geometry, material);
  part.name = name;
  part.position.set(...position);
  part.rotation.set(...rotation);
  drone.add(part);
  return part;
}

// glTF Y-up and +Z-forward. Overall rotor-tip span is about 1.2 m.
addPart(
  "dark center body",
  new THREE.BoxGeometry(0.25, 0.09, 0.3),
  bodyMaterial,
  [0, 0, 0],
);
addPart(
  "primary accent canopy",
  new THREE.BoxGeometry(0.14, 0.018, 0.18),
  accentMaterial,
  [0, 0.054, -0.015],
);
addPart(
  "front camera pod",
  new THREE.BoxGeometry(0.1, 0.055, 0.12),
  bodyMaterial,
  [0, -0.015, 0.19],
);
addPart(
  "camera lens",
  new THREE.SphereGeometry(0.035, 12, 8),
  lensMaterial,
  [0, -0.012, 0.255],
);

// Two crossed frame bars create the four diagonal arms.
const armGeometry = new THREE.BoxGeometry(0.9, 0.045, 0.055);
addPart(
  "front-left rear-right arm",
  armGeometry,
  frameMaterial,
  [0, 0, 0],
  [0, Math.PI / 4, 0],
);
addPart(
  "front-right rear-left arm",
  armGeometry,
  frameMaterial,
  [0, 0, 0],
  [0, -Math.PI / 4, 0],
);

const rotorOffset = 0.31;
const rotorCenters = [
  [rotorOffset, rotorOffset],
  [-rotorOffset, rotorOffset],
  [rotorOffset, -rotorOffset],
  [-rotorOffset, -rotorOffset],
];
rotorCenters.forEach(([x, z], index) => {
  addPart(
    `rotor hub ${index + 1}`,
    new THREE.CylinderGeometry(0.052, 0.052, 0.085, 12),
    accentMaterial,
    [x, 0.07, z],
  );
  addPart(
    `rotor disc ${index + 1}`,
    new THREE.CylinderGeometry(0.14, 0.14, 0.018, 24),
    rotorMaterial,
    [x, 0.125, z],
  );
});

const scene = new THREE.Scene();
scene.add(drone);
const exporter = new GLTFExporter();
const bytes = await exporter.parseAsync(scene, { binary: true });
const destination = fileURLToPath(
  new URL("../src/assets/mission-drone.glb", import.meta.url),
);
await mkdir(new URL("../src/assets/", import.meta.url), { recursive: true });
await writeFile(destination, Buffer.from(bytes));
console.log(`Generated ${destination} (${Buffer.byteLength(bytes)} bytes)`);
