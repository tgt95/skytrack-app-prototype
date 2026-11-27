import type { LibraryNavigate } from "@/features/library/workspace/use-library-navigation-actions";
import type { LibrarySection } from "@/features/library/library-types";
import type {
  DroneProfileEditorRoute,
  MissionStudioRoute,
} from "@/features/library/router";

export function libraryRouteState(route: MissionStudioRoute) {
  return route.kind === "library"
    ? {
        section: route.section,
        projectId: route.projectId ?? null,
        droneEditorRoute: route.droneEditor ?? null,
      }
    : {
        section: "home" as const,
        projectId: null,
        droneEditorRoute: null,
      };
}

export function createLibraryNavigate(
  route: MissionStudioRoute,
  navigateRoute: (route: MissionStudioRoute, replace?: boolean) => void,
): LibraryNavigate {
  return (
    section: LibrarySection,
    projectId: string | null,
    droneEditor?: DroneProfileEditorRoute,
  ) => {
    navigateRoute(
      {
        kind: "library",
        section,
        ...(projectId ? { projectId } : {}),
        ...(droneEditor ? { droneEditor } : {}),
      },
      section === "drones" &&
        !droneEditor &&
        route.kind === "library" &&
        Boolean(route.droneEditor),
    );
  };
}
