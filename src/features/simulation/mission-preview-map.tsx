import { getMissionHome, type StudioMission } from "../../domain/mission-model";
import type { PreviewBuild } from "./mission-preview-model";

interface MissionPreviewMapProps {
  mission: StudioMission;
  rows: PreviewBuild["rows"];
  dronePosition: { x: number; y: number; z: number } | null;
}

export default function MissionPreviewMap({
  mission,
  rows,
  dronePosition,
}: MissionPreviewMapProps) {
  const home = getMissionHome(mission);
  const boundsPoints = [
    home,
    ...mission.waypoints,
    ...mission.areas.flatMap((area) => area.points),
  ];
  const bounds = boundsPoints.length
    ? {
        minX: Math.min(...boundsPoints.map((point) => point.x)),
        maxX: Math.max(...boundsPoints.map((point) => point.x)),
        minY: Math.min(...boundsPoints.map((point) => point.y)),
        maxY: Math.max(...boundsPoints.map((point) => point.y)),
      }
    : { minX: -1, maxX: 1, minY: -1, maxY: 1 };
  const spanX = Math.max(1, bounds.maxX - bounds.minX);
  const spanY = Math.max(1, bounds.maxY - bounds.minY);
  const project = (x: number, y: number) => ({
    x: 30 + ((x - bounds.minX) / spanX) * 580,
    y: 24 + ((bounds.maxY - y) / spanY) * 232,
  });
  const activePosition = dronePosition
    ? project(dronePosition.x, dronePosition.y)
    : null;
  const homePosition = project(home.x, home.y);
  return (
    <div
      className="relative min-h-55 overflow-hidden border border-border rounded-(--radius) bg-[color-mix(in_srgb,var(--muted)_28%,var(--background))]"
      role="img"
      aria-label="Mini map of areas and flight path"
    >
      <svg
        className="block w-full h-full min-h-55"
        viewBox="0 0 640 280"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
      >
        {Array.from({ length: 9 }, (_, index) => (
          <line
            key={`v${index}`}
            x1={index * 80}
            y1="0"
            x2={index * 80}
            y2="280"
            className="ms-preview-grid-line"
          />
        ))}
        {Array.from({ length: 5 }, (_, index) => (
          <line
            key={`h${index}`}
            x1="0"
            y1={index * 70}
            x2="640"
            y2={index * 70}
            className="ms-preview-grid-line"
          />
        ))}
        {mission.areas.map((area) => (
          <polygon
            key={area.id}
            points={area.points
              .map((point) => {
                const p = project(point.x, point.y);
                return `${p.x},${p.y}`;
              })
              .join(" ")}
            className=" fill-[color-mix(in_srgb,var(--primary)_12%,transparent)] stroke-(--primary) stroke-2 [stroke-dasharray:6_4]"
            data-testid="ms-preview-area"
          />
        ))}
        {rows.map(({ waypoint }, index) => {
          const point = project(waypoint.x, waypoint.y);
          const next = rows[index + 1]?.waypoint;
          const nextPoint = next ? project(next.x, next.y) : null;
          return (
            <g key={waypoint.id}>
              {nextPoint ? (
                <line
                  x1={point.x}
                  y1={point.y}
                  x2={nextPoint.x}
                  y2={nextPoint.y}
                  className=" stroke-(--primary) stroke-3 [stroke-linecap:round]"
                  data-testid="ms-preview-route-line"
                />
              ) : null}
              {waypoint.actions.some((action) => action.kind === "photo") ? (
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="11"
                  className=" fill-none stroke-[#21ba91] stroke-2"
                  data-testid="ms-preview-photo-ring"
                />
              ) : null}
              <circle
                cx={point.x}
                cy={point.y}
                r="6"
                className=" fill-(--primary) stroke-(--background) stroke-3"
                data-testid="ms-preview-waypoint-dot"
              />
              <text
                x={point.x + 9}
                y={point.y - 8}
                className=" fill-(--foreground) [font:700_0.6875rem/1_system-ui,sans-serif] [paint-order:stroke] stroke-(--background) stroke-[3px]"
                data-testid="ms-preview-map-label"
              >
                {waypoint.seq}
              </text>
            </g>
          );
        })}
        <g
          data-testid="ms-preview-home-marker"
          transform={`translate(${homePosition.x} ${homePosition.y})`}
        >
          <circle
            r="10"
            className="fill-(--card) stroke-(--primary) stroke-2"
          />
          <text
            x="12"
            y="4"
            className="fill-(--foreground) [font:700_0.625rem/1_system-ui,sans-serif] [paint-order:stroke] stroke-(--background) stroke-[3px]"
          >
            HOME
          </text>
        </g>
        {activePosition ? (
          <g
            data-testid="ms-preview-drone-marker"
            transform={`translate(${activePosition.x} ${activePosition.y})`}
          >
            <circle r="12" className="fill-[#ed6b3c] stroke-[#fff] stroke-2" />
            <path d="M0 -8 L5 5 L0 2 L-5 5 Z" className="fill-[#fff]" />
          </g>
        ) : null}
      </svg>
      <span
        className=" absolute left-2.5 bottom-2 py-1 px-1.75 rounded-[5px] bg-[color-mix(in_srgb,var(--card)_92%,transparent)] text-(--muted-foreground) text-[0.625rem]"
        data-testid="ms-preview-map-caption"
      >
        Route overview · photo points highlighted
      </span>
    </div>
  );
}
