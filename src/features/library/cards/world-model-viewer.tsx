import {
  ArrowCounterClockwiseIcon,
  HandIcon,
  MinusIcon,
  PlusIcon,
} from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { Button } from "skytrack-ui/button";

type PreviewStatus = "loading" | "ready" | "error" | "unavailable";
type OrbitControlsInstance = InstanceType<
  typeof import("three/addons/controls/OrbitControls.js").OrbitControls
>;

function disposeModel(root: import("three").Object3D): void {
  const disposedTextures = new Set<import("three").Texture>();
  root.traverse((object) => {
    if (!(object as import("three").Mesh).isMesh) return;
    const mesh = object as import("three").Mesh;
    mesh.geometry?.dispose();
    const materials = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material];
    for (const material of materials) {
      for (const value of Object.values(material)) {
        if (
          !value ||
          typeof value !== "object" ||
          !(value as import("three").Texture).isTexture
        ) {
          continue;
        }
        const texture = value as import("three").Texture;
        if (disposedTextures.has(texture)) continue;
        disposedTextures.add(texture);
        texture.dispose();
      }
      material.dispose();
    }
  });
}

export function WorldModelViewer({
  assetId,
  worldName,
}: {
  assetId?: string;
  worldName: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const controlsRef = useRef<OrbitControlsInstance | null>(null);
  const zoomRef = useRef<((direction: -1 | 1) => void) | null>(null);
  const resetRef = useRef<(() => void) | null>(null);
  const mouseMapRef = useRef<{ pan: number; rotate: number } | null>(null);
  const [status, setStatus] = useState<PreviewStatus>(
    assetId ? "loading" : "unavailable",
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [panMode, setPanMode] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const panModeRef = useRef(panMode);
  panModeRef.current = panMode;

  useEffect(() => {
    const controls = controlsRef.current;
    const mouseMap = mouseMapRef.current;
    if (controls && mouseMap) {
      controls.mouseButtons.LEFT = panMode ? mouseMap.pan : mouseMap.rotate;
    }
  }, [panMode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!assetId || !canvas) {
      setStatus("unavailable");
      return;
    }

    let cancelled = false;
    let renderer: import("three").WebGLRenderer | null = null;
    let controls: OrbitControlsInstance | null = null;
    let scene: import("three").Scene | null = null;
    let modelRoot: import("three").Object3D | null = null;
    let renderFrame = 0;
    let observer: ResizeObserver | null = null;
    let renderListener: (() => void) | null = null;
    let windowResizeListener: (() => void) | null = null;
    setStatus("loading");
    setErrorMessage("");

    const releaseResources = () => {
      if (renderFrame) cancelAnimationFrame(renderFrame);
      renderFrame = 0;
      observer?.disconnect();
      observer = null;
      if (windowResizeListener) {
        window.removeEventListener("resize", windowResizeListener);
        windowResizeListener = null;
      }
      if (controls && renderListener) {
        controls.removeEventListener("change", renderListener);
      }
      controls?.dispose();
      if (controlsRef.current === controls) controlsRef.current = null;
      controls = null;
      zoomRef.current = null;
      resetRef.current = null;
      mouseMapRef.current = null;
      if (modelRoot) disposeModel(modelRoot);
      modelRoot = null;
      scene?.clear();
      scene = null;
      renderer?.dispose();
      renderer?.forceContextLoss();
      renderer = null;
    };

    const start = async () => {
      try {
        const [worldAssetAccess, THREE, { GLTFLoader }, { OrbitControls }] =
          await Promise.all([
            import("../database/world-glb-asset-access"),
            import("three"),
            import("three/addons/loaders/GLTFLoader.js"),
            import("three/addons/controls/OrbitControls.js"),
          ]);
        const modelBlob = await worldAssetAccess.loadWorldGlbModel(assetId);
        if (!modelBlob) {
          throw new Error("The GLB model for this World could not be found.");
        }

        const gltf = await new GLTFLoader().parseAsync(
          await modelBlob.arrayBuffer(),
          "",
        );
        const root = gltf.scene ?? gltf.scenes[0];
        if (!root) {
          throw new Error("This file does not contain a visible 3D scene.");
        }
        root.updateMatrixWorld(true);
        const bounds = new THREE.Box3().setFromObject(root);
        if (bounds.isEmpty()) {
          disposeModel(root);
          throw new Error("This file does not contain visible 3D geometry.");
        }
        if (cancelled) {
          disposeModel(root);
          return;
        }

        const center = bounds.getCenter(new THREE.Vector3());
        const radius = Math.max(
          bounds.getBoundingSphere(new THREE.Sphere()).radius,
          0.1,
        );
        const modelGroup = new THREE.Group();
        modelGroup.add(root);
        modelGroup.position.copy(center).multiplyScalar(-1);
        modelGroup.updateMatrixWorld(true);

        const nextScene = new THREE.Scene();
        nextScene.background = new THREE.Color(0x454b59);
        nextScene.add(modelGroup);
        nextScene.add(new THREE.HemisphereLight(0xffffff, 0x334155, 1.4));
        const keyLight = new THREE.DirectionalLight(0xffffff, 1.8);
        keyLight.position.set(radius, radius * 2, radius * 1.5);
        nextScene.add(keyLight);
        const fillLight = new THREE.DirectionalLight(0xb7c6dc, 0.8);
        fillLight.position.set(-radius, radius * 0.6, -radius);
        nextScene.add(fillLight);
        nextScene.add(new THREE.AmbientLight(0xffffff, 0.35));

        const container = canvas.parentElement;
        const width = Math.max(container?.clientWidth ?? 0, 1);
        const height = Math.max(container?.clientHeight ?? 0, 1);
        const camera = new THREE.PerspectiveCamera(
          42,
          width / height,
          0.01,
          100000,
        );
        const halfFovY = THREE.MathUtils.degToRad(camera.fov) / 2;
        const halfFovX = Math.atan(Math.tan(halfFovY) * camera.aspect);
        const distance =
          (radius / Math.sin(Math.min(halfFovY, halfFovX))) * 1.1;
        const initialPosition = new THREE.Vector3(1, 1, 1)
          .normalize()
          .multiplyScalar(distance);
        camera.position.copy(initialPosition);
        camera.up.set(0, 1, 0);
        camera.lookAt(0, 0, 0);
        camera.near = Math.max(0.01, distance - radius * 3);
        camera.far = distance + radius * 5;
        camera.updateProjectionMatrix();

        const nextRenderer = new THREE.WebGLRenderer({
          canvas,
          antialias: true,
          alpha: false,
          powerPreference: "low-power",
        });
        renderer = nextRenderer;
        scene = nextScene;
        modelRoot = root;
        nextRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        nextRenderer.setSize(width, height, false);
        nextRenderer.outputColorSpace = THREE.SRGBColorSpace;
        const nextControls = new OrbitControls(camera, nextRenderer.domElement);
        controls = nextControls;
        controlsRef.current = nextControls;
        nextControls.target.set(0, 0, 0);
        nextControls.enableDamping = false;
        nextControls.enablePan = true;
        nextControls.minDistance = radius * 0.15;
        nextControls.maxDistance = radius * 35;
        mouseMapRef.current = {
          pan: THREE.MOUSE.PAN,
          rotate: THREE.MOUSE.ROTATE,
        };
        nextControls.mouseButtons.LEFT = panModeRef.current
          ? THREE.MOUSE.PAN
          : THREE.MOUSE.ROTATE;

        const requestRender = () => {
          if (cancelled || renderFrame || !renderer) return;
          renderFrame = requestAnimationFrame(() => {
            renderFrame = 0;
            if (!cancelled && renderer && scene) {
              renderer.render(scene, camera);
            }
          });
        };
        renderListener = requestRender;
        nextControls.addEventListener("change", requestRender);
        zoomRef.current = (direction) => {
          const offset = camera.position.clone().sub(nextControls.target);
          const currentDistance = offset.length();
          const nextDistance = THREE.MathUtils.clamp(
            currentDistance * (direction > 0 ? 0.78 : 1.28),
            nextControls.minDistance,
            nextControls.maxDistance,
          );
          camera.position
            .copy(nextControls.target)
            .add(offset.normalize().multiplyScalar(nextDistance));
          nextControls.update();
        };
        resetRef.current = () => {
          nextControls.target.set(0, 0, 0);
          camera.position.copy(initialPosition);
          camera.up.set(0, 1, 0);
          nextControls.update();
        };

        const resize = () => {
          if (cancelled || !renderer) return;
          const nextWidth = Math.max(container?.clientWidth ?? 0, 1);
          const nextHeight = Math.max(container?.clientHeight ?? 0, 1);
          renderer.setSize(nextWidth, nextHeight, false);
          camera.aspect = nextWidth / nextHeight;
          camera.updateProjectionMatrix();
          requestRender();
        };
        if (container && typeof ResizeObserver !== "undefined") {
          observer = new ResizeObserver(resize);
          observer.observe(container);
        } else {
          windowResizeListener = resize;
          window.addEventListener("resize", resize);
        }
        setStatus("ready");
        requestRender();
      } catch (error) {
        if (cancelled) return;
        releaseResources();
        const message =
          error instanceof Error
            ? error.message
            : "The 3D preview could not be loaded.";
        setErrorMessage(message);
        setStatus("error");
      }
    };

    void start();
    return () => {
      cancelled = true;
      releaseResources();
    };
  }, [assetId, attempt]);

  const retry = () => setAttempt((current) => current + 1);

  return (
    <section
      className="ms-world-preview-viewer"
      aria-label={`${worldName} 3D preview`}
    >
      <div className="ms-world-preview-canvas-wrap">
        <canvas
          ref={canvasRef}
          className="ms-world-preview-canvas"
          aria-label={`Interactive 3D model of ${worldName}`}
        />
        {status === "loading" ? (
          <div className="ms-world-preview-state" role="status">
            Loading 3D preview…
          </div>
        ) : null}
        {status === "unavailable" ? (
          <div className="ms-world-preview-state" role="status">
            This World has no 3D model to preview.
          </div>
        ) : null}
        {status === "error" ? (
          <div
            className="ms-world-preview-state ms-world-preview-error"
            role="alert"
          >
            <span>{errorMessage}</span>
            <Button size="sm" variant="outline" onClick={retry}>
              Retry preview
            </Button>
          </div>
        ) : null}
        {status === "ready" ? (
          <div
            className="ms-world-preview-controls"
            aria-label="3D preview controls"
          >
            <span className="ms-world-preview-hint">
              Drag to orbit · Right-drag to pan · Scroll to zoom
            </span>
            <div className="ms-world-preview-control-buttons">
              <Button
                size="sm"
                variant={panMode ? "default" : "outline"}
                aria-label="Toggle pan mode"
                aria-pressed={panMode}
                onClick={() => setPanMode((value) => !value)}
              >
                <HandIcon aria-hidden="true" /> Pan
              </Button>
              <Button
                size="icon-sm"
                variant="outline"
                aria-label="Zoom out"
                onClick={() => zoomRef.current?.(-1)}
              >
                <MinusIcon aria-hidden="true" />
              </Button>
              <Button
                size="icon-sm"
                variant="outline"
                aria-label="Zoom in"
                onClick={() => zoomRef.current?.(1)}
              >
                <PlusIcon aria-hidden="true" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                aria-label="Reset 3D view"
                onClick={() => resetRef.current?.()}
              >
                <ArrowCounterClockwiseIcon aria-hidden="true" /> Reset
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
