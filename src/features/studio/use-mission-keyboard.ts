import {
  useEffect,
  useLayoutEffect,
  useRef,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  isValidRing,
  type EnuPoint,
  type SceneSelection,
  type SceneTool,
  type StudioMission,
} from "../../domain/mission-model";
import type { MissionSceneHandle } from "../scene/mission-scene";

type Stage = "design" | "simulation";
type AppTab = "plan" | "fly" | "report";
type PendingPoint = EnuPoint & { z?: number };
type SimulationController = ReturnType<
  typeof import("../simulation/simulation").useSimulation
>;

export type EscapeCaptureAction = "continue" | "cancel-drawing" | "cancel-edit";

export function resolveEscapeCaptureAction(input: {
  typing: boolean;
  overlayOpen: boolean;
  hasActiveEditDrag: boolean;
  drawingActive: boolean;
}): EscapeCaptureAction {
  if (input.typing || input.overlayOpen) return "continue";
  if (input.hasActiveEditDrag) return "cancel-edit";
  if (input.drawingActive) return "cancel-drawing";
  return "continue";
}

interface KeyboardState {
  appTab: AppTab;
  codeView: boolean;
  draftCursor: EnuPoint | null;
  hasPlan: boolean;
  lidarOn: boolean;
  mission: StudioMission;
  pending: PendingPoint[];
  pendingShape: "polygon" | "cylinder";
  sceneRef: { current: MissionSceneHandle | null };
  selection: SceneSelection | null;
  sim: SimulationController;
  simSettingsOpen: boolean;
  stage: Stage;
  tool: SceneTool;
}

interface KeyboardActions {
  cancelPending: () => void;
  closePendingShape: () => void;
  deleteSelection: () => void;
  finishPending: () => void;
  gotoStage: (next: Stage) => void;
  openCodeView: (next: boolean) => void;
  redo: () => void;
  saveLocal: () => void;
  say: (message: string) => void;
  setCloseDraftAtStart: (value: boolean) => void;
  setDraftCursor: (value: EnuPoint | null) => void;
  setLidarOn: Dispatch<SetStateAction<boolean>>;
  setPending: Dispatch<SetStateAction<PendingPoint[]>>;
  setPendingShape: (value: "polygon" | "cylinder") => void;
  setRightOpen: Dispatch<SetStateAction<boolean>>;
  setSelection: (value: SceneSelection | null) => void;
  setSimSettingsOpen: (value: boolean) => void;
  setSimTab: (value: string) => void;
  setTool: (value: SceneTool) => void;
  undo: () => void;
}

