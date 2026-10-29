import { useEffect, useState } from "react";
import type { Viewer } from "cesium";
import type { UnitSystem } from "../../shared/measurement-units";
import { formatDistance } from "../../shared/measurement-units";

type CesiumNS = typeof import("cesium");

interface ScaleReading {
  meters: number;
  width: number;
}

export function MissionScaleIndicator({
  viewer,
  cesium,
  unitSystem,
}: {
  viewer: Viewer | null;
  cesium: CesiumNS | null;
  unitSystem: UnitSystem;
}) {
  const [reading, setReading] = useState<ScaleReading | null>(null);

  useEffect(() => {
    if (!viewer || !cesium || viewer.isDestroyed()) {
      setReading(null);
      return;
    }

    const samplePixels = 140;
    const targetPixels = 140;
    const measure = () => {
      if (viewer.isDestroyed()) return;
      const canvas = viewer.canvas;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (width < samplePixels + 8 || height < 80) return;

      const x = Math.min(width - samplePixels - 4, Math.max(4, width * 0.15));
      const y = height * 0.82;
      const ellipsoid = viewer.scene.globe.ellipsoid;
      const getDistance = (sampleY: number) => {
        const start = viewer.camera.pickEllipsoid(
          new cesium.Cartesian2(x, sampleY),
          ellipsoid,
        );
        const end = viewer.camera.pickEllipsoid(
          new cesium.Cartesian2(x + samplePixels, sampleY),
          ellipsoid,
        );
        return start && end ? cesium.Cartesian3.distance(start, end) : null;
      };
      const sampledMeters = getDistance(y) ?? getDistance(height * 0.58);
      if (!sampledMeters || !Number.isFinite(sampledMeters)) {
        setReading(null);
        return;
      }

      const metersAtTarget = (sampledMeters / samplePixels) * targetPixels;
      const preferredTarget =
        unitSystem === "imperial"
          ? metersAtTarget / (metersAtTarget >= 1609.344 ? 1609.344 : 0.3048)
          : metersAtTarget;
      const magnitude = 10 ** Math.floor(Math.log10(preferredTarget));
      const normalized = preferredTarget / magnitude;
      const niceFactor = normalized >= 5 ? 5 : normalized >= 2 ? 2 : 1;
      const niceDisplay = niceFactor * magnitude;
      const niceMeters =
        unitSystem === "imperial"
          ? niceDisplay * (metersAtTarget >= 1609.344 ? 1609.344 : 0.3048)
          : niceDisplay;
      const next = {
        meters: niceMeters,
        width: Math.max(
          36,
          Math.min(220, (niceMeters / metersAtTarget) * targetPixels),
        ),
      };
      setReading((current) =>
        current &&
        current.meters === next.meters &&
        Math.abs(current.width - next.width) < 0.5
          ? current
          : next,
      );
    };

    const removePostRender = viewer.scene.postRender.addEventListener(measure);
    const removeCameraChange = viewer.camera.changed.addEventListener(measure);
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(viewer.container);
    measure();

    return () => {
      removePostRender();
      removeCameraChange();
      resizeObserver.disconnect();
    };
  }, [cesium, unitSystem, viewer]);

  if (!reading) return null;

  return (
    <div
      aria-label={`Map scale ${formatDistance(reading.meters, unitSystem, 1)}`}
      className="pointer-events-none absolute bottom-4 left-4 z-20 flex flex-col items-start gap-0.5 text-xs font-semibold text-white [text-shadow:0_1px_3px_#000,0_0_5px_#000]"
      data-testid="ms-map-scale"
      role="img"
    >
      <span>{formatDistance(reading.meters, unitSystem, 1)}</span>
      <span
        className="relative h-2 border-b-2 border-white before:absolute before:bottom-0 before:left-0 before:h-2 before:border-l-2 before:border-white after:absolute after:right-0 after:bottom-0 after:h-2 after:border-r-2 after:border-white"
        style={{ width: `${reading.width}px` }}
      />
    </div>
  );
}
