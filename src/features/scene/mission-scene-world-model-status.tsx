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
      <div className="ms-scene-overlay" role="alert" data-testid="ms-world-glb-error">
        <p className="ms-scene-overlay-title">3D World unavailable</p>
        <p className="ms-scene-overlay-sub">{error}</p>
      </div>
    );
  }
  if (!loading) return null;
  return (
    <div className="ms-scene-overlay" role="status" data-testid="ms-world-glb-loading">
      <p className="ms-scene-overlay-title">Loading imported World…</p>
      <p className="ms-scene-overlay-sub">Preparing the 3D model.</p>
    </div>
  );
}
