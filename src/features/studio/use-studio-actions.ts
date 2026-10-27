import { useCallback, type Dispatch, type SetStateAction } from "react";
import {
  emptyMission,
  missionFromCode,
  missionToCode,
  snapshotOf,
  WORLDS,
  type SceneSelection,
  type SceneTool,
  type StudioMission,
} from "../../domain/mission-model";
import { recomputeGeneratedMission } from "../../domain/mission-generation";
import { seedMission } from "../../domain/mission-data";
import { saveMissionSnapshot } from "../library/database/store";
import type { LibraryEntry } from "../library/library";
import type { MissionWorldOption } from "./studio-dialogs";
import type { StudioMissionDocumentAction } from "./mission-document";
import type { PendingMissionPoint } from "./use-drawing-session";
import type { Stage } from "./studio-map-overlays";
import type { SimApi } from "../simulation/simulation";

interface UseStudioActionsArgs {
  mission: StudioMission;
  libraryEntry: LibraryEntry | null;
  setLibraryEntry: Dispatch<SetStateAction<LibraryEntry | null>>;
  missionWorldOptions: MissionWorldOption[];
  codeLang: "python" | "json";
  jsonDraft: string;
  setCodeDraft: Dispatch<SetStateAction<string>>;
  setCodeLang: Dispatch<SetStateAction<"python" | "json">>;
  setJsonDraft: Dispatch<SetStateAction<string>>;
  setJsonError: Dispatch<SetStateAction<string | null>>;
  setCodeView: Dispatch<SetStateAction<boolean>>;
  setEditOpen: Dispatch<SetStateAction<boolean>>;
  setSelection: Dispatch<SetStateAction<SceneSelection | null>>;
  setStage: Dispatch<SetStateAction<Stage>>;
  setPending: Dispatch<SetStateAction<PendingMissionPoint[]>>;
  setTool: Dispatch<SetStateAction<SceneTool>>;
  setSimSettingsOpen: Dispatch<SetStateAction<boolean>>;
  setSimTab: Dispatch<SetStateAction<string>>;
  dispatchDocument: Dispatch<StudioMissionDocumentAction>;
  commit: (next: StudioMission, label?: string) => void;
  sim: Pick<SimApi, "status" | "reset">;
  say: (message: string) => void;
  pythonSample: string;
}

