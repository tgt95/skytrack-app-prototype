import { useEffect } from "react";
import type { AppTab } from "./studio-left-rail";
import type { Stage } from "./studio-map-overlays";
import {
  parseMissionViewSearch,
  sameMissionViewState,
  serializeMissionViewSearch,
  type MissionViewState,
} from "./mission-view-url";

export interface UseMissionViewUrlSyncProps {
  appTab: AppTab;
  codeView: boolean;
  previewView: boolean;
  stage: Stage;
  libraryEntry: { missionId?: string } | null;
  route: { kind: string; missionId?: string };
}

export function useMissionViewUrlSync({
  appTab,
  codeView,
  previewView,
  stage,
  libraryEntry,
  route,
}: UseMissionViewUrlSyncProps) {
  useEffect(() => {
    if (
      route.kind !== "mission" ||
      libraryEntry?.missionId !== route.missionId
    ) {
      return;
    }

    const currentSearch = window.location.search;
    const currentViewState = parseMissionViewSearch(currentSearch);
    const nextViewState: MissionViewState = {
      appTab,
      stage,
      panelView: codeView ? "code" : previewView ? "preview" : "design",
    };
    const nextSearch = serializeMissionViewSearch(nextViewState, currentSearch);
    const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash}`;
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (nextUrl === currentUrl) return;

    if (sameMissionViewState(currentViewState, nextViewState)) {
      window.history.replaceState({}, "", nextUrl);
    } else {
      window.history.pushState({}, "", nextUrl);
    }
  }, [appTab, codeView, libraryEntry, previewView, route, stage]);
}
