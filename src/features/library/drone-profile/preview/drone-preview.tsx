import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { DroneGeometry } from "@/domain/drone-geometry";
import { createDroneGeometry, disposeGroup } from "./drone-geometry";

type ViewMode = "isometric" | "top" | "front";

type Props = {
  profile: DroneGeometry;
  viewMode: ViewMode;
  resetKey: number;
};

type PointerState = {
  down: boolean;
  x: number;
  y: number;
  dragMode: "orbit" | "pan" | "pitch";
  theta: number;
  phi: number;
  radius: number;
  targetX: number;
  targetY: number;
  targetZ: number;
};

function setViewAngles(controls: PointerState, viewMode: ViewMode) {
  if (viewMode === "isometric") {
    controls.theta = Math.PI * 0.23;
    controls.phi = 0.76;
  } else if (viewMode === "top") {
    controls.theta = 0;
    controls.phi = 0.12;
  } else {
    controls.theta = Math.PI / 2;
    controls.phi = Math.PI / 2.05;
  }
}

export function DronePreview({ profile, viewMode, resetKey }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const modelRef = useRef<THREE.Group | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const pointerRef = useRef<PointerState>({
    down: false,
    x: 0,
    y: 0,
    dragMode: "orbit" as "orbit" | "pan" | "pitch",
    theta: Math.PI * 0.23,
    phi: 0.76,
    radius: 1.18,
    targetX: 0,
    targetY: 0,
    targetZ: 0,
  });

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#11131a");
    const camera = new THREE.PerspectiveCamera(34, 1, 0.01, 100);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.domElement.setAttribute(
      "aria-label",
      "Interactive three-dimensional drone preview",
    );
    renderer.domElement.setAttribute("role", "img");
    host.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight("#d7e0ff", "#30323a", 2.05));
    const key = new THREE.DirectionalLight("#ffffff", 3.1);
    key.position.set(-1.5, 2.7, 2.2);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    scene.add(key);
    const rim = new THREE.DirectionalLight("#8072ff", 1.4);
    rim.position.set(2.2, 1.4, -1.5);
    scene.add(rim);

    const grid = new THREE.GridHelper(2.2, 22, "#414357", "#292c39");
    grid.position.y = -0.22;
    if (Array.isArray(grid.material))
      grid.material.forEach((material) => {
        material.transparent = true;
        material.opacity = 0.54;
      });
    else {
      grid.material.transparent = true;
      grid.material.opacity = 0.54;
    }
    scene.add(grid);

    const axes = new THREE.Group();
    const axisDefinitions = [
      { end: new THREE.Vector3(0.35, 0, 0), color: "#ff545f" },
      { end: new THREE.Vector3(0, 0.35, 0), color: "#4388ff" },
      { end: new THREE.Vector3(0, 0, 0.35), color: "#3bd0ad" },
    ];
    for (const axis of axisDefinitions) {
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(),
        axis.end,
      ]);
      axes.add(
        new THREE.Line(
          geometry,
          new THREE.LineBasicMaterial({ color: axis.color }),
        ),
      );
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.007, 8, 6),
        new THREE.MeshBasicMaterial({ color: axis.color }),
      );
      dot.position.copy(axis.end);
      axes.add(dot);
    }
    scene.add(axes);

    const model = new THREE.Group();
    scene.add(model);
    sceneRef.current = scene;
    modelRef.current = model;
    cameraRef.current = camera;
    rendererRef.current = renderer;

    const resize = () => {
      const width = Math.max(1, host.clientWidth);
      const height = Math.max(1, host.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    let frame = 0;
    const render = () => {
      const { theta, phi, radius } = pointerRef.current;
      const { targetX, targetY, targetZ } = pointerRef.current;
      const target = new THREE.Vector3(targetX, targetY, targetZ);
      camera.position.set(
        target.x + radius * Math.sin(phi) * Math.cos(theta),
        target.y + radius * Math.cos(phi),
        target.z + radius * Math.sin(phi) * Math.sin(theta),
      );
      camera.lookAt(target);
      renderer.render(scene, camera);
      frame = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.dispose();
      const generatedModel = modelRef.current?.children[0];
      if (generatedModel instanceof THREE.Group) disposeGroup(generatedModel);
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
          object.geometry.dispose();
          if (object instanceof THREE.Line) {
            const material = object.material;
            if (Array.isArray(material))
              material.forEach((entry) => entry.dispose());
            else material.dispose();
          }
        }
      });
      renderer.domElement.remove();
      sceneRef.current = null;
      rendererRef.current = null;
      cameraRef.current = null;
      modelRef.current = null;
    };
  }, []);

  useEffect(() => {
    const parent = modelRef.current;
    if (!parent) return;
    const previous = parent.children[0];
    if (previous) {
      parent.remove(previous);
      disposeGroup(previous as THREE.Group);
    }
    parent.add(createDroneGeometry(profile));
  }, [profile]);

  useEffect(() => {
    setViewAngles(pointerRef.current, viewMode);
  }, [viewMode]);

  useEffect(() => {
    const controls = pointerRef.current;
    controls.radius = 1.18;
    controls.targetX = 0;
    controls.targetY = 0;
    controls.targetZ = 0;
    setViewAngles(controls, viewMode);
  }, [resetKey, viewMode]);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary || event.button !== 0) return;
    pointerRef.current.down = true;
    pointerRef.current.x = event.clientX;
    pointerRef.current.y = event.clientY;
    pointerRef.current.dragMode = event.altKey
      ? "pitch"
      : event.metaKey || event.shiftKey || event.ctrlKey
        ? "pan"
        : "orbit";
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const controls = pointerRef.current;
    if (!controls.down) return;
    const dx = event.clientX - controls.x;
    const dy = event.clientY - controls.y;
    const sensitivity =
      (2 * Math.PI) / Math.max(event.currentTarget.clientHeight, 1);
    if (controls.dragMode === "orbit") {
      controls.theta += dx * sensitivity;
      controls.phi = THREE.MathUtils.clamp(
        controls.phi - dy * sensitivity,
        0.12,
        Math.PI - 0.12,
      );
    } else if (controls.dragMode === "pitch") {
      controls.phi = THREE.MathUtils.clamp(
        controls.phi - dy * sensitivity,
        0.12,
        Math.PI - 0.12,
      );
    } else {
      const host = event.currentTarget;
      const camera = cameraRef.current;
      const fov = THREE.MathUtils.degToRad(camera?.fov ?? 34);
      const metersPerPixel =
        (2 * controls.radius * Math.tan(fov / 2)) /
        Math.max(host.clientWidth, 1);
      const rightX = Math.sin(controls.theta);
      const rightZ = -Math.cos(controls.theta);
      const forwardX = -Math.cos(controls.theta);
      const forwardZ = -Math.sin(controls.theta);
      const sinPitch = Math.max(Math.abs(Math.cos(controls.phi)), 0.2);
      const panX = THREE.MathUtils.clamp(dx, -100, 100);
      const panY = THREE.MathUtils.clamp(dy, -100, 100);
      controls.targetX +=
        (-panX * rightX + (panY * forwardX) / sinPitch) * metersPerPixel;
      controls.targetZ +=
        (-panX * rightZ + (panY * forwardZ) / sinPitch) * metersPerPixel;
    }
    controls.x = event.clientX;
    controls.y = event.clientY;
  };
  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    pointerRef.current.down = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const onWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    pointerRef.current.radius = THREE.MathUtils.clamp(
      pointerRef.current.radius + event.deltaY * 0.001,
      0.75,
      3.2,
    );
  };

  return (
    <div
      className="h-full min-h-72 w-full touch-none cursor-grab active:cursor-grabbing [&_canvas]:block [&_canvas]:size-full"
      ref={hostRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={onWheel}
      aria-label="Drone preview. Drag to orbit, Shift, Command, or Control-drag to pan, Alt-drag to adjust pitch, and scroll to zoom."
    />
  );
}
