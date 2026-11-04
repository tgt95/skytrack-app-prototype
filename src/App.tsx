import { useEffect, useState } from "react";
import { Button } from "skytrack-ui/button";
import logo from "./assets/skytrack-logo-full.svg?raw";
import LoginDrone from "./features/auth/login-drone";
import MissionStudio from "./pages/mission-studio-page";
import { DevScenarioProvider } from "./shared/dev-scenario-state";
import { STORAGE_KEYS } from "./shared/storage-keys";

export default function MissionStudioApp() {
  const [demoEntered, setDemoEntered] = useState(
    () => window.localStorage.getItem(STORAGE_KEYS.authentication) === "1",
  );
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [isDarkTheme, setIsDarkTheme] = useState(() =>
    document.documentElement.classList.contains("dark"),
  );

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotionPreference = () =>
      setPrefersReducedMotion(motionQuery.matches);
    syncMotionPreference();
    motionQuery.addEventListener("change", syncMotionPreference);
    return () =>
      motionQuery.removeEventListener("change", syncMotionPreference);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const syncTheme = () => setIsDarkTheme(root.classList.contains("dark"));
    syncTheme();

    const observer = new MutationObserver(syncTheme);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  function handleOpenDemo() {
    window.localStorage.setItem(STORAGE_KEYS.authentication, "1");
    setDemoEntered(true);
  }

  function handleExitDemo() {
    window.localStorage.removeItem(STORAGE_KEYS.authentication);
    setDemoEntered(false);
  }

  return (
    <main className="mission-studio-host [&_.sample-header]:hidden [&_.ms-root]:h-dvh!">
      {demoEntered ? (
        <DevScenarioProvider enabled={import.meta.env.DEV}>
          <MissionStudio onLogout={handleExitDemo} />
        </DevScenarioProvider>
      ) : (
        <section
          className="grid min-h-dvh place-items-center p-6 bg-(--muted) text-(--foreground) [@media_(max-width:_30rem)]:p-4"
          aria-labelledby="ms-demo-title"
          data-testid="ms-public-demo-screen"
        >
          <div
            className="flex w-[min(100%,27.5rem)] flex-col items-center [@media_(max-width:_30rem)]:w-[min(100%,25rem)]"
            data-testid="ms-public-demo-content"
          >
            <div
              className="relative flex w-[min(100%,25rem)] flex-col items-center gap-7 p-8 border border-border rounded-(--radius) bg-(--card) text-(--card-foreground) [@media_(max-width:_30rem)]:gap-6 [@media_(max-width:_30rem)]:p-6"
              data-testid="ms-public-demo-card"
            >
              <LoginDrone
                isDark={isDarkTheme}
                reducedMotion={prefersReducedMotion}
              />
              <div
                className="flex justify-center text-(--foreground) [&_svg]:block [&_svg]:w-auto [&_svg]:h-7"
                role="img"
                aria-label="SkyTrack"
                dangerouslySetInnerHTML={{ __html: logo }}
              />
              <div className="grid w-full gap-3 text-center">
                <h1 id="ms-demo-title" className="h3 mx-0 mb-0">
                  SkyTrack Mission Studio
                </h1>
                <p className="mx-0 mb-0 text-(--muted-foreground)">
                  Public demo. Your missions stay in this browser. This
                  prototype does not control a drone.
                </p>
              </div>
              <Button
                className="w-full"
                size="lg"
                onClick={handleOpenDemo}
                data-testid="ms-public-demo-open"
              >
                Open public demo
              </Button>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
