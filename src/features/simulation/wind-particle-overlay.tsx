import { useEffect, useRef } from "react";
import {
  equivalentWindSpeedFromForce,
  type StudioMission,
  type WindEnvironmentSettings,
  windEnvironmentOf,
} from "@/domain/mission-model";
import type { MissionSceneHandle } from "@/features/scene/mission-scene";
import type { SimStatus } from "./simulation";
import type { WindVisualizationMode } from "./wind-visualization";

interface WindParticleOverlayProps {
  mission: StudioMission;
  windPreview?: WindEnvironmentSettings | null;
  visualizationMode: WindVisualizationMode;
  sceneRef: { current: MissionSceneHandle | null };
  status: SimStatus;
  reducedMotion: boolean;
  designMode: boolean;
}

interface Particle {
  distanceM: number;
  crosswindM: number;
  verticalM: number;
  fieldEastM: number;
  fieldNorthM: number;
  fieldVerticalM: number;
  opacity: number;
  size: number;
  fieldOpacity: number;
  radiusM: number;
}

interface WindBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

interface Streamline {
  crosswindM: number;
  verticalM: number;
  phase: number;
  opacity: number;
}

const PARTICLE_COUNT = 300;
const STREAMLINE_COUNT = 5;
const STREAMLINE_SEGMENTS = 20;
const STREAMLINE_LATERAL_BEND_RATIO = 0.04;
const STREAMLINE_VERTICAL_BEND_RATIO = 0.1;
const MAX_FIELD_PADDING_M = 100;
const MIN_FIELD_PADDING_M = 5;
const FIELD_PADDING_RATIO = 0.1;
const MAX_VERTICAL_FIELD_PADDING_M = 30;
const MIN_VERTICAL_FIELD_PADDING_M = 3;
const VERTICAL_FIELD_PADDING_RATIO = 0.05;
const STREAM_WIDTH_RATIO = 0.1;
// Tune Flow Field visibility here: opacity controls contrast; radius controls cloud softness.
const FLOW_FIELD_OPACITY_BASE = 0.06;
const FLOW_FIELD_OPACITY_VARIATION = 0.08;
const FLOW_FIELD_PUFF_RADIUS_BASE_RATIO = 0.24;
const FLOW_FIELD_PUFF_RADIUS_VARIATION = 0.22;
const FLOW_FIELD_MIN_PUFF_RADIUS_PX = 6;
const TRAIL_MIN_LENGTH_M = 12;
const TRAIL_MAX_LENGTH_M = 30;

function particleNoise(index: number, salt: number): number {
  const value = Math.sin((index + 1) * 127.1 + salt * 311.7) * 43_758.5453;
  return value - Math.floor(value);
}

function halton(index: number, base: number): number {
  let value = 0;
  let fraction = 1 / base;
  let cursor = index + 1;
  while (cursor > 0) {
    value += fraction * (cursor % base);
    cursor = Math.floor(cursor / base);
    fraction /= base;
  }
  return value;
}

function wrapCentered(value: number, halfExtent: number): number {
  const span = halfExtent * 2;
  if (span <= 0) return 0;
  return ((value + halfExtent) % span + span) % span - halfExtent;
}

function windBoundsOf(mission: StudioMission): WindBounds {
  const points = mission.waypoints.length > 0 ? mission.waypoints : [mission.spawn];
  const eastings = points.map((point) => point.x);
  const northings = points.map((point) => point.y);
  const altitudes = points.map((point) =>
    "z" in point && typeof point.z === "number" ? point.z : 0,
  );
  const minX = Math.min(...eastings);
  const maxX = Math.max(...eastings);
  const minY = Math.min(...northings);
  const maxY = Math.max(...northings);
  const minAltitude = Math.min(...altitudes);
  const maxAltitude = Math.max(...altitudes);
  const horizontalSpan = Math.hypot(maxX - minX, maxY - minY);
  const horizontalPadding = Math.min(
    MAX_FIELD_PADDING_M,
    Math.max(MIN_FIELD_PADDING_M, horizontalSpan * FIELD_PADDING_RATIO),
  );
  const verticalPadding = Math.min(
    MAX_VERTICAL_FIELD_PADDING_M,
    Math.max(MIN_VERTICAL_FIELD_PADDING_M, horizontalSpan * VERTICAL_FIELD_PADDING_RATIO),
  );
  return {
    minX: minX - horizontalPadding,
    maxX: maxX + horizontalPadding,
    minY: minY - horizontalPadding,
    maxY: maxY + horizontalPadding,
    minZ: Math.max(0, minAltitude - verticalPadding),
    maxZ: maxAltitude + verticalPadding,
  };
}

