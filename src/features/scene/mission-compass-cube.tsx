/* mission-compass-cube.tsx — Mission Studio-local 3D orientation cube.
   Mirrors Planner's cube visual/orientation behavior (see planner/map3d/
   compass-cube.tsx as a read-only reference; no Planner imports here).
   Faces snap to the corresponding camera view; clicks near a visible face's
   edge or corner region snap to the adjacent diagonal/oblique view instead.
   Dragging the cube orbits the camera. All camera work is delegated to the
   host scene through callbacks so this file stays presentational. */

import { type CSSProperties, useCallback, useEffect, useRef } from "react";
import {
  CUBE_SIZE,
  HALF_SIZE,
  MISSION_CUBE_SNAPS,
  resolveRegionSnap,
  type CubeFace,
  type MissionCubeSnap,
} from "./mission-compass-model";
export {
  MISSION_CUBE_OBLIQUE_PITCH,
  MISSION_CUBE_SIDE_PITCH,
  MISSION_CUBE_SNAPS,
  MISSION_CUBE_TOP_PITCH,
  resolveMissionSnap,
} from "./mission-compass-model";
export type {
  MissionCubeSnap,
  MissionCubeSnapDef,
} from "./mission-compass-model";

interface MissionCompassCubeProps {
  heading: number;
  pitch: number;
  interactive: boolean;
  onSnap: (snap: MissionCubeSnap) => void;
  onOrbitBy: (dx: number, dy: number) => void;
  onOrbitEnd: () => void;
}

