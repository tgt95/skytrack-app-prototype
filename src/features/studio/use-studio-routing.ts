import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import { flushSync } from "react-dom";
import {
  missionFromSnapshot,
  type SceneSelection,
  type SceneTool,
  type StudioMission,
} from "../../domain/mission-model";
import { createBlankMissionWithDefaults } from "./mission-defaults";
import type { StudioMissionDocumentAction } from "./mission-document";
import type { Stage } from "./studio-map-overlays";
import type { PendingMissionPoint } from "./use-drawing-session";
import { useStudioWorldOptions } from "./use-studio-world-options";
import type { LibraryEntry, LibrarySection } from "../library/library";
import {
  findMissionRecord,
  loadProjects,
  seedTemplates,
} from "../library/database/store";
import {
  loadDroneProfiles,
  type WorkspaceDroneProfile,
} from "../library/database/drone-store";
import { getSharedProject } from "../library/workspace/workspace-data.ts";
import {
  missionStudioRoutePath,
  parseMissionStudioRoute,
  type MissionStudioRoute,
} from "../library/router";
import { parseMissionViewSearch } from "./mission-view-url";
import type { AppTab } from "./studio-left-rail";

const PAGE_TITLES: Record<LibrarySection, string> = {
  home: "Home",
  recent: "Recent",
  projects: "Projects",
  worlds: "Worlds",
  drones: "Drones",
  starred: "Starred missions",
  shared: "Shared with me",
  learn: "Learn",
  templates: "Mission templates",
  docs: "Documentation",
  aimodels: "AI models",
  logs: "Logs",
  notifications: "Notifications",
};

interface UseStudioRoutingArgs {
  mission: StudioMission;
  say: (message: string) => void;
  dispatchDocument: Dispatch<StudioMissionDocumentAction>;
  setSelection: Dispatch<SetStateAction<SceneSelection | null>>;
  setPending: Dispatch<SetStateAction<PendingMissionPoint[]>>;
  setTool: Dispatch<SetStateAction<SceneTool>>;
  setAppTab: Dispatch<SetStateAction<AppTab>>;
  setStage: Dispatch<SetStateAction<Stage>>;
  setCodeView: Dispatch<SetStateAction<boolean>>;
  setPreviewView: Dispatch<SetStateAction<boolean>>;
  setCodeDraft: Dispatch<SetStateAction<string>>;
  setJsonError: Dispatch<SetStateAction<string | null>>;
  setSimSettingsOpen: Dispatch<SetStateAction<boolean>>;
  setSimTab: Dispatch<SetStateAction<string>>;
  simResetRef: MutableRefObject<{ reset: () => void } | null>;
  pythonSample: string;
}

