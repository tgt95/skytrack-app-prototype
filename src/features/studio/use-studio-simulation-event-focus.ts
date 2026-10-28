import { useCallback } from "react";
import type { SceneSelection, Waypoint } from "../../domain/mission-model";

export interface StudioSimulationFocusSceneHandle {
  focusPoint: (point: { x: number; y: number; z: number }) => void;
}

export interface StudioSimulationEventTarget {
  seq?: number;
}

export interface UseStudioSimulationEventFocusProps {
  waypoints: Waypoint[];
  setSelection: (selection: SceneSelection | null) => void;
  sceneRef: { current: StudioSimulationFocusSceneHandle | null };
  say: (text: string) => void;
}

export function useStudioSimulationEventFocus({
  waypoints,
  setSelection,
  sceneRef,
  say,
}: UseStudioSimulationEventFocusProps) {
  const onSelectEvent = useCallback(
    (ev: StudioSimulationEventTarget) => {
      if (typeof ev.seq === "number") {
        const wp = waypoints.find((w) => w.seq === ev.seq);
        if (wp) {
          setSelection({ kind: "waypoint", id: wp.id });
          sceneRef.current?.focusPoint(wp);
          say(`Event focused: waypoint ${wp.seq}.`);
        }
      }
    },
    [waypoints, setSelection, sceneRef, say],
  );

  return { onSelectEvent };
}
