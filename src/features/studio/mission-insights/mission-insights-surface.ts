import type { MissionInsightsReportTab } from "@/features/studio/mission-report-url";

export type MissionReportSurface = "background" | "canvas";

type RouteSurfaceConfig = {
  default: MissionReportSurface;
  tabs?: Partial<Record<MissionInsightsReportTab, MissionReportSurface>>;
};

export const missionReportSurfaceByRoute: Record<string, RouteSurfaceConfig> = {
  "mission-reports": {
    default: "background",
  },
  "mission-insights": {
    default: "background",
    tabs: {
      "overview": "canvas",
      "flight-path": "canvas",
      "ai-models": "canvas",
    },
  },
};

export function getMissionReportSurface(
  route: string,
  tab?: MissionInsightsReportTab,
): MissionReportSurface {
  const routeConfig = missionReportSurfaceByRoute[route];
  return (
    (tab && routeConfig?.tabs?.[tab]) ?? routeConfig?.default ?? "background"
  );
}