export function MissionCompassCube({
  heading,
  pitch,
  interactive,
  onSnap,
  onOrbitBy,
  onOrbitEnd,
}: MissionCompassCubeProps) {
  const pointerDownRef = useRef<{ x: number; y: number } | null>(null);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  const dragThresholdPassedRef = useRef(false);
  const activePointerIdRef = useRef<number | null>(null);
  const lastDragEndAtRef = useRef(0);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const interactiveRef = useRef(interactive);
  interactiveRef.current = interactive;
  const orbitRef = useRef({ onOrbitBy, onOrbitEnd });
  orbitRef.current = { onOrbitBy, onOrbitEnd };
  const snapRef = useRef(onSnap);
  snapRef.current = onSnap;
  const headingRef = useRef(heading);
  headingRef.current = heading;

  const endDrag = useCallback((wasDrag: boolean) => {
    if (activePointerIdRef.current !== null && viewportRef.current) {
      try {
        if (viewportRef.current.hasPointerCapture(activePointerIdRef.current)) {
          viewportRef.current.releasePointerCapture(activePointerIdRef.current);
        }
      } catch {
        /* ignore */
      }
    }
    activePointerIdRef.current = null;
    pointerDownRef.current = null;
    lastPointerRef.current = null;
    if (dragThresholdPassedRef.current || wasDrag) {
      orbitRef.current.onOrbitEnd();
      dragThresholdPassedRef.current = false;
      lastDragEndAtRef.current = performance.now();
    } else {
      dragThresholdPassedRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!interactiveRef.current) endDrag(false);
  }, [interactive, endDrag]);

  useEffect(() => {
    const onBlur = () => endDrag(false);
    const onKey = (e: KeyboardEvent) => {
      // Cancel only an active cube drag; never steal keys from waypoint editing.
      if (e.key === "Escape" && activePointerIdRef.current !== null)
        endDrag(false);
    };
    window.addEventListener("blur", onBlur);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("keydown", onKey);
      endDrag(false);
    };
  }, [endDrag]);

  const fireSnap = useCallback((face: CubeFace, u: number, v: number) => {
    if (!interactiveRef.current) return;
    if (dragThresholdPassedRef.current) return;
    // Ignore the click that terminates a drag (pointerup precedes click).
    if (performance.now() - lastDragEndAtRef.current < 350) return;
    const snap = resolveRegionSnap(face, u, v, headingRef.current);
    if (snap) snapRef.current(snap);
  }, []);

  const handleFaceClick = useCallback(
    (face: CubeFace) => (e: React.MouseEvent<HTMLButtonElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const u =
        rect.width > 0 ? ((e.clientX - rect.left) / rect.width) * 2 - 1 : 0;
      const v =
        rect.height > 0 ? ((e.clientY - rect.top) / rect.height) * 2 - 1 : 0;
      fireSnap(face, u, v);
    },
    [fireSnap],
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!interactiveRef.current || e.button !== 0 || !e.isPrimary) return;
    if (activePointerIdRef.current !== null) return;
    activePointerIdRef.current = e.pointerId;
    pointerDownRef.current = { x: e.clientX, y: e.clientY };
    lastPointerRef.current = { x: e.clientX, y: e.clientY };
    dragThresholdPassedRef.current = false;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!interactiveRef.current) {
      if (activePointerIdRef.current !== null) endDrag(false);
      return;
    }
    if (
      activePointerIdRef.current !== e.pointerId ||
      !lastPointerRef.current ||
      !pointerDownRef.current
    )
      return;
    const totalDx = e.clientX - pointerDownRef.current.x;
    const totalDy = e.clientY - pointerDownRef.current.y;
    if (!dragThresholdPassedRef.current) {
      if (totalDx * totalDx + totalDy * totalDy < 16) return;
      dragThresholdPassedRef.current = true;
      try {
        viewportRef.current?.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
    const dx = e.clientX - lastPointerRef.current.x;
    const dy = e.clientY - lastPointerRef.current.y;
    lastPointerRef.current = { x: e.clientX, y: e.clientY };
    orbitRef.current.onOrbitBy(dx, dy);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current === e.pointerId) endDrag(false);
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current === e.pointerId) endDrag(false);
  };

  const handleLostPointerCapture = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current === e.pointerId) endDrag(false);
  };

  const headingDeg = (heading * 180) / Math.PI;
  const pitchDeg = (pitch * 180) / Math.PI;

  // CSS 3D transform, mirroring Planner: nadir pitch (-90) shows TOP;
  // near-horizontal pitch (-10) tilts the south face toward the camera.
  const rx = 90 + pitchDeg;
  const rz = -headingDeg;

  const rxRad = (rx * Math.PI) / 180;
  const rzRad = (rz * Math.PI) / 180;
  const faceLabelRotation = (face: CubeFace) => {
    if (face === "TOP") return 0;
    const followsFaceY = face === "WEST" || face === "EAST";
    const edgeX = followsFaceY ? -Math.sin(rzRad) : Math.cos(rzRad);
    const edgeRotation = followsFaceY ? 90 : 0;
    // Keep labels aligned to each face's horizontal edge and readable left-to-right.
    return edgeX < 0 ? edgeRotation + 180 : edgeRotation;
  };
  const topVisible = Math.cos(rxRad) > 0.05;
  const southVisible = Math.sin(rxRad) * Math.cos(rzRad) > 0.05;
  const northVisible = -Math.sin(rxRad) * Math.cos(rzRad) > 0.05;
  const eastVisible = Math.sin(rxRad) * Math.sin(rzRad) > 0.05;
  const westVisible = -Math.sin(rxRad) * Math.sin(rzRad) > 0.05;

  const faceState = (
    face: CubeFace,
  ): { visible: boolean; transform: string; testid: string; aria: string } => {
    switch (face) {
      case "TOP":
        return {
          visible: topVisible,
          transform: `translateZ(${HALF_SIZE}px)`,
          testid: "ms-cube-face-top",
          aria: "Top view",
        };
      case "SOUTH":
        return {
          visible: southVisible,
          transform: `rotateX(-90deg) translateZ(${HALF_SIZE}px)`,
          testid: "ms-cube-face-south",
          aria: "South view",
        };
      case "NORTH":
        return {
          visible: northVisible,
          transform: `rotateX(90deg) translateZ(${HALF_SIZE}px)`,
          testid: "ms-cube-face-north",
          aria: "North view",
        };
      case "WEST":
        return {
          visible: westVisible,
          transform: `rotateY(-90deg) translateZ(${HALF_SIZE}px)`,
          testid: "ms-cube-face-west",
          aria: "West view",
        };
      case "EAST":
        return {
          visible: eastVisible,
          transform: `rotateY(90deg) translateZ(${HALF_SIZE}px)`,
          testid: "ms-cube-face-east",
          aria: "East view",
        };
    }
  };

  const faces: { face: CubeFace; label: string }[] = [
    { face: "TOP", label: "TOP" },
    { face: "SOUTH", label: "SOUTH" },
    { face: "NORTH", label: "NORTH" },
    { face: "WEST", label: "WEST" },
    { face: "EAST", label: "EAST" },
  ];

  return (
    <div
      className={[
        `ms-compass-cube${interactive ? "" : " is-disabled"}`,
        "absolute top-3 right-3 z-5 [user-select:none] touch-none [.ms-scene-wrap.has-alt-ruler_&]:right-8 [.ms-compass-cube&:where(.is-disabled)]:opacity-[0.35] [.ms-compass-cube&:where(.is-disabled)]:pointer-events-none",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label="3D orientation cube"
      data-testid="ms-cube"
    >
      <div
        ref={viewportRef}
        className=" flex items-center justify-center w-(--ms-cube-viewport-size) h-(--ms-cube-viewport-size) perspective-[400px] cursor-grab active:cursor-grabbing"
        style={
          { "--ms-cube-viewport-size": `${CUBE_SIZE + 24}px` } as CSSProperties
        }
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onLostPointerCapture={handleLostPointerCapture}
        data-testid="ms-cube-viewport"
      >
        <div
          className="ms-cube relative w-(--ms-cube-size) h-(--ms-cube-size) transform-(--ms-cube-transform) transform-3d"
          style={
            {
              "--ms-cube-size": `${CUBE_SIZE}px`,
              "--ms-cube-transform": `rotateX(${rx}deg) rotateZ(${rz}deg)`,
            } as CSSProperties
          }
        >
          {faces.map(({ face, label }) => {
            const st = faceState(face);
            const shown = interactive && st.visible;
            return (
              <button
                key={face}
                type="button"
                className={`ms-cube-face ${face === "TOP" ? "text-(--primary)! border-(--primary)!" : ""}`}
                style={
                  {
                    "--ms-cube-face-transform": st.transform,
                    "--ms-cube-face-pointer-events": shown ? "auto" : "none",
                    "--ms-cube-face-visibility": st.visible
                      ? "visible"
                      : "hidden",
                  } as CSSProperties
                }
                onClick={handleFaceClick(face)}
                aria-label={`${st.aria} — edges and corners snap to diagonal views`}
                data-testid={st.testid}
                tabIndex={shown ? 0 : -1}
              >
                <span
                  className="inline-block"
                  style={{ transform: `rotate(${faceLabelRotation(face)}deg)` }}
                >
                  {label}
                </span>
              </button>
            );
          })}
          <div
            className="ms-cube-face  bg-(--muted) border border-border pointer-events-none"
            style={
              {
                "--ms-cube-face-transform": `rotateX(180deg) translateZ(${HALF_SIZE}px)`,
              } as CSSProperties
            }
            aria-hidden="true"
            data-testid="ms-cube-face-bottom"
          />
        </div>
      </div>
      {/* Keyboard access to every snap target, including edge/corner views
          that pointer users reach via face regions. Revealed on focus only,
          so waypoint editing focus order is otherwise untouched. */}
      <div
        className="ms-cube-kb absolute top-[calc(100%+0.25rem)] right-0 flex flex-col gap-0.5 p-1 bg-(--card) border border-border rounded-(--radius) not-focus-within:w-px not-focus-within:h-px not-focus-within:p-0 not-focus-within:overflow-hidden not-focus-within:[clip:rect(0_0_0_0)] not-focus-within:whitespace-nowrap not-focus-within:[border:0]"
        aria-label="Keyboard view controls"
      >
        {MISSION_CUBE_SNAPS.map((snap) => (
          <button
            key={snap.id}
            type="button"
            disabled={!interactive}
            data-testid={`ms-cube-kb-${snap.id}`}
            tabIndex={interactive ? 0 : -1}
            className=" text-[0.6875rem] text-left whitespace-nowrap text-(--foreground) bg-transparent [border:0] rounded-(--radius) py-0.5 px-1.5 cursor-pointer [&:hover]:bg-(--accent) focus-visible:outline-2 focus-visible:outline-(--primary) focus-visible:outline-offset-1 disabled:opacity-[0.4] disabled:cursor-not-allowed"
            onClick={() => {
              if (interactive)
                snapRef.current({ heading: snap.heading, pitch: snap.pitch });
            }}
          >
            {snap.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default MissionCompassCube;
