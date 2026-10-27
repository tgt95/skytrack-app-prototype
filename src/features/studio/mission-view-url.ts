import type { AppTab } from "./studio-left-rail";
import type { Stage } from "./studio-map-overlays";

export type MissionPanelView = "design" | "code" | "preview";

export interface MissionViewState {
  appTab: AppTab;
  stage: Stage;
  panelView: MissionPanelView;
}

const DEFAULT_VIEW_STATE: MissionViewState = {
  appTab: "plan",
  stage: "design",
  panelView: "design",
};

export function parseMissionViewSearch(search: string): MissionViewState {
  const params = new URLSearchParams(search);
  const appTab = params.get("tab");
  const stage = params.get("stage");
  const panelView = params.get("view");

  const next: MissionViewState = {
    appTab:
      appTab === "fly" || appTab === "report"
        ? appTab
        : DEFAULT_VIEW_STATE.appTab,
    stage: stage === "simulation" ? stage : DEFAULT_VIEW_STATE.stage,
    panelView:
      panelView === "code" || panelView === "preview"
        ? panelView
        : DEFAULT_VIEW_STATE.panelView,
  };

  if (next.appTab !== "plan") {
    next.stage = DEFAULT_VIEW_STATE.stage;
    next.panelView = DEFAULT_VIEW_STATE.panelView;
  } else if (next.stage !== "design") {
    next.panelView = DEFAULT_VIEW_STATE.panelView;
  }

  return next;
}

export function serializeMissionViewSearch(
  state: MissionViewState,
  currentSearch: string,
): string {
  const params = new URLSearchParams(currentSearch);
  params.delete("tab");
  params.delete("stage");
  params.delete("view");

  if (state.appTab !== "plan") {
    params.set("tab", state.appTab);
  } else if (state.stage !== "design") {
    params.set("stage", state.stage);
  } else if (state.panelView !== "design") {
    params.set("view", state.panelView);
  }

  return params.toString();
}

export function sameMissionViewState(
  left: MissionViewState,
  right: MissionViewState,
): boolean {
  return (
    left.appTab === right.appTab &&
    left.stage === right.stage &&
    left.panelView === right.panelView
  );
}
