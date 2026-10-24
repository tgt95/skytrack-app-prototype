import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import droneGeometryUrl from "../../assets/minipro-v6-login-geometry.glb?url";

type LoginDroneProps = {
  isDark: boolean;
  reducedMotion: boolean;
};

export default function LoginDrone({ isDark, reducedMotion }: LoginDroneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lookRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "low-power",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 20);
    // Match the source SVG camera after Blender's Z-up to glTF's Y-up conversion.
    camera.up.set(0, 0.906183, -0.422885);
    camera.position.set(0, 0.7367 - 0.1067, 1.4443 - 0.0943);
    camera.lookAt(0, 0, 0);

    const droneRoot = new THREE.Group();
    scene.add(droneRoot);
    const lineMaterial = new THREE.LineBasicMaterial({
      color: isDark ? 0xf5f5f5 : 0x171717,
      transparent: true,
      opacity: 0.94,
      depthTest: true,
      depthWrite: false,
    });
    const occlusionMaterial = new THREE.MeshBasicMaterial({
      colorWrite: false,
      depthWrite: true,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });
    let disposed = false;
    let frame = 0;
    const clock = new THREE.Clock();
    const loader = new GLTFLoader();

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      renderer.setSize(bounds.width, bounds.height, false);
      camera.aspect = bounds.width / bounds.height;
      camera.updateProjectionMatrix();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    resize();

    loader.load(droneGeometryUrl, (gltf) => {
      if (disposed) return;
      gltf.scene.traverse((node) => {
        if (!(node instanceof THREE.Mesh)) return;
        const geometry = node.geometry.clone();
        geometry.deleteAttribute("normal");
        geometry.deleteAttribute("uv");
        geometry.deleteAttribute("color");
        geometry.clearGroups();
        const welded = mergeVertices(geometry, 0.0001);
        welded.computeVertexNormals();
        const edges = new THREE.EdgesGeometry(welded, 38);
        const lines = new THREE.LineSegments(edges, lineMaterial);
        lines.renderOrder = 1;
        node.add(lines);
        node.material = occlusionMaterial;
        geometry.dispose();
        welded.dispose();
      });
      droneRoot.add(gltf.scene);
    });

    const handleWindowPointerMove = (event: globalThis.PointerEvent) => {
      if (reducedMotion || event.pointerType === "touch") return;
      lookRef.current = {
        x: THREE.MathUtils.clamp(
          (event.clientY / window.innerHeight - 0.5) * -0.42,
          -0.16,
          0.16,
        ),
        y: THREE.MathUtils.clamp(
          (event.clientX / window.innerWidth - 0.5) * 0.86,
          -0.3,
          0.3,
        ),
      };
    };
    window.addEventListener("pointermove", handleWindowPointerMove);

    const render = () => {
      frame = window.requestAnimationFrame(render);
      const elapsed = clock.getElapsedTime();
      if (!reducedMotion) {
        droneRoot.rotation.x +=
          (lookRef.current.x - droneRoot.rotation.x) * 0.09;
        droneRoot.rotation.y +=
          (lookRef.current.y - droneRoot.rotation.y) * 0.09;
        droneRoot.position.z = Math.sin(elapsed * 1.35) * 0.009;
      }
      renderer.render(scene, camera);
    };
    render();

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", handleWindowPointerMove);
      resizeObserver.disconnect();
      droneRoot.traverse((node) => {
        if (node instanceof THREE.Mesh || node instanceof THREE.LineSegments) {
          node.geometry.dispose();
        }
      });
      lineMaterial.dispose();
      occlusionMaterial.dispose();
      renderer.dispose();
    };
  }, [isDark, reducedMotion]);

  return (
    <div
      data-testid="ms-login-drone"
      className="[--login-drone-width:min(12rem,42vw)] relative z-3 grid box-border w-[min(var(--login-drone-width),calc(100vw-3rem))] aspect-[1] place-items-center overflow-hidden bg-(--card) [outline:0.5rem_solid_var(--muted)] [border:1px_solid_var(--border)] rounded-[100%] mx-auto -mt-[(var(--login-drone-width)-3rem)] mr-[0.375rem] text-[0.8125rem]"
      aria-hidden="true"
    >
      <canvas
        ref={canvasRef}
        className="animate-[ms-login-hover_4s_ease-in-out_infinite] block w-full h-full overflow-hidden opacity-[.4] motion-reduce:animate-none"
      />
    </div>
  );
}
