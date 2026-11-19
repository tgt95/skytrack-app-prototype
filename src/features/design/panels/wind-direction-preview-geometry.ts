export const CENTER = { x: 160, y: 104 };
export const RADIUS = 78;
export const SPHERE_RADIUS = 86;
export const SHOW_COORDINATE_AXES = false;
export const WIND_ARROW_COUNT = 3;

export function project(east: number, north: number, up: number, scale = 1) {
  return {
    x: CENTER.x + RADIUS * scale * (east * 0.9 - north * 0.42),
    y: CENTER.y - RADIUS * scale * (up * 0.9 + (east + north) * 0.2),
  };
}

export function pointAtCompassBearing(bearingDeg: number, radialScale = 1) {
  const angle = (bearingDeg * Math.PI) / 180;
  return {
    x: CENTER.x + SPHERE_RADIUS * radialScale * Math.cos(angle),
    y: CENTER.y + 29 * radialScale * Math.sin(angle),
  };
}

export function pointAtElevation(
  horizontalTarget: { x: number; y: number },
  angle: number,
  radialScale = 1,
) {
  const horizontalScale = Math.cos(angle);
  const verticalScale = Math.sin(angle);
  return {
    x:
      CENTER.x +
      (horizontalTarget.x - CENTER.x) * horizontalScale * radialScale,
    y:
      CENTER.y +
      (horizontalTarget.y - CENTER.y) * horizontalScale * radialScale -
      SPHERE_RADIUS * verticalScale * radialScale,
  };
}

export function sectorPath(points: { x: number; y: number }[]) {
  return `M${CENTER.x},${CENTER.y} ${points
    .map((point) => `L${point.x},${point.y}`)
    .join(" ")} Z`;
}

export function pointAlongPolyline(
  points: { x: number; y: number }[],
  progress: number,
) {
  const segments = points.slice(1).map((point, index) => {
    const start = points[index];
    const dx = point.x - start.x;
    const dy = point.y - start.y;
    return { start, dx, dy, length: Math.hypot(dx, dy) };
  });
  const totalLength = segments.reduce(
    (sum, segment) => sum + segment.length,
    0,
  );
  let distance = Math.min(1, Math.max(0, progress)) * totalLength;

  for (const segment of segments) {
    if (distance <= segment.length) {
      const ratio = segment.length ? distance / segment.length : 0;
      return {
        x: segment.start.x + segment.dx * ratio,
        y: segment.start.y + segment.dy * ratio,
        angle: (Math.atan2(segment.dy, segment.dx) * 180) / Math.PI,
      };
    }
    distance -= segment.length;
  }

  const last = points[points.length - 1];
  return { x: last.x, y: last.y, angle: 0 };
}