export function useMissionKeyboard(
  state: KeyboardState,
  actions: KeyboardActions,
) {
  const latest = useRef({ state, actions });
  useLayoutEffect(() => {
    latest.current = { state, actions };
  });

  useEffect(() => {
    const onEscapeCapture = (event: KeyboardEvent) => {
      const { state: current, actions: commands } = latest.current;
      if (event.key !== "Escape" || event.defaultPrevented) return;
      const target = event.target as HTMLElement | null;
      const typing =
        !!target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);
      const overlayOpen =
        !!target?.closest(
          '[role="dialog"], [role="menu"], [role="listbox"], [role="option"], [role="combobox"], [data-slot="dialog-popup"], [data-slot="popover-popup"]',
        ) ||
        !!document.querySelector(
          '[role="dialog"], [role="menu"], [role="listbox"]',
        );
      const action = resolveEscapeCaptureAction({
        typing,
        overlayOpen,
        hasActiveEditDrag: !!current.sceneRef.current?.isEditDragActive(),
        drawingActive: current.tool !== "select" || current.pending.length > 0,
      });
      if (action === "continue") return;
      event.preventDefault();
      if (action === "cancel-edit") {
        current.sceneRef.current?.cancelEditDrag();
        commands.say("Edit cancelled.");
      } else {
        event.stopPropagation();
        commands.cancelPending();
      }
    };

    const onKey = (event: KeyboardEvent) => {
      const { state: current, actions: commands } = latest.current;
      if (event.defaultPrevented) return;
      const target = event.target as HTMLElement | null;
      const typing =
        !!target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);
      const nativeInteractive = !!target?.closest(
        'a[href], button, input, textarea, select, option, summary, [contenteditable=""], [contenteditable="true"], [role="button"], [role="tab"], [role="slider"], [role="link"], [role="textbox"], [role="combobox"], [role="checkbox"], [role="radio"], [role="switch"], [role="menuitem"], [role="spinbutton"], [role="listbox"], [role="option"]',
      );
      const canCommitDraft =
        current.tool === "route"
          ? current.pending.length >= 2
          : (current.tool === "area" || current.tool === "avoid") &&
              current.pendingShape === "polygon"
            ? current.pending.length >= 3 && isValidRing(current.pending)
            : (current.tool === "area" || current.tool === "avoid") &&
                current.pendingShape === "cylinder"
              ? current.pending.length === 1 &&
                !!current.draftCursor &&
                Math.hypot(
                  current.draftCursor.x - current.pending[0].x,
                  current.draftCursor.y - current.pending[0].y,
                ) >= 0.5
              : false;

      if (
        event.key === "Enter" &&
        current.stage === "design" &&
        current.appTab === "plan" &&
        (current.tool === "route" ||
          current.tool === "area" ||
          current.tool === "avoid") &&
        !event.isComposing &&
        event.keyCode !== 229 &&
        !event.repeat &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        !event.shiftKey &&
        !typing &&
        !nativeInteractive &&
        canCommitDraft
      ) {
        event.preventDefault();
        if (
          (current.tool === "area" || current.tool === "avoid") &&
          current.pendingShape === "cylinder"
        )
          commands.closePendingShape();
        else commands.finishPending();
        return;
      }

      if (event.key === "Escape") {
        if (typing) return;
        event.preventDefault();
        if (current.sceneRef.current?.isEditDragActive()) {
          current.sceneRef.current.cancelEditDrag();
          commands.say("Edit cancelled.");
          return;
        }
        if (current.simSettingsOpen) {
          commands.setSimSettingsOpen(false);
          commands.say("Simulation settings closed.");
          return;
        }
        if (current.tool !== "select" || current.pending.length > 0) {
          commands.cancelPending();
          return;
        }
        if (current.selection) {
          commands.setSelection(null);
          commands.say("Selection cleared.");
        }
        return;
      }
      if (typing) return;
      const mod = event.ctrlKey || event.metaKey;
      if (mod && (event.key === "s" || event.key === "S")) {
        event.preventDefault();
        commands.saveLocal();
        return;
      }
      if (mod && (event.key === "z" || event.key === "Z")) {
        event.preventDefault();
        if (event.shiftKey) commands.redo();
        else commands.undo();
        return;
      }
      if (mod) return;

      switch (event.key) {
        case "1":
          commands.gotoStage("design");
          break;
        case "2":
          commands.gotoStage("simulation");
          break;
        case "a":
        case "A":
          if (current.stage === "design") {
            commands.setTool("area");
            commands.setPending([]);
            commands.setPendingShape("polygon");
            commands.setDraftCursor(null);
            commands.setCloseDraftAtStart(false);
            commands.say(
              "Area tool — click the scene to add polygon vertices, or choose Cylinder.",
            );
          }
          break;
        case "h":
        case "H":
          if (current.stage === "design") {
            commands.setTool("home");
            commands.setPending([]);
            commands.setDraftCursor(null);
            commands.setCloseDraftAtStart(false);
            commands.say(
              "Home tool — click the scene to place the drone Home point.",
            );
          }
          break;
        case "r":
        case "R":
          if (current.stage === "design") {
            commands.setTool("route");
            commands.setPending([]);
            commands.setDraftCursor(null);
            commands.setCloseDraftAtStart(false);
            commands.say("Route tool — click the scene to add waypoints.");
          }
          break;
        case "n":
        case "N":
          if (current.stage === "design") {
            commands.setTool("avoid");
            commands.setPending([]);
            commands.setPendingShape("polygon");
            commands.setDraftCursor(null);
            commands.setCloseDraftAtStart(false);
            commands.say(
              "Avoid-zone tool — click the scene to add polygon vertices, or choose Cylinder.",
            );
          }
          break;
        case "c":
        case "C":
          if (current.stage === "design")
            commands.openCodeView(!current.codeView);
          break;
        case " ":
          if (current.stage === "simulation" && current.hasPlan) {
            event.preventDefault();
            if (
              current.sim.status === "running" ||
              current.sim.status === "paused"
            ) {
              current.sim.abort();
              commands.say("Simulation aborted — design preserved.");
            } else if (current.sim.status === "idle") {
              current.sim.start();
              commands.say("Simulation started.");
            } else {
              current.sim.restart();
              commands.say("Simulation restarted.");
            }
          }
          break;
        case "p":
        case "P":
          if (current.stage === "simulation" && current.hasPlan) {
            if (current.sim.status === "running") {
              current.sim.pause();
              commands.say("Simulation paused.");
            } else if (current.sim.status === "paused") {
              current.sim.resume();
              commands.say("Simulation resumed.");
            }
          }
          break;
        case "d":
        case "D":
          if (current.stage === "simulation") commands.setSimTab("details");
          break;
        case "e":
        case "E":
          if (current.stage === "simulation") commands.setSimTab("events");
          break;
        case "l":
        case "L":
          if (current.stage === "simulation") {
            if (current.codeView) {
              commands.setSimTab("console");
              commands.say("Console tab.");
            } else {
              commands.say(
                "Console needs Code mode — enable Code view in Design first.",
              );
            }
          }
          break;
        case "v":
        case "V":
          if (current.stage === "simulation") {
            commands.setLidarOn((value) => !value);
            commands.say(
              current.lidarOn
                ? "LiDAR preview hidden."
                : "LiDAR preview shown.",
            );
          }
          break;
        case "+":
        case "=":
          current.sceneRef.current?.zoomBy(1);
          break;
        case "-":
        case "_":
          current.sceneRef.current?.zoomBy(-1);
          break;
        case "0":
          current.sceneRef.current?.resetCamera();
          commands.say("Camera reset.");
          break;
        case "f":
        case "F":
          if (current.stage === "simulation")
            current.sceneRef.current?.focusVehicle();
          else if (current.selection?.kind === "waypoint") {
            const waypoint = current.mission.waypoints.find(
              (item) => item.id === current.selection?.id,
            );
            if (waypoint) current.sceneRef.current?.focusPoint(waypoint);
            else current.sceneRef.current?.focusVehicle();
          } else {
            current.sceneRef.current?.focusVehicle();
          }
          break;
        case "\\":
          commands.setRightOpen((value) => !value);
          break;
        case "Delete":
        case "Backspace":
          if (current.stage === "design" && current.selection) {
            event.preventDefault();
            commands.deleteSelection();
          }
          break;
        default:
          break;
      }
    };

    document.addEventListener("keydown", onEscapeCapture, true);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onEscapeCapture, true);
      window.removeEventListener("keydown", onKey);
    };
  }, []);
}
