import { useState } from "react";
import {
  SATELLITE_TILE_ATTRIBUTION,
  satelliteTileUrl,
} from "../../shared/map-tiles";
import MissionThumbnail from "./mission-thumbnail";

interface MissionMapThumbnailProps {
  origin: { lat: number; lng: number };
  missionName: string;
}

function SatelliteTile({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) return <MissionThumbnail />;

  return (
    <>
      <img
        src={src}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 size-full object-cover"
        onError={() => setFailed(true)}
      />
      <span className="absolute bottom-1 right-1 rounded-sm bg-black/65 px-1 py-0.5 text-[0.5625rem] leading-none text-white">
        {SATELLITE_TILE_ATTRIBUTION}
      </span>
    </>
  );
}

export default function MissionMapThumbnail({
  origin,
  missionName,
}: MissionMapThumbnailProps) {
  const src = satelliteTileUrl(origin);

  return (
    <span
      role="img"
      aria-label={`Aerial map preview for ${missionName}`}
      className="absolute inset-0 block overflow-hidden bg-(--muted)"
    >
      <SatelliteTile key={src} src={src} />
    </span>
  );
}
