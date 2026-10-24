/* lidar-preview.tsx — deterministic mock LiDAR corner preview.
   Points derive from the same sim clock; nothing is sensed. */

import { SkyTooltip } from "../../shared/sky-tooltip";
import { useEffect, useRef, useState } from "react";
import { ArrowsInSimpleIcon, ArrowsOutSimpleIcon } from "@phosphor-icons/react";
import { Button } from "skytrack-ui/button";
import { samplePlan, type SimPlan } from "../simulation/simulation";

// The parent unmounts this preview when V hides it. Keep size until the page reloads.
let rememberedExpanded = false;

/* LiDAR point palette resolves from the skytrack-ui `--success` token at
   runtime (sensor-green family, present in skytrack-ui/dist-lib/styles.css
   :root). Fallback default `#7df0af` (sensor-green) applies only when the
   token resolves empty or is not a usable canvas color. Brightness variants
   use globalAlpha over this single base color — no additional hardcoded
   colors. The near-black scope field fill below is not a theme surface (theme
   --background is light in light mode and would wash out the scope). */
function resolveScopeGreen(ctx: CanvasRenderingContext2D): string {
  try {
    const raw = getComputedStyle(document.documentElement)
      .getPropertyValue("--success")
      .trim();
    if (
      raw &&
      (typeof CSS === "undefined" ||
        typeof CSS.supports !== "function" ||
        CSS.supports("color", raw))
    ) {
      const prev = ctx.fillStyle;
      ctx.fillStyle = raw;
      const ok = ctx.fillStyle !== prev || ctx.fillStyle === raw;
      ctx.fillStyle = prev;
      if (ok) return raw;
    }
  } catch {
    /* ignore */
  }
  return "#7df0af";
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default function LidarPreview({
  plan,
  clockRef,
  reducedMotion,
}: {
  plan: SimPlan | null;
  clockRef: { current: number };
  reducedMotion: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [expanded, setExpanded] = useState(rememberedExpanded);

  const toggleSize = () => {
    const next = !expanded;
    rememberedExpanded = next;
    setExpanded(next);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    const scopeGreen = resolveScopeGreen(ctx);
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const t = reducedMotion ? Math.floor(clockRef.current) : clockRef.current;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      ctx.globalAlpha = 1;
      ctx.fillStyle = "rgba(8, 12, 10, 0.9)";
      ctx.fillRect(0, 0, w, h);
      const cx = w / 2;
      const cy = h / 2;
      // Range rings (mock 10/20/30 m).
      ctx.globalAlpha = 0.25;
      ctx.strokeStyle = scopeGreen;
      ctx.lineWidth = 1;
      for (const r of [18, 36, 54]) {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      const rnd = mulberry32(Math.floor(t * 5) + 7);
      const sweep = (t * 1.4) % (Math.PI * 2);
      // Facade wall echo: dense band on one side when near the wall (mock).
      let wallEcho = 0;
      if (plan) {
        const s = samplePlan(plan, t);
        wallEcho = Math.max(0, 1 - Math.abs(s.pos.y - 4) / 14);
      }
      for (let i = 0; i < 420; i += 1) {
        const ang = rnd() * Math.PI * 2;
        const wall = rnd() < wallEcho * 0.7;
        const r = wall ? 40 + rnd() * 10 : 6 + rnd() * 52;
        const px = cx + Math.cos(ang) * r;
        const py = cy + Math.sin(ang) * r * 0.62;
        const dAng = Math.abs(
          ((((ang - sweep) % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2)) -
            Math.PI,
        );
        const bright = dAng < 0.5 ? 1 : 0.45;
        ctx.fillStyle = scopeGreen;
        ctx.globalAlpha = (wall ? 0.75 : 0.5) * bright;
        ctx.fillRect(px, py, 1.6, 1.6);
      }
      // Sweep line.
      ctx.globalAlpha = 0.8;
      ctx.strokeStyle = scopeGreen;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(sweep) * 58, cy + Math.sin(sweep) * 58 * 0.62);
      ctx.stroke();
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [plan, clockRef, reducedMotion]);

  return (
    <div
      className={[
        `ms-lidar${expanded ? " is-expanded" : ""}`,
        "absolute left-[0.75rem] bottom-[0.75rem] z-1 flex flex-col w-[min(18.75rem,calc(100%-5.375rem))] h-[min(12.25rem,calc(100%-1.5rem))] overflow-hidden [border:0.0625rem_solid_var(--border)] rounded-(--radius) bg-(--card) [.ms-lidar&:where(.is-expanded)]:w-[min(35rem,calc(100%-5.375rem))] [.ms-lidar&:where(.is-expanded)]:h-[min(21.25rem,calc(100%-1.5rem))]",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div
        className=" flex-[0_0_2rem] flex items-center justify-between pl-[0.625rem]"
        data-testid="ms-lidar-header"
      >
        <span
          className=" text-[0.6875rem] font-semibold text-(--foreground)"
          data-testid="ms-lidar-tag"
        >
          LiDAR
        </span>
        <SkyTooltip>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            className=" flex-[0_0_auto]"
            aria-label={
              expanded ? "Restore LiDAR preview" : "Expand LiDAR preview"
            }
            aria-expanded={expanded}
            onClick={toggleSize}
          >
            {expanded ? (
              <ArrowsInSimpleIcon aria-hidden="true" />
            ) : (
              <ArrowsOutSimpleIcon aria-hidden="true" />
            )}
          </Button>
        </SkyTooltip>
      </div>
      <canvas
        ref={canvasRef}
        width={232}
        height={148}
        className=" block flex-[1_1_auto] w-full min-h-0"
        role="img"
        aria-label="LiDAR preview"
      />
    </div>
  );
}
