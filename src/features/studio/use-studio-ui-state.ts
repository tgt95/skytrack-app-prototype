import { useCallback, useEffect, useState } from "react";
import type { SceneSelection } from "../../domain/mission-model";
import type { MissionBasemapStyle } from "../scene/basemaps";
import type { SceneReadiness } from "../scene/mission-scene";
import { PYTHON_SAMPLE } from "../design/panels/python-editor";
import type { SimSettings } from "../simulation/simulation";
import { DEFAULT_SIM_SETTINGS } from "../simulation/simulation";
import type { AppTab } from "./studio-left-rail";
import type { Stage } from "./studio-map-overlays";
import { parseMissionViewSearch } from "./mission-view-url";

export function useStudioUiState() {
  const [initialViewState] = useState(() =>
    parseMissionViewSearch(window.location.search),
  );
  const [stage, setStage] = useState<Stage>(initialViewState.stage);
  const [appTab, setAppTab] = useState<AppTab>(initialViewState.appTab);
  const [appTabsOrientation, setAppTabsOrientation] = useState<
    "horizontal" | "vertical"
  >(() =>
    window.matchMedia("(max-width: 980px)").matches ? "horizontal" : "vertical",
  );
  useEffect(() => {
    const compactViewport = window.matchMedia("(max-width: 980px)");
    const syncOrientation = () =>
      setAppTabsOrientation(
        compactViewport.matches ? "horizontal" : "vertical",
      );
    syncOrientation();
    compactViewport.addEventListener("change", syncOrientation);
    return () => compactViewport.removeEventListener("change", syncOrientation);
  }, []);

  const [selection, setSelection] = useState<SceneSelection | null>(null);
  const [announce, setAnnounce] = useState(
    "Mission Studio ready. New empty mission.",
  );
  const say = useCallback((text: string) => setAnnounce(text), []);
  const [detailEditActive, setDetailEditActive] = useState(false);
  const [codeView, setCodeView] = useState(
    initialViewState.panelView === "code",
  );
  const [previewView, setPreviewView] = useState(
    initialViewState.panelView === "preview",
  );
  useEffect(() => {
    const restoreMissionView = () => {
      const viewState = parseMissionViewSearch(window.location.search);
      setAppTab(viewState.appTab);
      setStage(viewState.stage);
      setCodeView(viewState.panelView === "code");
      setPreviewView(viewState.panelView === "preview");
    };
    window.addEventListener("popstate", restoreMissionView);
    return () => window.removeEventListener("popstate", restoreMissionView);
  }, []);
  const [codeDraft, setCodeDraft] = useState(PYTHON_SAMPLE);
  const [aiModelsOpen, setAIModelsOpen] = useState(false);
  const [selectedAIModelId, setSelectedAIModelId] = useState<string | null>(
    null,
  );
  const [codeLang, setCodeLang] = useState<"python" | "json">("python");
  const [jsonDraft, setJsonDraft] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [rightOpen, setRightOpen] = useState(true);
  const [inspectorWidth, setInspectorWidth] = useState<number | null>(null);
  const [lidarOn, setLidarOn] = useState(true);
  const [simTab, setSimTab] = useState("details");
  const [settings, setSettings] = useState<SimSettings>(() => ({
    ...DEFAULT_SIM_SETTINGS,
    reducedMotion:
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  }));
  const [editOpen, setEditOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [simSettingsOpen, setSimSettingsOpen] = useState(true);
  const [sceneReadiness, setSceneReadiness] =
    useState<SceneReadiness>("loading");
  const [basemapStyle, setBasemapStyle] = useState<MissionBasemapStyle>(() =>
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark")
      ? "dark"
      : "light",
  );
  const [showPhotoMarkers, setShowPhotoMarkers] = useState(true);
  const [showCameraFootprint, setShowCameraFootprint] = useState(false);
  const [footprintOpacity, setFootprintOpacity] = useState(2);
  const [worldPickerOpen, setWorldPickerOpen] = useState(false);

  return {
    stage,
    setStage,
    appTab,
    setAppTab,
    appTabsOrientation,
    selection,
    setSelection,
    announce,
    setAnnounce,
    say,
    detailEditActive,
    setDetailEditActive,
    codeView,
    setCodeView,
    previewView,
    setPreviewView,
    codeDraft,
    setCodeDraft,
    codeLang,
    setCodeLang,
    jsonDraft,
    setJsonDraft,
    jsonError,
    setJsonError,
    aiModelsOpen,
    setAIModelsOpen,
    selectedAIModelId,
    setSelectedAIModelId,
    rightOpen,
    setRightOpen,
    inspectorWidth,
    setInspectorWidth,
    lidarOn,
    setLidarOn,
    simTab,
    setSimTab,
    settings,
    setSettings,
    editOpen,
    setEditOpen,
    shortcutsOpen,
    setShortcutsOpen,
    simSettingsOpen,
    setSimSettingsOpen,
    sceneReadiness,
    setSceneReadiness,
    basemapStyle,
    setBasemapStyle,
    showPhotoMarkers,
    setShowPhotoMarkers,
    showCameraFootprint,
    setShowCameraFootprint,
    footprintOpacity,
    setFootprintOpacity,
    worldPickerOpen,
    setWorldPickerOpen,
  };
}