export function useStudioActions({
  mission,
  libraryEntry,
  setLibraryEntry,
  missionWorldOptions,
  codeLang,
  jsonDraft,
  setCodeDraft,
  setCodeLang,
  setJsonDraft,
  setJsonError,
  setCodeView,
  setEditOpen,
  setSelection,
  setStage,
  setPending,
  setTool,
  setSimSettingsOpen,
  setSimTab,
  dispatchDocument,
  commit,
  sim,
  say,
  pythonSample,
}: UseStudioActionsArgs) {
  const openCodeView = useCallback(
    (code: boolean) => {
      if (code && codeLang === "json") {
        setJsonDraft(missionToCode(mission));
        setJsonError(null);
      }
      setCodeView(code);
    },
    [codeLang, mission, setCodeView, setJsonDraft, setJsonError],
  );

  const handleCodeLangChange = useCallback(
    (lang: "python" | "json") => {
      setCodeLang(lang);
      if (lang === "json") {
        setJsonDraft(missionToCode(mission));
        setJsonError(null);
        say("Mission JSON mode. Draft refreshed from the current mission.");
      } else {
        say("Python draft mode. Local draft only; visual route unchanged.");
      }
    },
    [mission, say, setCodeLang, setJsonDraft, setJsonError],
  );

  const handleExportJson = useCallback(() => {
    setJsonDraft(missionToCode(mission));
    setJsonError(null);
    say("Mission JSON refreshed from the current mission.");
  }, [mission, say, setJsonDraft, setJsonError]);

  const handleApplyJson = useCallback(() => {
    const { mission: next, error } = missionFromCode(jsonDraft, mission);
    if (!next || error) {
      setJsonError(error ?? "Mission JSON could not be applied.");
      say(
        `Mission JSON not applied. ${error ?? "Fix the JSON and try again."}`,
      );
      return;
    }
    setJsonError(null);
    const resolved =
      next.worldType === "2D" ? recomputeGeneratedMission(next, next) : next;
    commit(resolved, "Mission JSON applied to the visual mission.");
  }, [commit, jsonDraft, mission, say, setJsonError]);

  const saveLocal = useCallback(() => {
    if (!libraryEntry) {
      say(
        "This mission is not linked to a Library record and could not be saved.",
      );
      return;
    }
    const savedMission = { ...mission, id: libraryEntry.missionId };
    const stored = saveMissionSnapshot(
      libraryEntry.missionId,
      snapshotOf(savedMission),
      {
        name: savedMission.name,
        world: savedMission.world,
        worldType: savedMission.worldType,
        worldId: savedMission.worldId,
        vehicle: savedMission.vehicle,
        droneId: savedMission.droneId,
      },
    );
    if (!stored) {
      say("Mission could not be saved. Check browser storage and try again.");
      return;
    }
    dispatchDocument({ type: "markSaved", saved: savedMission });
    setLibraryEntry({
      ...libraryEntry,
      mission: savedMission.name,
      world: savedMission.world,
      worldType: savedMission.worldType,
      worldId: savedMission.worldId,
      vehicle: savedMission.vehicle,
      droneId: savedMission.droneId,
    });
    say(`Saved ${savedMission.name} in this browser.`);
  }, [dispatchDocument, libraryEntry, mission, say, setLibraryEntry]);

  const resetToSeed = useCallback(() => {
    const seed = seedMission();
    commit(
      recomputeGeneratedMission(seed, seed),
      "Seed mission restored: Building Facade Inspection.",
    );
    sim.reset();
    setStage("design");
    setPending([]);
    setTool("select");
    setSimSettingsOpen(false);
    setCodeView(false);
    setCodeDraft(pythonSample);
    setJsonError(null);
  }, [
    commit,
    pythonSample,
    setCodeDraft,
    setCodeView,
    setJsonError,
    setPending,
    setSimSettingsOpen,
    setStage,
    setTool,
    sim,
  ]);

  const newMission = useCallback(() => {
    const abortedPreviousRun =
      sim.status === "running" || sim.status === "paused";
    const fresh = emptyMission();
    dispatchDocument({ type: "commit", next: fresh });
    setSelection(null);
    sim.reset();
    say(
      abortedPreviousRun
        ? "New empty mission. Simulation aborted — design changed. Add mission logic to unlock Simulation."
        : "New empty mission. Add mission logic to unlock Simulation.",
    );
    setStage("design");
    setCodeView(false);
    setCodeDraft(pythonSample);
    setJsonError(null);
    setPending([]);
    setTool("select");
    setSimSettingsOpen(false);
    setSimTab("details");
  }, [
    dispatchDocument,
    pythonSample,
    say,
    setCodeDraft,
    setCodeView,
    setJsonError,
    setPending,
    setSelection,
    setSimSettingsOpen,
    setSimTab,
    setStage,
    setTool,
    sim,
  ]);

  const openEdit = useCallback(() => setEditOpen(true), [setEditOpen]);
  const saveEdit = useCallback(
    (draft: {
      name: string;
      worldType: "2D" | "3D";
      world: string;
      worldId: string;
      vehicle: string;
      droneId: string;
    }) => {
      const selectedWorld = missionWorldOptions.find(
        (world) => world.id === draft.worldId,
      );
      const nextWorldId =
        draft.worldType === "2D"
          ? undefined
          : selectedWorld?.status === "Legacy"
            ? mission.worldId === selectedWorld.id
              ? mission.worldId
              : undefined
            : selectedWorld?.id;
      const updatedMission = {
        ...mission,
        name: draft.name || mission.name,
        worldType: draft.worldType,
        world:
          draft.worldType === "2D"
            ? WORLDS[0]
            : (selectedWorld?.name ?? draft.world),
        worldId: nextWorldId,
        vehicle: draft.vehicle,
        ...(draft.droneId
          ? { droneId: draft.droneId }
          : { droneId: undefined }),
      };
      const nextMission =
        draft.worldType !== (mission.worldType ?? "3D")
          ? recomputeGeneratedMission(updatedMission, mission)
          : updatedMission;
      commit(nextMission, "Mission properties saved locally.");
    },
    [commit, mission, missionWorldOptions],
  );

  return {
    openCodeView,
    handleCodeLangChange,
    handleExportJson,
    handleApplyJson,
    saveLocal,
    resetToSeed,
    newMission,
    openEdit,
    saveEdit,
  };
}