export function useStudioRouting({
  mission,
  say,
  dispatchDocument,
  setSelection,
  setPending,
  setTool,
  setAppTab,
  setStage,
  setCodeView,
  setPreviewView,
  setCodeDraft,
  setJsonError,
  setSimSettingsOpen,
  setSimTab,
  simResetRef,
  pythonSample,
}: UseStudioRoutingArgs) {
  const [route, setRoute] = useState<MissionStudioRoute>(() =>
    parseMissionStudioRoute(window.location.pathname, import.meta.env.BASE_URL),
  );
  const [libraryEntry, setLibraryEntry] = useState<LibraryEntry | null>(null);
  const [workspaceDroneProfiles, setWorkspaceDroneProfiles] =
    useState<WorkspaceDroneProfile[]>(loadDroneProfiles);
  const section: "studio" | "library" =
    route.kind === "mission" ? "studio" : "library";
  const libNav =
    route.kind === "library"
      ? { section: route.section, projectId: route.projectId ?? null }
      : { section: "home" as LibrarySection, projectId: null };

  const updateRoute = useCallback(
    (
      nextRoute: MissionStudioRoute,
      updateHistory?: () => void,
      animate = true,
    ) => {
      if (animate && typeof document.startViewTransition === "function") {
        const transition = document.startViewTransition(() => {
          updateHistory?.();
          flushSync(() => setRoute(nextRoute));
        });
        void transition.ready.catch(() => {});
        return;
      }

      updateHistory?.();
      setRoute(nextRoute);
    },
    [],
  );

  const navigateRoute = useCallback(
    (nextRoute: MissionStudioRoute, replace = false) => {
      const nextPath = missionStudioRoutePath(
        nextRoute,
        import.meta.env.BASE_URL,
      );
      const pathChanged = window.location.pathname !== nextPath;
      const updateHistory = () => {
        if (!pathChanged) return;
        if (replace) window.history.replaceState({}, "", nextPath);
        else window.history.pushState({}, "", nextPath);
      };

      updateRoute(nextRoute, updateHistory, pathChanged && !replace);
    },
    [],
  );

  useEffect(() => {
    const onPopState = () => {
      const nextRoute = parseMissionStudioRoute(
        window.location.pathname,
        import.meta.env.BASE_URL,
      );
      setRoute((currentRoute) =>
        missionStudioRoutePath(currentRoute, import.meta.env.BASE_URL) ===
        missionStudioRoutePath(nextRoute, import.meta.env.BASE_URL)
          ? currentRoute
          : nextRoute,
      );
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [updateRoute]);

  useEffect(() => {
    if (route.kind !== "not-found") return;
    say(`Page ${route.pathname} was not found. Returned to Library Home.`);
    navigateRoute({ kind: "library", section: "home" }, true);
  }, [navigateRoute, route, say]);

  useEffect(() => {
    if (route.kind !== "mission") return;
    const canonicalPath = missionStudioRoutePath(
      route,
      import.meta.env.BASE_URL,
    );
    if (window.location.pathname !== canonicalPath) {
      window.history.replaceState(
        {},
        "",
        `${canonicalPath}${window.location.search}${window.location.hash}`,
      );
    }
  }, [route]);

  useEffect(() => {
    if (route.kind !== "mission") return;
    const record = findMissionRecord(loadProjects(), route.missionId);
    if (!record) {
      setLibraryEntry(null);
      say(
        `Mission ${route.missionId} was not found. Returned to Library Home.`,
      );
      navigateRoute({ kind: "library", section: "home" }, true);
      return;
    }

    const entry: LibraryEntry = {
      missionId: record.mission.id,
      projectId: record.project.id,
      project: record.project.name,
      mission: record.mission.name,
      world: record.mission.world,
      worldType: record.mission.worldType,
      worldId: record.mission.worldId,
      vehicle: record.mission.vehicle,
      droneId: record.mission.droneId,
      workspaceId: record.project.workspaceId ?? "tuan-workspace",
    };
    let restored: StudioMission;
    let snapshotWarning = "";
    try {
      restored = record.mission.missionData
        ? missionFromSnapshot(record.mission.missionData)
        : createBlankMissionWithDefaults();
    } catch {
      restored = createBlankMissionWithDefaults();
      snapshotWarning =
        " Saved mission data could not be read; a blank mission is open.";
    }
    restored = {
      ...restored,
      id: record.mission.id,
      name: record.mission.name,
      ...(record.mission.world ? { world: record.mission.world } : {}),
      ...(record.mission.worldType
        ? { worldType: record.mission.worldType }
        : {}),
      ...(record.mission.worldId ? { worldId: record.mission.worldId } : {}),
      ...(record.mission.vehicle ? { vehicle: record.mission.vehicle } : {}),
      ...(record.mission.droneId ? { droneId: record.mission.droneId } : {}),
    };

    setLibraryEntry(entry);
    setWorkspaceDroneProfiles(
      loadDroneProfiles().filter(
        (profile) => profile.workspaceId === entry.workspaceId,
      ),
    );
    dispatchDocument({ type: "load", restored });
    setSelection(null);
    setPending([]);
    setTool("select");
    const viewState = parseMissionViewSearch(window.location.search);
    setAppTab(viewState.appTab);
    setStage(viewState.stage);
    setCodeView(viewState.panelView === "code");
    setPreviewView(viewState.panelView === "preview");
    setCodeDraft(pythonSample);
    setJsonError(null);
    setSimSettingsOpen(false);
    setSimTab("details");
    simResetRef.current?.reset();
    say(
      `Mission ${record.mission.name} opened from ${record.project.name}.${snapshotWarning}`,
    );
  }, [
    dispatchDocument,
    navigateRoute,
    pythonSample,
    route,
    say,
    setAppTab,
    setCodeDraft,
    setCodeView,
    setJsonError,
    setPending,
    setPreviewView,
    setSelection,
    setSimSettingsOpen,
    setSimTab,
    setStage,
    setTool,
    simResetRef,
  ]);

  const {
    selectableMissionWorlds,
    missionWorldOptions,
    persistImportedWorld,
  } = useStudioWorldOptions({
    mission,
    workspaceId: libraryEntry?.workspaceId ?? "tuan-workspace",
    route,
  });
  const availableDrones = useMemo(
    () =>
      workspaceDroneProfiles.filter(
        (profile) =>
          profile.workspaceId ===
          (libraryEntry?.workspaceId ?? "tuan-workspace"),
      ),
    [libraryEntry?.workspaceId, workspaceDroneProfiles],
  );
  const selectedManagedDrone =
    availableDrones.find((profile) => profile.id === mission.droneId) ??
    availableDrones.find((profile) => profile.name === mission.vehicle);
  const missionDroneValue =
    selectedManagedDrone?.id ?? `legacy:${mission.vehicle}`;
  const missionDroneChoices = [
    ...availableDrones.map((profile) => ({
      value: profile.id,
      label: profile.name,
    })),
    ...(!selectedManagedDrone && mission.vehicle
      ? [{ value: missionDroneValue, label: `${mission.vehicle} (legacy)` }]
      : []),
  ];
  const documentTitle = useMemo(() => {
    const appName = "SkyTrack Mission Studio";
    if (route.kind === "not-found") return `Page not found · ${appName}`;
    if (route.kind === "mission") {
      const missionName =
        libraryEntry?.missionId === route.missionId
          ? libraryEntry.mission
          : "Mission";
      return `${missionName} · ${appName}`;
    }
    if (route.sharedMissionId) {
      const record = findMissionRecord(loadProjects(), route.sharedMissionId);
      return record
        ? `${record.mission.name} · Shared accounts · ${appName}`
        : `Shared accounts · ${appName}`;
    }
    if (route.sharedProjectId)
      return `${getSharedProject(route.sharedProjectId)?.name ?? "Shared project"} · Shared with me · ${appName}`;
    if (route.templateId) {
      const template = seedTemplates().find(
        (item) => item.id === route.templateId,
      );
      return `${template?.title ?? "Mission template"} · ${appName}`;
    }
    if (route.projectId) {
      const project = loadProjects().find(
        (item) => item.id === route.projectId,
      );
      return `${project?.name ?? "Project"} · ${appName}`;
    }
    return `${PAGE_TITLES[route.section]} · ${appName}`;
  }, [libraryEntry, route]);

  useEffect(() => {
    document.title = documentTitle;
  }, [documentTitle]);

  const openLibraryMission = useCallback(
    (entry: LibraryEntry) => {
      navigateRoute({ kind: "mission", missionId: entry.missionId });
    },
    [navigateRoute],
  );
  const onLibraryNavigate = useCallback(
    (section: LibrarySection, projectId: string | null) => {
      navigateRoute({
        kind: "library",
        section,
        ...(projectId ? { projectId } : {}),
      });
    },
    [navigateRoute],
  );
  const onOpenTemplate = useCallback(
    (templateId: string | null) => {
      navigateRoute({
        kind: "library",
        section: "templates",
        ...(templateId ? { templateId } : {}),
      });
    },
    [navigateRoute],
  );
  const onOpenSharedAccounts = useCallback(
    (missionId: string | null) => {
      navigateRoute(
        missionId
          ? { kind: "library", section: "home", sharedMissionId: missionId }
          : { kind: "library", section: "home" },
      );
    },
    [navigateRoute],
  );
  const onOpenSharedProject = useCallback(
    (projectId: string | null) => {
      navigateRoute(
        projectId
          ? { kind: "library", section: "shared", sharedProjectId: projectId }
          : { kind: "library", section: "shared" },
      );
    },
    [navigateRoute],
  );
  return {
    route,
    section,
    libNav,
    libraryEntry,
    setLibraryEntry,
    navigateRoute,
    openLibraryMission,
    onLibraryNavigate,
    onOpenTemplate,
    onOpenSharedAccounts,
    onOpenSharedProject,
    persistImportedWorld,
    selectableMissionWorlds,
    missionWorldOptions,
    availableDrones,
    missionDroneValue,
    missionDroneChoices,
  };
}
