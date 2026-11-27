import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { DroneGeometry } from "@/domain/drone-geometry";
import {
  createDroneGeometry,
  disposeGroup,
  setDroneGeometryTheme,
} from "./drone-geometry";

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

const DEFAULT_CAMERA_RADIUS = 1.5;

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
    radius: DEFAULT_CAMERA_RADIUS,
    targetX: 0,
    targetY: 0,
    targetZ: 0,
  });

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      pointerRef.current.radius = THREE.MathUtils.clamp(
        pointerRef.current.radius + event.deltaY * 0.001,
        0.75,
        3.2,
      );
    };
    host.addEventListener("wheel", handleWheel, { passive: false });
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#33373a");
    const camera = new THREE.PerspectiveCamera(34, 1, 0.01, 100);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.96;
    renderer.domElement.setAttribute(
      "aria-label",
      "Interactive three-dimensional drone preview",
    );
    renderer.domElement.setAttribute("role", "img");
    host.appendChild(renderer.domElement);

    const hemisphere = new THREE.HemisphereLight("#f7f7f7", "#444649", 1.8);
    scene.add(hemisphere);
    const key = new THREE.DirectionalLight("#f7f7f7", 2.6);
    key.position.set(-1.5, 2.7, 2.2);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    scene.add(key);
    const rim = new THREE.DirectionalLight("#eceeef", 0.42);
    rim.position.set(2.2, 1.4, -1.5);
    scene.add(rim);

    const grid = new THREE.GridHelper(2.2, 22, "#595c5f", "#494c50");
    grid.position.y = -0.22;
    scene.add(grid);

    const applyTheme = () => {
      const isDark = document.documentElement.classList.contains("dark");
      if (scene.background instanceof THREE.Color)
        scene.background.set(isDark ? "#33373a" : "#ffffff");
      hemisphere.color.set("#f7f7f7");
      hemisphere.groundColor.set(isDark ? "#3e4245" : "#969da1");
      hemisphere.intensity = isDark ? 1.8 : 1.65;
      key.intensity = isDark ? 2.6 : 2.05;
      renderer.toneMappingExposure = isDark ? 0.96 : 1.1;
      rim.intensity = isDark ? 0.42 : 0.22;
      rim.color.set(isDark ? "#eceeef" : "#f5f6f6");
      const gridColors = grid.geometry.getAttribute("color");
      const centerLineColor = new THREE.Color(isDark ? "#595c5f" : "#9e9e9e");
      const minorLineColor = new THREE.Color(isDark ? "#494c50" : "#9e9e9e");
      const centerDivision = 11;
      for (let vertex = 0; vertex < gridColors.count; vertex += 1) {
        const color =
          Math.floor(vertex / 4) === centerDivision
            ? centerLineColor
            : minorLineColor;
        gridColors.setXYZ(vertex, color.r, color.g, color.b);
      }
      gridColors.needsUpdate = true;
      grid.material.transparent = true;
      grid.material.opacity = isDark ? 0.22 : 0.14;
      grid.material.depthWrite = false;
      setDroneGeometryTheme(isDark);
    };
    applyTheme();
    const themeObserver = new MutationObserver(applyTheme);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    const axes = new THREE.Group();
    const axisHeadMaterials: THREE.MeshBasicMaterial[] = [];
    const axisLength = 0.35;
    const arrowHeadLength = 0.028;
    const axisDefinitions = [
      { direction: new THREE.Vector3(1, 0, 0), color: "#ed2d4f" },
      { direction: new THREE.Vector3(0, 1, 0), color: "#1bc877" },
      { direction: new THREE.Vector3(0, 0, 1), color: "#3478ed" },
    ];
    for (const axis of axisDefinitions) {
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(),
        axis.direction.clone().multiplyScalar(axisLength - arrowHeadLength),
      ]);
      const line = new THREE.Line(
        geometry,
        new THREE.LineBasicMaterial({
          color: axis.color,
          depthTest: true,
          depthWrite: false,
        }),
      );
      line.renderOrder = 10;
      const arrowMaterial = new THREE.MeshBasicMaterial({
        color: axis.color,
        depthTest: true,
        depthWrite: false,
      });
      axisHeadMaterials.push(arrowMaterial);
      const arrowHead = new THREE.Mesh(
        new THREE.ConeGeometry(0.008, arrowHeadLength, 12, 1),
        arrowMaterial,
      );
      arrowHead.position
        .copy(axis.direction)
        .multiplyScalar(axisLength - arrowHeadLength / 2);
      arrowHead.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        axis.direction,
      );
      arrowHead.renderOrder = 10;
      axes.add(line, arrowHead);
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
      themeObserver.disconnect();
      host.removeEventListener("wheel", handleWheel);
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
      axisHeadMaterials.forEach((material) => material.dispose());
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
    controls.radius = DEFAULT_CAMERA_RADIUS;
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
  return (
    <div
      className="h-full min-h-72 w-full touch-none overscroll-contain cursor-grab active:cursor-grabbing [&_canvas]:block [&_canvas]:size-full"
      ref={hostRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      aria-label="Drone preview. Drag to orbit, Shift, Command, or Control-drag to pan, Alt-drag to adjust pitch, and scroll to zoom."
    />
  );
}
