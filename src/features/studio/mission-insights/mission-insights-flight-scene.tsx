import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { replayTimeline } from "./replay-sample";
import {
  buildDepthVisuals,
  colorFromToken,
  interpolatePosition,
  makeLine,
  vectorFor,
  type DepthVisual,
} from "./mission-insights-flight-scene-geometry";

export type ReplayCamera = "3d" | "top" | "side" | "chase";

export type ReplayLayers = {
  follow: boolean;
  future: boolean;
  nearGround: boolean;
  mixedRange: boolean;
  seenEmptyLater: boolean;
};

type SceneRuntime = {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  renderer: THREE.WebGLRenderer;
  drone: THREE.Group;
  trail: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  depthVisuals: DepthVisual[];
  resizeObserver: ResizeObserver;
  frameId: number;
  center: THREE.Vector3;
  span: number;
};

export function MissionInsightsFlightScene({
  time,
  cameraMode,
  layers,
}: {
  time: number;
  cameraMode: ReplayCamera;
  layers: ReplayLayers;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<SceneRuntime | null>(null);
  const [renderError, setRenderError] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let runtime: SceneRuntime | null = null;
    let pendingRenderer: THREE.WebGLRenderer | null = null;
    try {
      const scene = new THREE.Scene();
      scene.background = colorFromToken("--card", "#171717");
      const camera = new THREE.PerspectiveCamera(50, 1, 0.05, 500);
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      pendingRenderer = renderer;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.domElement.className = "block h-full w-full";
      renderer.domElement.setAttribute("aria-hidden", "true");
      mount.appendChild(renderer.domElement);
      scene.add(new THREE.AmbientLight(0xffffff, 1.4));
      const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
      keyLight.position.set(20, 28, 16);
      scene.add(keyLight);

      const tokenColors = {
        primary: colorFromToken("--primary", "#6d5ce8"),
        success: colorFromToken("--success", "#18b86b"),
        warning: colorFromToken("--warning", "#e1a322"),
        danger: colorFromToken("--destructive", "#e05252"),
        foreground: colorFromToken("--foreground", "#f5f5f5"),
        muted: colorFromToken("--muted-foreground", "#858585"),
        border: colorFromToken("--border", "#414141"),
      };
      const positions = replayTimeline.samples.map((sample) =>
        vectorFor(sample.n, sample.e, -sample.d),
      );
      const minX = Math.min(...positions.map((point) => point.x));
      const maxX = Math.max(...positions.map((point) => point.x));
      const minZ = Math.min(...positions.map((point) => point.z));
      const maxZ = Math.max(...positions.map((point) => point.z));
      const span = Math.max(maxX - minX, maxZ - minZ, 8);
      const center = new THREE.Vector3((minX + maxX) / 2, 0, (minZ + maxZ) / 2);

      const grid = new THREE.GridHelper(
        span + 8,
        Math.ceil(span + 8),
        tokenColors.border,
        tokenColors.border,
      );
      grid.material.transparent = true;
      grid.material.opacity = 0.55;
      scene.add(grid);

      const route = makeLine(positions, tokenColors.muted, 0.6, true);
      scene.add(route);
      const trail = makeLine(
        [positions[0]],
        tokenColors.primary,
      ) as SceneRuntime["trail"];
      scene.add(trail);

      const drone = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.75, 0.3, 0.75),
        new THREE.MeshStandardMaterial({
          color: tokenColors.primary,
          roughness: 0.55,
        }),
      );
      drone.add(body);
      const nose = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 0.12, 0.5),
        new THREE.MeshStandardMaterial({
          color: tokenColors.foreground,
          roughness: 0.6,
        }),
      );
      nose.position.z = -0.42;
      drone.add(nose);
      const waypointGeometry = new THREE.BoxGeometry(0.22, 0.22, 0.22);
      const waypointMaterial = new THREE.MeshBasicMaterial({
        color: tokenColors.success,
      });
      const targets = new Set<string>();
      for (const sample of replayTimeline.samples) {
        const targetKey = `${sample.tn}:${sample.te}:${sample.td}`;
        if (targets.has(targetKey)) continue;
        targets.add(targetKey);
        const waypoint = new THREE.Mesh(waypointGeometry, waypointMaterial);
        waypoint.position.copy(vectorFor(sample.tn, sample.te, -sample.td));
        scene.add(waypoint);
      }
      for (const report of replayTimeline.reports) {
        const marker = new THREE.Mesh(
          new THREE.BoxGeometry(0.2, 0.2, 0.2),
          new THREE.MeshBasicMaterial({ color: tokenColors.warning }),
        );
        marker.position.copy(vectorFor(report.n, report.e, -report.d));
        scene.add(marker);
      }
      scene.add(drone);

      const depthVisuals = buildDepthVisuals(scene, {
        warning: tokenColors.danger,
        success: tokenColors.success,
        border: tokenColors.border,
      });
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.minDistance = 1;
      controls.maxDistance = span * 5;
      controls.target.copy(center);

      const resizeObserver = new ResizeObserver(() => {
        const width = Math.max(1, mount.clientWidth);
        const height = Math.max(1, mount.clientHeight);
        renderer.setSize(width, height);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      });
      resizeObserver.observe(mount);
      const animate = () => {
        if (!runtime) return;
        runtime.controls.update();
        runtime.renderer.render(runtime.scene, runtime.camera);
        runtime.frameId = window.requestAnimationFrame(animate);
      };
      runtime = {
        scene,
        camera,
        controls,
        renderer,
        drone,
        trail,
        depthVisuals,
        resizeObserver,
        frameId: 0,
        center,
        span,
      };
      runtimeRef.current = runtime;
      runtime.frameId = window.requestAnimationFrame(animate);
      setRenderError(false);
    } catch {
      if (runtime) {
        runtime.renderer.dispose();
        runtime.renderer.domElement.remove();
      } else {
        pendingRenderer?.dispose();
        pendingRenderer?.domElement.remove();
      }
      setRenderError(true);
    }

    return () => {
      if (!runtime) return;
      window.cancelAnimationFrame(runtime.frameId);
      runtime.resizeObserver.disconnect();
      runtime.controls.dispose();
      runtime.scene.traverse((object) => {
        if (
          object instanceof THREE.Mesh ||
          object instanceof THREE.Line ||
          object instanceof THREE.Points
        ) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material)
            ? object.material
            : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
      runtime.renderer.dispose();
      runtime.renderer.domElement.remove();
      runtimeRef.current = null;
    };
  }, []);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    const position = interpolatePosition(time);
    runtime.drone.position.copy(
      vectorFor(position.n, position.e, position.alt),
    );
    runtime.drone.rotation.y = (-position.yaw * Math.PI) / 180;

    const visited = replayTimeline.samples
      .filter((sample) => sample.t <= time)
      .map((sample) => vectorFor(sample.n, sample.e, -sample.d));
    visited.push(vectorFor(position.n, position.e, position.alt));
    runtime.trail.geometry.dispose();
    runtime.trail.geometry = new THREE.BufferGeometry().setFromPoints(visited);

    for (const visual of runtime.depthVisuals) {
      const past = visual.time <= time;
      const visible =
        (past || layers.future) &&
        (layers.nearGround || visual.top >= 0.8) &&
        (layers.mixedRange || !visual.mixed);
      const current = past && time - visual.time < 1.6;
      visual.panel.visible = visible;
      visual.edge.visible = visible;
      visual.median.visible = visible;
      visual.dot.visible = visible;
      visual.ray.visible = visible && current;
      visual.clearPoints.visible =
        visible && layers.seenEmptyLater && (past || layers.future);
      visual.panel.material.opacity = current ? 0.42 : past ? 0.18 : 0.06;
    }

    const target = layers.follow
      ? vectorFor(position.n, position.e, position.alt)
      : runtime.center;
    runtime.controls.target.copy(target);
    const offset = runtime.span;
    if (cameraMode === "top") {
      runtime.camera.position.set(target.x, offset * 1.8, target.z + 0.01);
    } else if (cameraMode === "side") {
      runtime.camera.position.set(
        target.x + offset * 1.6,
        offset * 0.42,
        target.z,
      );
    } else if (cameraMode === "chase") {
      const yaw = (position.yaw * Math.PI) / 180;
      runtime.camera.position.set(
        target.x - Math.sin(yaw) * 3.4,
        target.y + 1.7,
        target.z + Math.cos(yaw) * 3.4,
      );
    } else {
      runtime.camera.position.set(
        target.x + offset * 0.75,
        offset * 0.68,
        target.z + offset * 0.82,
      );
    }
    runtime.camera.lookAt(target);
    runtime.controls.update();
  }, [time, cameraMode, layers]);

  return (
    <div
      className="relative h-[clamp(28rem,45vw,30rem)] min-w-0 overflow-hidden rounded-(--radius) border border-border bg-(--card)"
      role="img"
      aria-label="Three-dimensional sample flight path, position, waypoint and depth observation replay"
      data-testid="ms-insights-flight-scene"
    >
      <div ref={mountRef} className="h-full w-full" />
      {renderError ? (
        <p className="absolute inset-x-4 bottom-4 m-0 rounded-(--radius) border border-border bg-(--card) p-3 text-(--muted-foreground)">
          The 3D scene could not start in this browser. Replay controls, values,
          charts, and planner events remain available below.
        </p>
      ) : null}
      <span className="sr-only">
        Relative north/east/down flight samples. Select a planner event or move
        the replay slider to update the position marker.
      </span>
    </div>
  );
}
