import * as THREE from "three";
import { replayTimeline } from "./replay-sample";

function tokenColor(tokenName: string, fallback: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext("2d");
  if (!context) return fallback;
  context.fillStyle = fallback;
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(tokenName)
    .trim();
  if (value) context.fillStyle = value;
  context.fillRect(0, 0, 1, 1);
  const [red = 0, green = 0, blue = 0] = context.getImageData(0, 0, 1, 1).data;
  return `#${[red, green, blue]
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`;
}

export function colorFromToken(tokenName: string, fallback: string) {
  return new THREE.Color(tokenColor(tokenName, fallback));
}

export function interpolatePosition(time: number) {
  const samples = replayTimeline.samples;
  const rightIndex = samples.findIndex((sample) => sample.t >= time);
  if (rightIndex < 0) {
    const sample = samples[samples.length - 1];
    const attitude =
      replayTimeline.attitude[replayTimeline.attitude.length - 1];
    return {
      n: sample.n,
      e: sample.e,
      alt: -sample.d,
      yaw: attitude?.yaw ?? 0,
    };
  }
  if (rightIndex === 0) {
    const sample = samples[0];
    return { n: sample.n, e: sample.e, alt: -sample.d, yaw: 0 };
  }
  const left = samples[rightIndex - 1];
  const right = samples[rightIndex];
  const fraction = THREE.MathUtils.clamp(
    (time - left.t) / Math.max(0.001, right.t - left.t),
    0,
    1,
  );
  const lerp = (a: number, b: number) => THREE.MathUtils.lerp(a, b, fraction);
  const attitude = replayTimeline.attitude.reduce(
    (closest, item) =>
      Math.abs(item.t - time) < Math.abs(closest.t - time) ? item : closest,
    replayTimeline.attitude[0],
  );
  return {
    n: lerp(left.n, right.n),
    e: lerp(left.e, right.e),
    alt: -lerp(left.d, right.d),
    yaw: attitude?.yaw ?? 0,
  };
}

export function vectorFor(n: number, e: number, altitude: number) {
  return new THREE.Vector3(e, altitude, -n);
}

export type DepthVisual = {
  time: number;
  top: number;
  mixed: boolean;
  panel: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  edge: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  median: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  dot: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;
  ray: THREE.Line<
    THREE.BufferGeometry,
    THREE.LineBasicMaterial | THREE.LineDashedMaterial
  >;
  clearPoints: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
};

export function makeLine(
  points: THREE.Vector3[],
  color: THREE.Color,
  opacity = 1,
  dashed = false,
) {
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = dashed
    ? new THREE.LineDashedMaterial({
        color,
        transparent: opacity < 1,
        opacity,
        dashSize: 0.25,
        gapSize: 0.14,
      })
    : new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity });
  const line = new THREE.Line(geometry, material);
  if (dashed) line.computeLineDistances();
  return line;
}

export function buildDepthVisuals(
  scene: THREE.Scene,
  colors: { warning: THREE.Color; success: THREE.Color; border: THREE.Color },
) {
  return replayTimeline.depth.flatMap((frame) => {
    const position = interpolatePosition(frame.t);
    if (frame.n_pts < 50 || position.alt <= 0.5) return [];

    const range = Math.hypot(frame.cx, frame.cy);
    const medianAzimuth = (Math.atan2(frame.cy, frame.cx) * 180) / Math.PI;
    const azimuths = Array.from(
      { length: 17 },
      (_, index) => frame.az05 + ((frame.az95 - frame.az05) * index) / 16,
    );
    const arc = azimuths.map((azimuth) => {
      const angle = ((frame.yaw - azimuth) * Math.PI) / 180;
      return {
        n: position.n + range * Math.cos(angle),
        e: position.e + range * Math.sin(angle),
      };
    });
    const medianAngle = ((frame.yaw - medianAzimuth) * Math.PI) / 180;
    const medianPosition = {
      n: position.n + range * Math.cos(medianAngle),
      e: position.e + range * Math.sin(medianAngle),
    };
    const top = -frame.zlo;
    const bottom = Math.max(0, -frame.zhi);
    const height = Math.max(0.15, top - bottom);
    const width = Math.max(
      0.25,
      2 * range * Math.tan(((frame.az95 - frame.az05) * Math.PI) / 360),
    );
    const total = frame.hist.reduce((sum, value) => sum + value, 0);
    const largestBin = Math.max(0, ...frame.hist);
    const mixed = total === 0 || largestBin / total < 0.7;
    const middleHeight = -frame.zmed;

    const panelMaterial = new THREE.MeshBasicMaterial({
      color: colors.warning,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      panelMaterial,
    );
    panel.position.copy(
      vectorFor(medianPosition.n, medianPosition.e, (top + bottom) / 2),
    );
    panel.rotation.y = (frame.yaw * Math.PI) / 180;
    scene.add(panel);

    const edgePoints = arc
      .map((point) => vectorFor(point.n, point.e, top))
      .concat(
        arc
          .slice()
          .reverse()
          .map((point) => vectorFor(point.n, point.e, bottom)),
      );
    edgePoints.push(edgePoints[0].clone());
    const edge = makeLine(edgePoints, colors.border, 0.55);
    scene.add(edge);

    const median = makeLine(
      arc.map((point) => vectorFor(point.n, point.e, middleHeight)),
      colors.warning,
      0.9,
    );
    scene.add(median);

    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 8, 6),
      new THREE.MeshBasicMaterial({ color: colors.warning }),
    );
    dot.position.copy(
      vectorFor(medianPosition.n, medianPosition.e, middleHeight),
    );
    scene.add(dot);

    const ray = makeLine(
      [
        vectorFor(position.n, position.e, position.alt),
        vectorFor(medianPosition.n, medianPosition.e, middleHeight),
      ],
      colors.border,
      0.7,
      true,
    );
    scene.add(ray);

    const clearVertices: THREE.Vector3[] = [];
    for (const laterFrame of replayTimeline.depth) {
      if (laterFrame.t <= frame.t || laterFrame.n_pts < 1) continue;
      const later = interpolatePosition(laterFrame.t);
      if (later.alt <= 0.5 || later.alt < bottom || later.alt > top) continue;
      const reach = laterFrame.near ?? 10;
      const relativeYaw = laterFrame.yaw;
      for (const point of arc) {
        const distance = Math.hypot(point.n - later.n, point.e - later.e);
        const bearing =
          (Math.atan2(point.e - later.e, point.n - later.n) * 180) / Math.PI;
        const relative = ((bearing - relativeYaw + 540) % 360) - 180;
        if (
          Math.abs(relative) <= 22 &&
          distance > 0.3 &&
          distance < reach - 0.3
        ) {
          clearVertices.push(vectorFor(point.n, point.e, later.alt));
        }
      }
    }
    const clearGeometry = new THREE.BufferGeometry().setFromPoints(
      clearVertices,
    );
    const clearPoints = new THREE.Points(
      clearGeometry,
      new THREE.PointsMaterial({
        color: colors.success,
        size: 5,
        sizeAttenuation: false,
      }),
    );
    scene.add(clearPoints);

    return [
      { time: frame.t, top, mixed, panel, edge, median, dot, ray, clearPoints },
    ];
  });
}
