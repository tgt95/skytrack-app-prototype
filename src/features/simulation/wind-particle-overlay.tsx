import { useEffect, useRef } from "react";
import {
  equivalentWindSpeedFromForce,
  type StudioMission,
  windEnvironmentOf,
} from "@/domain/mission-model";
import type { MissionSceneHandle } from "@/features/scene/mission-scene";
import type { SimStatus } from "./simulation";

interface WindParticleOverlayProps {
  mission: StudioMission;
  sceneRef: { current: MissionSceneHandle | null };
  status: SimStatus;
  reducedMotion: boolean;
}

interface Particle {
  u: number;
  v: number;
  opacity: number;
}

const PARTICLE_COUNT = 64;

export function WindParticleOverlay({
  mission,
  sceneRef,
  status,
  reducedMotion,
}: WindParticleOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const running = status === "running";
  const shown = running || status === "paused";
  const wind = windEnvironmentOf(mission);
  const speedMS = wind.controlBy === "force"
    ? equivalentWindSpeedFromForce(wind.forceN)
    : wind.speedMS;

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context || !wind.enabled || !shown || speedMS <= 0) return;

    const existingParticles = particlesRef.current;
    if (existingParticles.length !== PARTICLE_COUNT) {
      particlesRef.current = Array.from({ length: PARTICLE_COUNT }, (_, index) => ({
        u: ((index * 37) % PARTICLE_COUNT) / PARTICLE_COUNT,
        v: ((index * 53) % PARTICLE_COUNT) / PARTICLE_COUNT,
        opacity: 0.35 + ((index * 17) % 60) / 100,
      }));
    }

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

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      width = bounds.width;
      height = bounds.height;
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
      const heading = sceneRef.current?.getCameraHeading() ?? 0;
      const screenX = east * Math.cos(heading) - north * Math.sin(heading);
      const screenY = -(east * Math.sin(heading) + north * Math.cos(heading) + up * 0.65);
      const length = Math.hypot(screenX, screenY) || 1;
      const dx = screenX / length;
      const dy = screenY / length;
      const speedPxPerSecond = speedMS * 4.5;
      const trail = Math.min(24, 5 + speedMS * 0.8);
      const visibleCount = Math.max(
        1,
        Math.min(PARTICLE_COUNT, Math.round((speedMS / 20) * PARTICLE_COUNT)),
      );

      if (animate && !reducedMotion) {
        for (const particle of particlesRef.current) {
          particle.u += (dx * speedPxPerSecond * delta) / width;
          particle.v += (dy * speedPxPerSecond * delta) / height;
          if (particle.u < 0) particle.u += 1;
          if (particle.u > 1) particle.u -= 1;
          if (particle.v < 0) particle.v += 1;
          if (particle.v > 1) particle.v -= 1;
        }
      }

      context.clearRect(0, 0, width, height);
      const primary = getComputedStyle(canvas).getPropertyValue("--primary").trim();
      context.strokeStyle = primary || "#a78bfa";
      context.lineWidth = 1.5;
      for (const particle of particlesRef.current.slice(0, visibleCount)) {
        const x = particle.u * width;
        const y = particle.v * height;
        context.globalAlpha = particle.opacity;
        context.beginPath();
        context.moveTo(x, y);
        context.lineTo(x - dx * trail, y - dy * trail);
        context.stroke();
      }
      context.globalAlpha = 1;

      if (animate && !reducedMotion) frame = requestAnimationFrame((t) => draw(t, true));
    };

    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    if (running && !reducedMotion) frame = requestAnimationFrame((t) => draw(t, true));
    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
    };
  }, [
    reducedMotion,
    running,
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
