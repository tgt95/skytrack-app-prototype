export interface MissionInsightsRoute {
  kind: "mission-insights";
  runId: string;
}

export const missionInsightsReportTabs = [
  "overview",
  "flight-path",
  "media-files",
  "ai-models",
  "timeline",
  "mission-logic",
  "raw-json",
] as const;

export type MissionInsightsReportTab =
  (typeof missionInsightsReportTabs)[number];

const REPORT_PARAM = "report";
const RUN_ID_PARAM = "runId";

export function parseMissionInsightsRoute(
  search: string,
): MissionInsightsRoute | null {
  const params = new URLSearchParams(search);
  const runId = params.get(RUN_ID_PARAM)?.trim();

  if (
    params.get("tab") !== "report" ||
    params.get(REPORT_PARAM) !== "mission-insights" ||
    !runId
  ) {
    return null;
  }

  return { kind: "mission-insights", runId };
}

export function missionInsightsSearch(search: string, runId: string): string {
  const params = new URLSearchParams(search);
  params.set("tab", "report");
  params.set(REPORT_PARAM, "mission-insights");
  params.set(RUN_ID_PARAM, runId);
  params.set("reportTab", "overview");
  return params.toString();
}

export function parseMissionInsightsReportTab(
  search: string,
): MissionInsightsReportTab {
  const value = new URLSearchParams(search).get("reportTab");
  return missionInsightsReportTabs.includes(
    value as MissionInsightsReportTab,
  )
    ? (value as MissionInsightsReportTab)
    : "overview";
}

export function missionInsightsTabSearch(
  search: string,
  reportTab: MissionInsightsReportTab,
): string {
  const params = new URLSearchParams(search);
  params.set("tab", "report");
  params.set(REPORT_PARAM, "mission-insights");
  params.set("reportTab", reportTab);
  return params.toString();
}

export function missionReportsSearch(search: string): string {
  const params = new URLSearchParams(search);
  params.set("tab", "report");
  params.delete(REPORT_PARAM);
  params.delete(RUN_ID_PARAM);
  params.delete("reportTab");
  return params.toString();
}

export function missionReportHref(
  location: Pick<Location, "pathname" | "search" | "hash">,
  search: string,
): string {
  return `${location.pathname}${search ? `?${search}` : ""}${location.hash}`;
}
