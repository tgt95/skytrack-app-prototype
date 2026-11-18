import { useEffect, useState } from "react";

interface WindDirectionPreviewProps {
  azimuthDeg: number;
  elevationDeg: number;
  speedMS: number;
}

const CENTER = { x: 160, y: 104 };
const RADIUS = 78;
const SPHERE_RADIUS = 86;
const PARTICLE_LANES = [
  { offset: -0.72, depth: -0.75 },
  { offset: -0.48, depth: 0.75 },
  { offset: -0.24, depth: -0.45 },
  { offset: 0, depth: 0.45 },
  { offset: 0.24, depth: -0.15 },
  { offset: 0.48, depth: 0.72 },
  { offset: 0.72, depth: -0.65 },
];

function project(east: number, north: number, up: number) {
  return {
    x: CENTER.x + RADIUS * (east * 0.9 - north * 0.42),
    y: CENTER.y - RADIUS * (up * 0.9 + (east + north) * 0.2),
  };
}

function pointOnHorizon(azimuthDeg: number) {
  const azimuth = (azimuthDeg * Math.PI) / 180;
  return project(Math.cos(azimuth), Math.sin(azimuth), 0);
}

export function WindDirectionPreview({
  azimuthDeg,
  elevationDeg,
  speedMS,
}: WindDirectionPreviewProps) {
  const [motionAllowed, setMotionAllowed] = useState(false);
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: no-preference)");
    const syncPreference = () => setMotionAllowed(preference.matches);
    syncPreference();
    preference.addEventListener("change", syncPreference);
    return () => preference.removeEventListener("change", syncPreference);
  }, []);

  const azimuth = (azimuthDeg * Math.PI) / 180;
  const elevation = (elevationDeg * Math.PI) / 180;
  const horizontal = Math.cos(elevation);
  const east = horizontal * Math.cos(azimuth);
  const north = horizontal * Math.sin(azimuth);
  const up = Math.sin(elevation);
  const target = project(east, north, up);
  const horizonTarget = pointOnHorizon(azimuthDeg);
  const flow = project(east, north, up);
  const flowX = flow.x - CENTER.x;
  const flowY = flow.y - CENTER.y;
  const flowLength = Math.hypot(flowX, flowY) || 1;
  const dx = flowX / flowLength;
  const dy = flowY / flowLength;
  const durationSeconds = Math.min(6, Math.max(0.45, 1.4 * (6 / Math.max(speedMS, 0.1))));
  const particles = PARTICLE_LANES.map(({ offset, depth }) => {
    const distance = SPHERE_RADIUS * Math.sqrt(1 - offset * offset);
    const perpendicularX = -dy;
    const perpendicularY = dx;
    const perspectiveScale = 1 + depth * 0.14;
    const start = {
      x: CENTER.x + (-dx * distance + perpendicularX * SPHERE_RADIUS * offset) * perspectiveScale,
      y: CENTER.y + (-dy * distance + perpendicularY * SPHERE_RADIUS * offset) * perspectiveScale,
    };
    const end = {
      x: CENTER.x + (dx * distance + perpendicularX * SPHERE_RADIUS * offset) * perspectiveScale,
      y: CENTER.y + (dy * distance + perpendicularY * SPHERE_RADIUS * offset) * perspectiveScale,
    };
    return { start, end, depth };
  });
  const azimuthArc = Array.from({ length: 25 }, (_, index) =>
    pointOnHorizon((azimuthDeg * index) / 24),
  );
  const arcPath = azimuthArc
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`)
    .join(" ");
  const renderParticles = (layer: "back" | "front") =>
    particles
      .filter(({ depth }) => layer === "back" ? depth < 0 : depth >= 0)
      .map(({ start, end, depth }, index) => {
        const front = layer === "front";
        const particleIndex = PARTICLE_LANES.findIndex((lane) => lane.depth === depth);
        const depthSpeedScale = 1 + depth * 0.2;
        return (
          <circle
            key={`${layer}-${index}`}
            cx={motionAllowed ? 0 : (start.x + end.x) / 2}
            cy={motionAllowed ? 0 : (start.y + end.y) / 2}
            r={front ? 2.8 : 1.7}
            fill="var(--primary)"
            opacity={front ? 0.9 : 0.32}
          >
            {motionAllowed ? (
              <animateMotion
                path={`M${start.x},${start.y} L${end.x},${end.y}`}
                dur={`${durationSeconds / depthSpeedScale}s`}
                begin={`${-(durationSeconds * particleIndex) / particles.length}s`}
                repeatCount="indefinite"
              />
            ) : null}
          </circle>
        );
      });

  return (
    <section
      className="box-border flex w-full min-w-0 flex-col gap-2 overflow-hidden rounded-(--radius) border border-border p-3"
      aria-label="Wind direction preview"
      data-testid="ms-wind-direction-preview"
    >
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="text-xs sub-heading">Wind direction preview</div>
        <span className="text-xs text-muted-foreground" data-testid="ms-wind-preview-angles">
          {azimuthDeg}° / {elevationDeg}°
        </span>
      </div>
      <svg
        viewBox="0 0 320 208"
        className="mx-auto block h-auto max-h-52 w-full max-w-80 text-muted-foreground"
        role="img"
        aria-label={`Wind pushes toward azimuth ${azimuthDeg} degrees and elevation ${elevationDeg} degrees. Azimuth zero is East; ninety is North.`}
      >
        <defs>
          <clipPath id="ms-wind-sphere-clip">
            <circle cx={CENTER.x} cy={CENTER.y} r={SPHERE_RADIUS} />
          </clipPath>
          <radialGradient id="ms-wind-sphere-fill" cx="35%" cy="28%" r="76%">
            <stop offset="0%" className="text-card" stopColor="currentColor" stopOpacity="0.96" />
            <stop offset="100%" className="text-muted" stopColor="currentColor" stopOpacity="0.48" />
          </radialGradient>
          <marker
            id="ms-wind-direction-arrow"
            markerWidth="8"
            markerHeight="8"
            refX="7"
            refY="4"
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            <path d="M0,0 L8,4 L0,8 Z" fill="var(--primary)" />
          </marker>
        </defs>

        <circle
          cx={CENTER.x}
          cy={CENTER.y}
          r={SPHERE_RADIUS}
          fill="url(#ms-wind-sphere-fill)"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeOpacity="0.25"
        />
        {speedMS > 0 ? (
          <g clipPath="url(#ms-wind-sphere-clip)" aria-hidden="true">
            {renderParticles("back")}
          </g>
        ) : null}
        <ellipse
          cx={CENTER.x}
          cy={CENTER.y}
          rx={SPHERE_RADIUS}
          ry="29"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeOpacity="0.25"
        />
        <ellipse
          cx={CENTER.x}
          cy={CENTER.y}
          rx="39"
          ry={SPHERE_RADIUS}
          fill="none"
          stroke="currentColor"
          strokeDasharray="3 4"
          strokeWidth="1.5"
          strokeOpacity="0.25"
        />
        {speedMS > 0 ? (
          <g clipPath="url(#ms-wind-sphere-clip)" aria-hidden="true">
            {renderParticles("front")}
          </g>
        ) : null}
        <path d={arcPath} fill="none" className="stroke-primary/50" strokeWidth="2" />
        <line
          x1={horizonTarget.x}
          y1={horizonTarget.y}
          x2={target.x}
          y2={target.y}
          stroke="var(--foreground)"
          strokeDasharray="3 4"
          strokeOpacity="0.62"
        />
        <line
          x1={CENTER.x}
          y1={CENTER.y}
          x2={target.x}
          y2={target.y}
          stroke="var(--primary)"
          strokeWidth="2"
          markerEnd="url(#ms-wind-direction-arrow)"
        />
        <circle cx={CENTER.x} cy={CENTER.y} r="4" fill="currentColor" />
        <text x="250" y="91" className="fill-muted-foreground text-xs sub-heading">E</text>
        <text x="107" y="91" className="fill-muted-foreground text-xs sub-heading">N</text>
        <text x="164" y="10" className="fill-muted-foreground text-xs sub-heading">UP</text>
        <text x="160" y="208" textAnchor="middle" className="fill-muted-foreground text-xs sub-heading">
          Push TO · ENU
        </text>
      </svg>
    </section>
  );
}
