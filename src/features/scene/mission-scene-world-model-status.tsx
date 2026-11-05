export function MissionSceneWorldModelStatus({
  active,
  loading,
  error,
}: {
  active: boolean;
  loading: boolean;
  error: string | null;
}) {
  if (!active) return null;
  if (error) {
    return (
      <div className="ms-scene-overlay absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-center bg-(--background) text-foreground p-6" role="alert" data-testid="ms-world-glb-error">
        <p className="ms-scene-overlay-title m-0 text-sm font-semibold">3D World unavailable</p>
        <p className="ms-scene-overlay-sub mt-0 mx-0 mb-2 text-xs text-(--muted-foreground) max-w-105">{error}</p>
      </div>
    );
  }
  if (!loading) return null;
  return (
    <div className="ms-scene-overlay absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-center bg-(--background) text-foreground p-6" role="status" data-testid="ms-world-glb-loading">
      <p className="ms-scene-overlay-title m-0 text-sm font-semibold">Loading imported World…</p>
      <p className="ms-scene-overlay-sub mt-0 mx-0 mb-2 text-xs text-(--muted-foreground) max-w-105">Preparing the 3D model.</p>
    </div>
  );
}
