import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { getDronePayloads, type DroneGeometry } from "@/domain/drone-geometry";

const steel = new THREE.MeshStandardMaterial({
  color: "#b5b9bb",
  metalness: 0,
  roughness: 0.9,
});
const shell = new THREE.MeshStandardMaterial({
  color: "#c9ccce",
  metalness: 0,
  roughness: 0.92,
});
const frameDetail = new THREE.MeshStandardMaterial({
  color: "#a3a7a9",
  metalness: 0,
  roughness: 0.9,
});
const darkRubber = new THREE.MeshStandardMaterial({
  color: "#303235",
  metalness: 0.02,
  roughness: 0.86,
});
const rotorMaterial = new THREE.MeshStandardMaterial({
  color: "#e1e3e4",
  metalness: 0,
  roughness: 0.92,
});
const payloadMaterial = new THREE.MeshStandardMaterial({
  color: "#c2c6c8",
  metalness: 0,
  roughness: 0.92,
});
const rotorGuideMaterial = new THREE.MeshBasicMaterial({
  color: "#9a9da0",
  transparent: true,
  opacity: 0.18,
  side: THREE.DoubleSide,
  depthWrite: false,
});

export function setDroneGeometryTheme(isDark: boolean) {
  shell.color.set(isDark ? "#aeb1b3" : "#c9ccce");
  steel.color.set(isDark ? "#94989b" : "#b5b9bb");
  frameDetail.color.set(isDark ? "#7d8285" : "#a3a7a9");
  rotorMaterial.color.set(isDark ? "#cacdce" : "#e1e3e4");
  payloadMaterial.color.set(isDark ? "#a6aaac" : "#c2c6c8");
  rotorGuideMaterial.color.set(isDark ? "#8a8d90" : "#9a9da0");
}

function roundedBox(
  sizeX: number,
  sizeY: number,
  sizeZ: number,
  radius: number,
) {
  return new RoundedBoxGeometry(
    sizeX,
    sizeY,
    sizeZ,
    3,
    Math.max(0.001, Math.min(radius, sizeX * 0.45, sizeY * 0.45, sizeZ * 0.45)),
  );
}

