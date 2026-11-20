import { useEffect, useRef } from "react";
import {
  equivalentWindSpeedFromForce,
  type StudioMission,
  type WindEnvironmentSettings,
  windEnvironmentOf,
} from "@/domain/mission-model";
import type { MissionSceneHandle } from "@/features/scene/mission-scene";
import type { SimStatus } from "./simulation";

interface WindParticleOverlayProps {
  mission: StudioMission;
  windPreview?: WindEnvironmentSettings | null;
  sceneRef: { current: MissionSceneHandle | null };
  status: SimStatus;
  reducedMotion: boolean;
  designMode: boolean;
}

interface Particle {
  distanceM: number;
  crosswindM: number;
  verticalM: number;
  opacity: number;
  size: number;
}

interface WindBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

const PARTICLE_COUNT = 300;
const FIELD_PADDING_M = 100;
const STREAM_WIDTH_RATIO = 0.1;
const TRAIL_MIN_LENGTH_M = 12;
const TRAIL_MAX_LENGTH_M = 30;

function particleNoise(index: number, salt: number): number {
  const value = Math.sin((index + 1) * 127.1 + salt * 311.7) * 43_758.5453;
  return value - Math.floor(value);
}

function windBoundsOf(mission: StudioMission): WindBounds {
  const points = mission.waypoints.length > 0 ? mission.waypoints : [mission.spawn];
  const eastings = points.map((point) => point.x);
  const northings = points.map((point) => point.y);
  const altitudes = points.map((point) =>
    "z" in point && typeof point.z === "number" ? point.z : 0,
  );
  return {
    minX: Math.min(...eastings) - FIELD_PADDING_M,
    maxX: Math.max(...eastings) + FIELD_PADDING_M,
    minY: Math.min(...northings) - FIELD_PADDING_M,
    maxY: Math.max(...northings) + FIELD_PADDING_M,
    minZ: Math.max(0, Math.min(...altitudes) - FIELD_PADDING_M),
    maxZ: Math.max(...altitudes) + FIELD_PADDING_M,
  };
}

export function WindParticleOverlay({
  mission,
  windPreview,
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
    const horizontalHalfExtent = Math.hypot(
      (bounds.maxX - bounds.minX) / 2,
      (bounds.maxY - bounds.minY) / 2,
    );
    const horizontalHalfFlowLength = horizontalHalfExtent / Math.max(horizontalMagnitude, 0.15);
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
    particlesRef.current = Array.from({ length: PARTICLE_COUNT }, (_, index) => ({
      distanceM: ((index + particleNoise(index, 1)) / PARTICLE_COUNT) * flowLengthM,
      crosswindM: (particleNoise(index, 2) - 0.5) * streamHalfWidthM * 2,
      verticalM: (particleNoise(index, 3) - 0.5) * streamHalfHeightM * 2,
      opacity: 0.72 + particleNoise(index, 4) * 0.23,
      size: 2.8 + particleNoise(index, 5) * 1.2,
    }));

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
          particle.distanceM = (particle.distanceM + travelM) % flowLengthM;
        }
      }

      const projectedParticles = scene.projectWindEnuPoints(
        particlesRef.current.flatMap((particle) => {
          const alongFlow = particle.distanceM - halfFlowLength;
          const tailDistanceM = Math.max(0, particle.distanceM - trailLengthM);
          const tailAlongFlow = tailDistanceM - halfFlowLength;
          return [
            {
              x: center.x + east * alongFlow + crosswindEast * particle.crosswindM + verticalEast * particle.verticalM,
              y: center.y + north * alongFlow + crosswindNorth * particle.crosswindM + verticalNorth * particle.verticalM,
              z: center.z + up * alongFlow + verticalUp * particle.verticalM,
            },
            {
              x: center.x + east * tailAlongFlow + crosswindEast * particle.crosswindM + verticalEast * particle.verticalM,
              y: center.y + north * tailAlongFlow + crosswindNorth * particle.crosswindM + verticalNorth * particle.verticalM,
              z: center.z + up * tailAlongFlow + verticalUp * particle.verticalM,
            },
          ];
        }),
      );

      context.clearRect(0, 0, width, height);
      context.fillStyle = "#ffffff";

      for (let index = 0; index < particlesRef.current.length; index += 1) {
        const particle = particlesRef.current[index];
        const position = projectedParticles[index * 2];
        const tail = projectedParticles[index * 2 + 1];
        if (!position || position.x < -4 || position.x > width + 4 || position.y < -4 || position.y > height + 4) continue;
        if (tail) {
          const trail = context.createLinearGradient(tail.x, tail.y, position.x, position.y);
          trail.addColorStop(0, "rgba(255, 255, 255, 0)");
          trail.addColorStop(0.6, `rgba(255, 255, 255, ${particle.opacity * 0.32})`);
          trail.addColorStop(1, `rgba(255, 255, 255, ${particle.opacity * 0.7})`);
          context.globalAlpha = 1;
          context.strokeStyle = trail;
          context.lineWidth = Math.max(1, particle.size * 0.7);
          context.lineCap = "round";
          context.beginPath();
          context.moveTo(tail.x, tail.y);
          context.lineTo(position.x, position.y);
          context.stroke();
        }
        context.fillStyle = "#ffffff";
        context.globalAlpha = particle.opacity;
        context.fillRect(position.x - particle.size / 2, position.y - particle.size / 2, particle.size, particle.size);
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
  ]);

  if (!wind.enabled || !shown || speedMS <= 0) return null;
  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-2 h-full w-full"
      aria-hidden="true"
      data-testid="ms-wind-particles"
    />
  );
}
