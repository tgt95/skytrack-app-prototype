import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";

export interface RenderGlbThumbnailOptions {
  width?: number;
  height?: number;
  backgroundColor?: number | string;
}

export const DEFAULT_PREVIEW_WIDTH = 640;
export const DEFAULT_PREVIEW_HEIGHT = 480;
export const DEFAULT_PREVIEW_BACKGROUND = 0x000000;
export const WORLD_GLB_THUMBNAIL_VERSION = 3;

function checkWebGLAvailability(): void {
  if (typeof document === "undefined") {
    throw new Error("GLB previews need a browser with WebGL enabled.");
  }

  const canvas = document.createElement("canvas");
  const gl = (canvas.getContext("webgl2") ??
    canvas.getContext("webgl") ??
    canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
  if (!gl || typeof gl.getExtension !== "function") {
    throw new Error("WebGL is unavailable in this browser.");
  }

  gl.getExtension("WEBGL_lose_context")?.loseContext();
}

function disposeMaterial(
  material: THREE.Material,
  disposedTextures: Set<THREE.Texture>,
): void {
  for (const value of Object.values(material)) {
    if (
      !value ||
      typeof value !== "object" ||
      !(value as THREE.Texture).isTexture
    )
      continue;
    const texture = value as THREE.Texture;
    if (disposedTextures.has(texture)) continue;
    disposedTextures.add(texture);
    texture.dispose();
  }
  material.dispose();
}

function disposeMeshResources(
  root: THREE.Object3D,
  disposedTextures: Set<THREE.Texture>,
): void {
  root.traverse((object) => {
    if (!(object as THREE.Mesh).isMesh) return;
    const mesh = object as THREE.Mesh;
    mesh.geometry?.dispose();
    const materials = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material];
    materials.forEach((material) =>
      disposeMaterial(material, disposedTextures),
    );
  });
}

function toArrayBuffer(data: ArrayBuffer | Uint8Array): ArrayBuffer {
  if (data instanceof ArrayBuffer) return data;
  const copy = new Uint8Array(data.byteLength);
  copy.set(data);
  return copy.buffer;
}

export async function renderGlbThumbnail(
  glbData: ArrayBuffer | Uint8Array,
  options?: RenderGlbThumbnailOptions,
): Promise<Blob> {
  checkWebGLAvailability();

  let gltf: GLTF;
  try {
    gltf = await new GLTFLoader().parseAsync(toArrayBuffer(glbData), "");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not parse this GLB model: ${message}`);
  }

  const root = gltf.scene ?? gltf.scenes[0];
  if (!root) throw new Error("This GLB has no 3D scene to display.");

  const width = options?.width ?? DEFAULT_PREVIEW_WIDTH;
  const height = options?.height ?? DEFAULT_PREVIEW_HEIGHT;
  const aspect = width / height;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const disposedTextures = new Set<THREE.Texture>();
  let scene: THREE.Scene | null = null;
  let renderer: THREE.WebGLRenderer | null = null;

  try {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(
      options?.backgroundColor ?? DEFAULT_PREVIEW_BACKGROUND,
    );

    root.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(root);
    if (bounds.isEmpty()) {
      throw new Error("This GLB has no visible 3D geometry.");
    }

    const size = bounds.getSize(new THREE.Vector3());
    const modelContainer = new THREE.Group();
    modelContainer.add(root);
    modelContainer.position.sub(bounds.getCenter(new THREE.Vector3()));
    modelContainer.updateMatrixWorld(true);
    scene.add(modelContainer);

    const radius = Math.max(
      new THREE.Box3()
        .setFromObject(modelContainer)
        .getBoundingSphere(new THREE.Sphere()).radius,
      size.x * 0.5,
      size.y * 0.5,
      size.z * 0.5,
      0.1,
    );
    const fov = 32;
    const halfFovY = THREE.MathUtils.degToRad(fov) / 2;
    const halfFovX = Math.atan(Math.tan(halfFovY) * aspect);
    const distance = (radius / Math.sin(Math.min(halfFovY, halfFovX))) * 1.0;
    const camera = new THREE.PerspectiveCamera(fov, aspect, 0.01, 10000);
    camera.position.set(1, 1, 1).normalize().multiplyScalar(distance);
    camera.up.set(0, 1, 0);
    camera.lookAt(0, 0, 0);
    camera.near = Math.max(0.01, distance - radius * 3);
    camera.far = distance + radius * 5;
    camera.updateProjectionMatrix();

    scene.add(new THREE.HemisphereLight(0xffffff, 0x334155, 1.2));
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.8);
    keyLight.position.set(
      camera.position.x + radius,
      camera.position.y + radius * 1.5,
      camera.position.z + radius * 0.5,
    );
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0x94a3b8, 0.8);
    fillLight.position.set(
      -camera.position.x,
      camera.position.y * 0.5,
      -camera.position.z,
    );
    scene.add(fillLight);
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));

    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true,
      powerPreference: "low-power",
    });
    renderer.setSize(width, height, false);
    renderer.setPixelRatio(1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.render(scene, camera);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("The browser could not encode the GLB preview."));
      }, "image/png");
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not render the GLB preview: ${message}`);
  } finally {
    disposeMeshResources(root, disposedTextures);
    disposedTextures.clear();
    scene?.clear();
    renderer?.dispose();
    renderer?.forceContextLoss();
    canvas.width = 1;
    canvas.height = 1;
  }
}
