import { useEffect, type Dispatch, type SetStateAction } from "react";
import type { MissionBasemapStyle } from "@/shared/map-tiles";
import type { ThemePreference } from "@/shared/theme-preference";

interface UseStudioBasemapStateArgs {
  active: boolean;
  hasSavedMission: boolean;
  hasMapSceneLayer: boolean;
  themePreference: ThemePreference;
  savedBasemapStyle: MissionBasemapStyle | undefined;
  basemapStyle: MissionBasemapStyle;
  setBasemapStyle: Dispatch<SetStateAction<MissionBasemapStyle>>;
}

export function useStudioBasemapState({
  active,
  hasSavedMission,
  hasMapSceneLayer,
  themePreference,
  savedBasemapStyle,
  basemapStyle,
  setBasemapStyle,
}: UseStudioBasemapStateArgs) {
  useEffect(() => {
    if (!active) return;
    if (savedBasemapStyle) {
      setBasemapStyle(savedBasemapStyle);
      return;
    }

    const defaultStyle = (isDark: boolean): MissionBasemapStyle =>
      hasMapSceneLayer ? "basic" : isDark ? "dark" : "light";
    const syncBasemapToDefault = (isDark: boolean) => {
      setBasemapStyle(defaultStyle(isDark));
    };
    syncBasemapToDefault(document.documentElement.classList.contains("dark"));

    if (themePreference !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemThemeChange = (event: MediaQueryListEvent) => {
      syncBasemapToDefault(event.matches);
    };
    media.addEventListener("change", handleSystemThemeChange);
    return () => media.removeEventListener("change", handleSystemThemeChange);
  }, [
    active,
    hasMapSceneLayer,
    savedBasemapStyle,
    setBasemapStyle,
    themePreference,
  ]);

  const defaultBasemapStyle = hasMapSceneLayer
    ? "basic"
    : themePreference === "system"
      ? document.documentElement.classList.contains("dark")
        ? "dark"
        : "light"
      : themePreference;

  return (
    hasSavedMission &&
    basemapStyle !== (savedBasemapStyle ?? defaultBasemapStyle)
  );
}
