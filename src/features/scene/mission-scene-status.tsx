import { Button } from "skytrack-ui/button";

type SceneStatus = "loading" | "ready" | "error";

interface MissionSceneStatusProps {
  status: SceneStatus;
  without3d: boolean;
  errorMessage: string | null;
  onRetry: () => void;
  onContinueWithout3D: () => void;
}

/** Loading, renderer failure, and the user-selected no-3D fallback. */
export function MissionSceneStatus({
  status,
  without3d,
  errorMessage,
  onRetry,
  onContinueWithout3D,
}: MissionSceneStatusProps) {
  if (status === "loading" && !without3d) {
    return (
      <div
        className="ms-scene-overlay"
        role="status"
        aria-label="3D scene loading"
      >
        <p className="ms-scene-overlay-title">Loading 3D scene…</p>
        <p className="ms-scene-overlay-sub">Loading mission scene.</p>
      </div>
    );
  }

  if (status === "error" && !without3d) {
    return (
      <div
        className="ms-scene-overlay"
        role="alert"
        data-testid="ms-scene-error"
      >
        <p className="ms-scene-overlay-title">3D scene unavailable</p>
        <p className="ms-scene-overlay-sub">
          {errorMessage ?? "Renderer failed to start."}
        </p>
        <div
          className=" flex gap-[0.5rem]"
          data-testid="ms-scene-overlay-actions"
        >
          <Button
            size="sm"
            variant="default"
            onClick={onRetry}
            data-testid="ms-scene-retry"
          >
            Retry 3D
          </Button>
          <Button size="sm" variant="outline" onClick={onContinueWithout3D}>
            Continue without 3D
          </Button>
        </div>
      </div>
    );
  }

  if (without3d && status !== "ready") {
    return (
      <div
        className=" absolute left-[0.75rem] bottom-[0.75rem] flex items-center gap-[0.25rem] text-[0.75rem] text-(--muted-foreground) bg-(--card) [border:0.0625rem_solid_var(--border)] rounded-(--radius) p-[0.25rem_0.5rem]"
        role="status"
        data-testid="ms-scene-fallback"
      >
        <span>3D off — edit from the waypoint list. </span>
        <Button size="sm" variant="link" onClick={onRetry}>
          Retry 3D
        </Button>
      </div>
    );
  }

  return null;
}
