import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import {
  missionFromSnapshot,
  snapshotOf,
  type SceneSelection,
  type StudioMission,
} from "../../domain/mission-model";
import {
  emptyStudioMissionDocument,
  isMissionDocumentDirty,
  studioMissionReducer,
  type StudioMissionDocumentAction,
} from "./mission-document";
import type { SimApi } from "../simulation/simulation";

export function useStudioDocumentState() {
  const [doc, dispatchDocument] = useReducer(
    studioMissionReducer,
    undefined,
    emptyStudioMissionDocument,
  );
  const { mission, past, future } = doc;
  const missionRef = useRef(mission);
  missionRef.current = mission;
  const dirty = useMemo(() => isMissionDocumentDirty(doc), [doc]);

  useEffect(() => {
    dispatchDocument({ type: "initSavedSnapshot" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { doc, mission, past, future, missionRef, dispatchDocument, dirty };
}

interface UseMissionHistoryActionsArgs {
  mission: StudioMission;
  missionRef: MutableRefObject<StudioMission>;
  past: string[];
  future: string[];
  dispatchDocument: Dispatch<StudioMissionDocumentAction>;
  setSelection: Dispatch<SetStateAction<SceneSelection | null>>;
  sim: Pick<SimApi, "status" | "abort">;
  say: (message: string) => void;
}

export function useMissionHistoryActions({
  mission,
  missionRef,
  past,
  future,
  dispatchDocument,
  setSelection,
  sim,
  say,
}: UseMissionHistoryActionsArgs) {
  const commit = useCallback(
    (next: StudioMission, label?: string) => {
      if (snapshotOf(missionRef.current) === snapshotOf(next)) return;
      missionRef.current = next;
      dispatchDocument({ type: "commit", next });
      setSelection(null);
      if (sim.status === "running" || sim.status === "paused") {
        sim.abort();
        say(
          `${label ?? "Design updated."} Simulation aborted — design changed.`,
        );
      } else if (label) {
        say(label);
      }
    },
    [dispatchDocument, missionRef, say, setSelection, sim],
  );

  const undo = useCallback(() => {
    if (past.length === 0) return;
    let restored: StudioMission | null = null;
    try {
      restored = missionFromSnapshot(past[past.length - 1]);
    } catch {
      /* keep current */
    }
    dispatchDocument({ type: "undo", ...(restored ? { restored } : {}) });
    const resurrected = restored
      ? restored.waypoints.filter(
          (waypoint) =>
            !waypoint.generatedByArea &&
            !waypoint.generatedByAvoid &&
            !mission.waypoints.some((current) => current.id === waypoint.id),
        )
      : [];
    if (resurrected.length === 1)
      setSelection({ kind: "waypoint", id: resurrected[0].id });
    else setSelection(null);
    say("Undone.");
  }, [dispatchDocument, mission, past, say, setSelection]);

  const redo = useCallback(() => {
    const next = future[0];
    if (!next) return;
    let restored: StudioMission | null = null;
    try {
      restored = missionFromSnapshot(next);
    } catch {
      /* keep current */
    }
    dispatchDocument({ type: "redo", ...(restored ? { restored } : {}) });
    setSelection(null);
    say("Redone.");
  }, [dispatchDocument, future, say, setSelection]);

  return { commit, undo, redo };
}