export function WindParticleOverlay({
  mission,
  windPreview,
  visualizationMode,
  sceneRef,
  status,
  reducedMotion,
  designMode,
}: WindParticleOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const running = designMode || status === "running";
  const shown = designMode || status === "running" || status === "paused";
  const wind = windPreview ?? windEnvironmentOf(mission);
  const speedMS = wind.controlBy === "force"
    ? equivalentWindSpeedFromForce(wind.forceN)
    : wind.speedMS;

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context || !wind.enabled || !shown || speedMS <= 0) return;

    const bounds = windBoundsOf(mission);
    let frame = 0;
    let lastTime = 0;
    let width = 0;
    let height = 0;
    let pixelRatio = 1;
    const azimuth = (wind.azimuthDeg * Math.PI) / 180;
    const elevation = (wind.elevationDeg * Math.PI) / 180;
    const east = Math.cos(elevation) * Math.cos(azimuth);
    const north = Math.cos(elevation) * Math.sin(azimuth);
    const up = Math.sin(elevation);
    const horizontalMagnitude = Math.hypot(east, north);
    const crosswindEast = horizontalMagnitude > 0.0001 ? -north / horizontalMagnitude : 1;
    const crosswindNorth = horizontalMagnitude > 0.0001 ? east / horizontalMagnitude : 0;
    const verticalEast = -up * Math.cos(azimuth);
    const verticalNorth = -up * Math.sin(azimuth);
    const verticalUp = horizontalMagnitude;
    const center = {
      x: (bounds.minX + bounds.maxX) / 2,
      y: (bounds.minY + bounds.maxY) / 2,
      z: (bounds.minZ + bounds.maxZ) / 2,
    };
    const halfExtentX = (bounds.maxX - bounds.minX) / 2;
    const halfExtentY = (bounds.maxY - bounds.minY) / 2;
    const horizontalHalfExtent = Math.hypot(halfExtentX, halfExtentY);
    const horizontalHalfFlowLength = horizontalMagnitude > 0.0001
      ? (Math.abs(east) * halfExtentX + Math.abs(north) * halfExtentY) / horizontalMagnitude ** 2
      : 0;
    const horizontalHalfCrosswindExtent =
      Math.abs(crosswindEast) * halfExtentX + Math.abs(crosswindNorth) * halfExtentY;
    const verticalHalfFlowLength = Math.abs(up) > 0.0001
      ? (up > 0 ? bounds.maxZ - center.z : center.z - bounds.minZ) / Math.abs(up)
      : Number.POSITIVE_INFINITY;
    const halfFlowLength = horizontalMagnitude < 0.15
      ? Math.min(horizontalHalfFlowLength, verticalHalfFlowLength)
      : horizontalHalfFlowLength;
    const flowLengthM = Math.max(1, halfFlowLength * 2);
    const streamHalfWidthM = Math.max(1, horizontalHalfExtent * STREAM_WIDTH_RATIO);
    const verticalHalfExtent = Math.min(
      center.z - bounds.minZ,
      bounds.maxZ - center.z,
    );
    const streamHalfHeightM = Math.max(
      1,
      Math.min(streamHalfWidthM, verticalHalfExtent),
    );
    const trailLengthM = Math.max(
      TRAIL_MIN_LENGTH_M,
      Math.min(TRAIL_MAX_LENGTH_M, flowLengthM * 0.04),
    );
    const streamlines: Streamline[] = Array.from({ length: STREAMLINE_COUNT }, (_, index) => ({
      crosswindM: (halton(index, 2) - 0.5) * horizontalHalfCrosswindExtent * 2,
      verticalM: (halton(index, 3) - 0.5) * Math.max(0, bounds.maxZ - bounds.minZ),
      phase: particleNoise(index, 9) * Math.PI * 2,
      opacity: 0.28 + particleNoise(index, 10) * 0.26,
    }));
    // Flow-field puff layout covers full padded waypoint bounds; elevation only changes advection.
    particlesRef.current = visualizationMode === "flow-field"
      ? Array.from({ length: PARTICLE_COUNT }, (_, index) => {
      const radiusM = Math.max(
        1,
        Math.min(streamHalfWidthM, streamHalfHeightM) *
          (FLOW_FIELD_PUFF_RADIUS_BASE_RATIO + particleNoise(index, 7) * FLOW_FIELD_PUFF_RADIUS_VARIATION),
      );
      return {
        distanceM: ((index + particleNoise(index, 1)) / PARTICLE_COUNT) * flowLengthM,
        crosswindM: (particleNoise(index, 2) - 0.5) * Math.max(0, (streamHalfWidthM - radiusM) * 2),
        verticalM: (particleNoise(index, 3) - 0.5) * Math.max(0, (streamHalfHeightM - radiusM) * 2),
        fieldEastM: (halton(index, 2) - 0.5) * Math.max(0, bounds.maxX - bounds.minX - radiusM * 2),
        fieldNorthM: (halton(index, 3) - 0.5) * Math.max(0, bounds.maxY - bounds.minY - radiusM * 2),
        fieldVerticalM: (halton(index, 5) - 0.5) * Math.max(0, bounds.maxZ - bounds.minZ - radiusM * 2),
        opacity: 0.72 + particleNoise(index, 4) * 0.23,
        size: 2.8 + particleNoise(index, 5) * 1.2,
        fieldOpacity: FLOW_FIELD_OPACITY_BASE + particleNoise(index, 6) * FLOW_FIELD_OPACITY_VARIATION,
        radiusM,
      };
      })
      : [];

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      draw(0, false);
    };

    const draw = (now: number, animate: boolean) => {
      if (!width || !height) return;
      const delta = lastTime ? Math.min((now - lastTime) / 1000, 0.05) : 0;
      lastTime = now;
      const scene = sceneRef.current;
      if (!scene) return;

      if (animate && !reducedMotion) {
        const travelM = speedMS * delta * 6;
        for (const particle of particlesRef.current) {
          particle.fieldEastM = wrapCentered(
            particle.fieldEastM + east * travelM,
            Math.max(0, (bounds.maxX - bounds.minX) / 2 - particle.radiusM),
          );
          particle.fieldNorthM = wrapCentered(
            particle.fieldNorthM + north * travelM,
            Math.max(0, (bounds.maxY - bounds.minY) / 2 - particle.radiusM),
          );
          particle.fieldVerticalM = wrapCentered(
            particle.fieldVerticalM + up * travelM,
            Math.max(0, (bounds.maxZ - bounds.minZ) / 2 - particle.radiusM),
          );
        }
      }

      const projectFieldPoint = (particle: Particle, alongOffsetM = 0) => ({
        x: center.x + particle.fieldEastM + east * alongOffsetM,
        y: center.y + particle.fieldNorthM + north * alongOffsetM,
        z: center.z + particle.fieldVerticalM + up * alongOffsetM,
      });
      const projectParticlePoint = (particle: Particle, distanceM: number) => {
        const alongFlow = distanceM - halfFlowLength;
        return {
          x: center.x + east * alongFlow + crosswindEast * particle.crosswindM + verticalEast * particle.verticalM,
          y: center.y + north * alongFlow + crosswindNorth * particle.crosswindM + verticalNorth * particle.verticalM,
          z: center.z + up * alongFlow + verticalUp * particle.verticalM,
        };
      };
      const projectedParticles = scene.projectWindEnuPoints(
        particlesRef.current.flatMap((particle) => {
          const tailDistanceM = Math.max(0, particle.distanceM - trailLengthM);
          const centerPoint = visualizationMode === "flow-field"
            ? projectFieldPoint(particle)
            : projectParticlePoint(particle, particle.distanceM);
          const tailPoint = visualizationMode === "flow-field"
            ? projectFieldPoint(particle, -trailLengthM)
            : projectParticlePoint(particle, tailDistanceM);
          return [
            centerPoint,
            tailPoint,
            {
              x: centerPoint.x + east * particle.radiusM,
              y: centerPoint.y + north * particle.radiusM,
              z: centerPoint.z + up * particle.radiusM,
            },
            {
              x: centerPoint.x + crosswindEast * particle.radiusM,
              y: centerPoint.y + crosswindNorth * particle.radiusM,
              z: centerPoint.z,
            },
            {
              x: centerPoint.x + verticalEast * particle.radiusM,
              y: centerPoint.y + verticalNorth * particle.radiusM,
              z: centerPoint.z + verticalUp * particle.radiusM,
            },
          ];
        }),
      );
      const projectedStreamlines = visualizationMode === "particle-stream"
        ? scene.projectWindEnuPoints(streamlines.flatMap((line) =>
          Array.from({ length: STREAMLINE_SEGMENTS + 1 }, (_, segmentIndex) => {
            const progress = segmentIndex / STREAMLINE_SEGMENTS;
            const envelope = Math.sin(progress * Math.PI);
            const alongFlow = (progress - 0.5) * flowLengthM;
            const lateralBend = Math.sin(progress * Math.PI * 2 + line.phase) * horizontalHalfExtent * STREAMLINE_LATERAL_BEND_RATIO * envelope;
            const verticalBend = Math.sin(progress * Math.PI * 2 + line.phase * 0.7) * (bounds.maxZ - bounds.minZ) * STREAMLINE_VERTICAL_BEND_RATIO * envelope;
            return {
              x: center.x + east * alongFlow + crosswindEast * (line.crosswindM + lateralBend) + verticalEast * line.verticalM,
              y: center.y + north * alongFlow + crosswindNorth * (line.crosswindM + lateralBend) + verticalNorth * line.verticalM,
              z: center.z + up * alongFlow + verticalUp * line.verticalM + verticalBend,
            };
          }),
        ))
        : [];

      context.clearRect(0, 0, width, height);
      context.fillStyle = "#ffffff";

      if (visualizationMode === "particle-stream") {
        streamlines.forEach((line, lineIndex) => {
          const first = projectedStreamlines[lineIndex * (STREAMLINE_SEGMENTS + 1)];
          const last = projectedStreamlines[lineIndex * (STREAMLINE_SEGMENTS + 1) + STREAMLINE_SEGMENTS];
          if (!first || !last) return;
          const lineGradient = context.createLinearGradient(first.x, first.y, last.x, last.y);
          lineGradient.addColorStop(0, "rgba(255, 255, 255, 0)");
          lineGradient.addColorStop(0.12, `rgba(255, 255, 255, ${line.opacity * 0.65})`);
          lineGradient.addColorStop(0.5, `rgba(255, 255, 255, ${line.opacity})`);
          lineGradient.addColorStop(0.88, `rgba(255, 255, 255, ${line.opacity * 0.65})`);
          lineGradient.addColorStop(1, "rgba(255, 255, 255, 0)");
          context.beginPath();
          let pathOpen = false;
          for (let segmentIndex = 0; segmentIndex <= STREAMLINE_SEGMENTS; segmentIndex += 1) {
            const point = projectedStreamlines[lineIndex * (STREAMLINE_SEGMENTS + 1) + segmentIndex];
            if (!point) {
              pathOpen = false;
              continue;
            }
            if (!pathOpen) {
              context.moveTo(point.x, point.y);
              pathOpen = true;
            } else {
              context.lineTo(point.x, point.y);
            }
          }
          context.strokeStyle = lineGradient;
          context.lineWidth = 1.25;
          context.lineCap = "round";
          context.lineJoin = "round";
          context.stroke();

          if (animate && !reducedMotion) {
            const pulse = (now * Math.max(speedMS, 1) * 0.00008 + line.phase / (Math.PI * 2)) % 1;
            const pulseSegments = Math.max(2, Math.floor(STREAMLINE_SEGMENTS * 0.12));
            const pulseStart = Math.floor(pulse * (STREAMLINE_SEGMENTS - pulseSegments));
            context.beginPath();
            let pulsePathOpen = false;
            for (let offset = 0; offset <= pulseSegments; offset += 1) {
              const segmentIndex = pulseStart + offset;
              const point = projectedStreamlines[lineIndex * (STREAMLINE_SEGMENTS + 1) + segmentIndex];
              if (!point) {
                pulsePathOpen = false;
                continue;
              }
              if (!pulsePathOpen) {
                context.moveTo(point.x, point.y);
                pulsePathOpen = true;
              } else {
                context.lineTo(point.x, point.y);
              }
            }
            context.strokeStyle = `rgba(255, 255, 255, ${Math.min(0.85, line.opacity + 0.1)})`;
            context.lineWidth = 1.8;
            context.stroke();
          }
        });
      }

      if (visualizationMode === "flow-field") for (let index = 0; index < particlesRef.current.length; index += 1) {
        const particle = particlesRef.current[index];
        const position = projectedParticles[index * 5];
        if (!position || position.x < -80 || position.x > width + 80 || position.y < -80 || position.y > height + 80) continue;
        if (visualizationMode === "flow-field") {
          const flowEdge = projectedParticles[index * 5 + 2];
          const crosswindEdge = projectedParticles[index * 5 + 3];
          const verticalEdge = projectedParticles[index * 5 + 4];
          if (!flowEdge || !crosswindEdge || !verticalEdge) continue;
          const flowX = flowEdge.x - position.x;
          const flowY = flowEdge.y - position.y;
          const crosswindX = crosswindEdge.x - position.x;
          const crosswindY = crosswindEdge.y - position.y;
          const verticalX = verticalEdge.x - position.x;
          const verticalY = verticalEdge.y - position.y;
          const covarianceX = flowX ** 2 + crosswindX ** 2 + verticalX ** 2;
          const covarianceXY = flowX * flowY + crosswindX * crosswindY + verticalX * verticalY;
          const covarianceY = flowY ** 2 + crosswindY ** 2 + verticalY ** 2;
          const eigenSpread = Math.hypot(covarianceX - covarianceY, 2 * covarianceXY);
          const radiusX = Math.max(
            FLOW_FIELD_MIN_PUFF_RADIUS_PX,
            Math.sqrt(Math.max(0, (covarianceX + covarianceY + eigenSpread) / 2)),
          );
          const radiusY = Math.max(
            FLOW_FIELD_MIN_PUFF_RADIUS_PX * 0.72,
            Math.sqrt(Math.max(0, (covarianceX + covarianceY - eigenSpread) / 2)),
          );
          const rotation = 0.5 * Math.atan2(2 * covarianceXY, covarianceX - covarianceY);
          const tint = particleNoise(index, 8) > 0.5 ? "84, 177, 255" : "47, 132, 244";
          context.save();
          context.translate(position.x, position.y);
          context.rotate(rotation);
          context.scale(radiusX, radiusY);
          const cloud = context.createRadialGradient(0, 0, 0, 0, 0, 1);
          cloud.addColorStop(0, `rgba(${tint}, ${particle.fieldOpacity})`);
          cloud.addColorStop(0.42, `rgba(37, 112, 228, ${particle.fieldOpacity * 0.9})`);
          cloud.addColorStop(1, "rgba(25, 86, 190, 0)");
          context.fillStyle = cloud;
          context.beginPath();
          context.arc(0, 0, 1, 0, Math.PI * 2);
          context.fill();
          context.restore();
          continue;
        }
      }
      context.globalAlpha = 1;

      if (animate && !reducedMotion) frame = requestAnimationFrame((t) => draw(t, true));
    };

    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    const unsubscribeCamera = !running || reducedMotion
      ? sceneRef.current?.subscribeCameraChanged(() => draw(0, false))
      : undefined;
    if (running && !reducedMotion) frame = requestAnimationFrame((t) => draw(t, true));
    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      unsubscribeCamera?.();
    };
  }, [
    mission,
    reducedMotion,
    running,
    designMode,
    sceneRef,
    shown,
    speedMS,
    wind.azimuthDeg,
    wind.enabled,
    wind.elevationDeg,
    visualizationMode,
  ]);

  if (!wind.enabled || !shown || speedMS <= 0) return null;
  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-2 h-full w-full"
      aria-hidden="true"
      data-testid={visualizationMode === "flow-field" ? "ms-wind-flow-field" : "ms-wind-particles"}
    />
  );
}
