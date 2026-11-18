import type { MissionDesignPreferences } from "@/shared/mission-design-preferences";

export function mapRenderResolutionScale(
  quality: MissionDesignPreferences["mapRenderQuality"],
): number {
  switch (quality) {
    case "performance":
      return 0.5;
    case "high":
      return 1;
    case "balanced":
    default:
      return 0.75;
  }
}