function addBox(
  group: THREE.Group,
  size: [number, number, number],
  pos: [number, number, number],
  material: THREE.Material,
  radius = 0.0015,
) {
  const mesh = new THREE.Mesh(
    roundedBox(size[0], size[1], size[2], radius),
    material,
  );
  mesh.position.set(pos[0], pos[1], pos[2]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function addBeam(
  group: THREE.Group,
  start: THREE.Vector3,
  end: THREE.Vector3,
  width: number,
  height: number,
  material: THREE.Material,
) {
  const delta = new THREE.Vector3().subVectors(end, start);
  const mesh = new THREE.Mesh(
    roundedBox(width, delta.length(), height, Math.min(width, height) * 0.32),
    material,
  );
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    delta.normalize(),
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function rotorMotorHeight(diameter: number) {
  return Math.max(0.024, diameter * 0.18);
}

function addRotor(
  group: THREE.Group,
  x: number,
  z: number,
  rotorPlaneY: number,
  diameter: number,
) {
  const motorRadius = Math.max(0.018, diameter * 0.13);
  const motorHeight = rotorMotorHeight(diameter);
  const motorPodHeight = motorHeight * 1.3;
  const motorDatumY = rotorPlaneY - motorHeight * 0.52;
  const can = new THREE.Mesh(
    new THREE.CylinderGeometry(
      motorRadius,
      motorRadius * 1.08,
      motorPodHeight,
      24,
    ),
    frameDetail,
  );
  can.position.set(x, motorDatumY - motorHeight * 0.33, z);
  can.castShadow = true;
  group.add(can);
  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(
      motorRadius * 0.78,
      motorRadius * 0.78,
      motorHeight * 0.24,
      24,
    ),
    shell,
  );
  cap.position.set(x, motorDatumY + motorHeight * 0.4, z);
  group.add(cap);
  const propY = rotorPlaneY;
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(diameter * 0.455, diameter * 0.48, 56),
    rotorGuideMaterial,
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(x, propY, z);
  group.add(ring);
  for (const direction of [0, Math.PI]) {
    const blade = new THREE.Mesh(
      roundedBox(
        diameter * 0.49,
        0.006,
        Math.max(0.009, diameter * 0.055),
        0.0025,
      ),
      rotorMaterial,
    );
    blade.position.set(x, propY + 0.003, z);
    blade.rotation.y = direction + 0.13;
    blade.castShadow = true;
    group.add(blade);
  }
  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(
      motorRadius * 0.32,
      motorRadius * 0.32,
      0.012,
      18,
    ),
    steel,
  );
  hub.position.set(x, propY + 0.008, z);
  group.add(hub);
}

export function createDroneGeometry(profile: DroneGeometry) {
  const group = new THREE.Group();
  const {
    bodyX,
    bodyY,
    bodyZ,
    hubX,
    hubY,
    rotorZ,
    propellerDiameter,
    gearX,
    gearY,
    gearZ,
    skidSpacing,
  } = profile;
  const shellDepth = Math.max(0.03, bodyY * 0.92);
  const shellWidth = Math.max(0.03, bodyX * 0.92);

  // Body dimensions map directly to profile X, Y and Z. Three.js uses Y as up.
  addBox(
    group,
    [bodyX, bodyZ, bodyY],
    [0, 0, 0],
    shell,
    Math.min(bodyX, bodyY, bodyZ) * 0.05,
  );
  addBox(
    group,
    [shellWidth * 0.7, Math.max(0.014, bodyZ * 0.18), shellDepth * 0.66],
    [0, bodyZ * 0.5 + bodyZ * 0.09, 0],
    frameDetail,
    Math.min(shellWidth, shellDepth) * 0.04,
  );

  const corners = [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ] as const;
  const motorHeight = rotorMotorHeight(propellerDiameter);
  const motorDatumY = rotorZ - motorHeight * 0.52;
  const armWidth = Math.max(0.025, bodyY * 0.19);
  const armHeight = Math.max(0.022, bodyZ * 0.32);
  const motorMountY =
    motorDatumY -
    motorHeight * 0.68 +
    Math.min(motorHeight * 0.3, armHeight * 0.6);
  for (const [sx, sz] of corners) {
    const hubXPos = sx * hubX;
    const hubZPos = sz * hubY;
    const start = new THREE.Vector3(
      sx * bodyX * 0.24,
      bodyZ * 0.08,
      sz * bodyY * 0.24,
    );
    const end = new THREE.Vector3(hubXPos, motorMountY, hubZPos);
    const armDirection = new THREE.Vector3().subVectors(end, start);
    addBeam(group, start, end, armWidth, armHeight, steel);

    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(
        Math.hypot(armWidth, armHeight) * 0.53,
        Math.hypot(armWidth, armHeight) * 0.53,
        0.012,
        20,
      ),
      frameDetail,
    );
    band.position.copy(start).addScaledVector(armDirection, 0.42);
    band.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      armDirection.normalize(),
    );
    group.add(band);

    addRotor(group, hubXPos, hubZPos, rotorZ, propellerDiameter);
  }

  // Two rectangular skids, centered below the body and separated by profile spacing.
  const gearDrop = Math.max(bodyZ * 1.2, gearZ * 3);
  const skidVertical = -bodyZ / 2 - gearDrop - gearZ / 2;
  for (const side of [-1, 1]) {
    const z = (side * skidSpacing) / 2;
    const bodyMountZ = side * Math.min(Math.abs(z) * 0.3, bodyY * 0.32);
    addBox(
      group,
      [gearX, gearZ, gearY],
      [0, skidVertical, z],
      frameDetail,
      Math.min(gearY, gearZ) * 0.06,
    );
    const xFoot = Math.min(gearX * 0.34, bodyX * 0.38);
    const supportWidth = Math.max(0.012, gearY * 0.72);
    const railOverlap = Math.min(gearZ * 0.45, supportWidth * 1.2);
    for (const x of [-xFoot, xFoot]) {
      addBeam(
        group,
        new THREE.Vector3(x, -bodyZ / 2 + bodyZ * 0.28, bodyMountZ),
        new THREE.Vector3(x, skidVertical + gearZ / 2 - railOverlap, z),
        supportWidth,
        supportWidth,
        steel,
      );
    }
  }

  for (const payload of getDronePayloads(profile)) {
    addBox(
      group,
      [payload.boxX, payload.boxZ, payload.boxY],
      [payload.positionX, payload.positionZ, payload.positionY],
      payloadMaterial,
      Math.min(payload.boxX, payload.boxY, payload.boxZ) * 0.035,
    );
    const lens = new THREE.Mesh(
      new THREE.CylinderGeometry(
        Math.min(payload.boxX, payload.boxY) * 0.16,
        Math.min(payload.boxX, payload.boxY) * 0.16,
        0.018,
        18,
      ),
      darkRubber,
    );
    // The camera front faces the drone's +X direction.
    lens.rotation.z = -Math.PI / 2;
    lens.position.set(
      payload.positionX + payload.boxX * 0.53,
      payload.positionZ,
      payload.positionY,
    );
    group.add(lens);
  }

  const datum = new THREE.Mesh(
    new THREE.SphereGeometry(0.009, 16, 12),
    new THREE.MeshBasicMaterial({ color: "#f4f4f5" }),
  );
  datum.position.set(0, 0, 0);
  group.add(datum);
  return group;
}

export function disposeGroup(group: THREE.Group) {
  group.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.geometry.dispose();
      if (Array.isArray(object.material))
        object.material.forEach((material) => material.dispose());
      else if (
        ![
          steel,
          shell,
          frameDetail,
          darkRubber,
          rotorMaterial,
          payloadMaterial,
          rotorGuideMaterial,
        ].includes(object.material as THREE.MeshStandardMaterial)
      )
        object.material.dispose();
    }
  });
}
