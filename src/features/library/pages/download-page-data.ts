import downloadContent from "@content/download/platforms.json";
import desktopArt from "@/assets/download/desktop.svg?raw";
import mobileArt from "@/assets/download/mobile.svg?raw";
import skytrackOsArt from "@/assets/download/skytrack-os.svg?raw";
import androidLogo from "@/assets/download/android.svg?raw";
import linuxLogo from "@/assets/download/Linux_Logo_in_Linux_Libertine_Font-outline.svg?raw";
import nvidiaLogo from "@/assets/download/nvidia_logo-outline.svg?raw";
import raspberryPiLogo from "@/assets/download/raspberry_pi-outline.svg?raw";
import ubuntuLogo from "@/assets/download/ubuntu.svg?raw";
import windowsLogo from "@/assets/download/windows.svg?raw";
import macOsLogo from "@/assets/download/mac-os.svg?raw";

export const inlineLogo = (svg: string) =>
  svg
    .replace("<svg ", '<svg class="size-full" ')
    .replaceAll('fill="#161616"', 'fill="currentColor"')
    .replaceAll('fill="black"', 'fill="currentColor"');

export const androidMark = inlineLogo(androidLogo);
export const linuxMark = inlineLogo(linuxLogo);
export const nvidiaMark = inlineLogo(nvidiaLogo);
export const raspberryPiMark = inlineLogo(raspberryPiLogo);
export const ubuntuMark = inlineLogo(ubuntuLogo);
export const windowsMark = inlineLogo(windowsLogo);
export const macOsMark = inlineLogo(macOsLogo);
export const ILLUSTRATIONS = {
  desktop: desktopArt,
  mobile: mobileArt,
  "skytrack-os": skytrackOsArt,
} as const;

export const PLATFORM_LOGOS = {
  android: androidMark,
  linux: linuxMark,
  nvidia: nvidiaMark,
  raspberryPi: raspberryPiMark,
  ubuntu: ubuntuMark,
  windows: windowsMark,
  macOS: macOsMark,
} as const;

export const PLATFORMS = downloadContent.platforms.map((platform) => ({
  ...platform,
  illustration:
    ILLUSTRATIONS[platform.illustration as keyof typeof ILLUSTRATIONS],
}));

export const HOST_OPTIONS = downloadContent.desktop.hosts.map((host) => ({
  ...host,
  logo: PLATFORM_LOGOS[host.logo as keyof typeof PLATFORM_LOGOS],
}));

export type DesktopHost = (typeof HOST_OPTIONS)[number]["label"];

export const DESKTOP_HOSTS = HOST_OPTIONS.map(
  (host) => host.label,
) as DesktopHost[];
export const DOCKER_DESKTOP_INSTALL_GUIDES = downloadContent.desktop
  .dockerInstallGuides as Record<DesktopHost, string>;
export const DESKTOP_SYSTEM_REQUIREMENTS = downloadContent.desktop
  .systemRequirements as Record<
  DesktopHost,
  { label: string; value: string }[]
>;
export const ANDROID_SYSTEM_REQUIREMENTS = downloadContent.android.requirements;
export const ANDROID_SETUP_STEPS = downloadContent.android.setupSteps;
export const DESKTOP_SETUP = downloadContent.desktop.setup;
export const SKYTRACK_OS_TARGETS = downloadContent.skyTrackOs.targets.map(
  (target) => ({
    ...target,
    logo: PLATFORM_LOGOS[target.logo as keyof typeof PLATFORM_LOGOS],
    downloadImages: target.downloads,
  }),
);
export const SKYTRACK_OS_COMPATIBILITY =
  downloadContent.skyTrackOs.compatibilityTemplate;
export const JETSON_FLASH_GUIDES = import.meta.glob<string>(
  "@content/download/setup/jetson-orin-nano.md",
  { query: "?raw", import: "default", eager: true },
);
export const JETSON_FLASH_GUIDE = Object.values(JETSON_FLASH_GUIDES)[0] ?? "";
