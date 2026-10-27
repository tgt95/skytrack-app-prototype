/* Route and Area sequence-block composition. The parent DesignPanel keeps tab
   state, settings/preview views, Avoid rendering, and the edit/recon/reorder
   state owner; this module only maps mission sequence entries to cards and
   forwards explicit block contracts. */

import AreaInspectorCard from "./area-inspector-card";
import RouteSequenceCard from "./route-sequence-card";
import type {
  CameraActionKind,
  MissionArea,
  MissionRouteMeta,
  MissionSequenceItem,
  ReconFlightSettings,
  SceneSelection,
  StudioMission,
} from "../../../domain/mission-model";
import type { DerivedTransfer } from "../../../domain/transfer-planner";
import type { SequenceDropPosition } from "./sequence-drag";

type Waypoint = StudioMission["waypoints"][number];

export function DesignSequenceBlocks({
  mission,
  worldType,
  selection,
  missionSequence,
  routes,
  orderedWaypoints,
  grabbedWaypointId,
  editingAreaId,
  editingAvoidId,
  areaDraft,
  isCollapsed,
  toggleCollapsed,
  routeRecon,
  areaRecon,
  transferFrom,
  isFinalSequenceItem,
  onToggleRouteRecon,
  onOpenRecon,
  onUpdateMission,
  onSelect,
  onDeleteRoute,
  onDeleteWaypoint,
  onReorderWaypoint,
  onMoveAction,
  onInsertActionAt,
  onDeleteAction,
  onDeleteZone,
  onAnnounce,
  onPickUpWaypoint,
  onPreviewMoveWaypoint,
  onDropPreviewWaypoint,
  onCancelPreviewWaypoint,
  updateActionPitch,
  onStartAreaEdit,
  onPreviewAreaDraft,
  onCancelAreaEdit,
  onCommitAreaEdit,
}: {
  mission: StudioMission;
  worldType: "2D" | "3D";
  selection: SceneSelection | null;
  missionSequence: MissionSequenceItem[];
  routes: MissionRouteMeta[];
  orderedWaypoints: Waypoint[];
  grabbedWaypointId: string | null;
  editingAreaId: string | null;
  editingAvoidId: string | null;
  areaDraft: MissionArea | null;
  isCollapsed: (key: string) => boolean;
  toggleCollapsed: (key: string) => void;
  routeRecon: (routeId: string) => ReconFlightSettings;
  areaRecon: (areaId: string) => ReconFlightSettings;
  transferFrom: (
    kind: "route" | "area",
    id: string,
  ) => DerivedTransfer | undefined;
  isFinalSequenceItem: (kind: "route" | "area", id: string) => boolean;
  onToggleRouteRecon: (
    routeId: string,
    recon: ReconFlightSettings,
  ) => void;
  onOpenRecon: (
    kind: "route" | "area",
    id: string,
    recon: ReconFlightSettings,
  ) => void;
  onUpdateMission: (next: StudioMission, label?: string) => void;
  onSelect: (selection: SceneSelection | null) => void;
  onDeleteRoute: (routeId: string) => void;
  onDeleteWaypoint: (id: string) => void;
  onReorderWaypoint: (id: string, toIndex: number) => void;
  onMoveAction: (
    fromWpId: string,
    actionId: string,
    toWpId: string,
    toActionId?: string,
    position?: SequenceDropPosition,
  ) => void;
  onInsertActionAt: (
    wpId: string,
    actionIndex: number,
    kind: CameraActionKind,
  ) => void;
  onDeleteAction: (wpId: string, actionId: string) => void;
  onDeleteZone: (kind: "area" | "avoid", id: string) => void;
  onAnnounce: (text: string) => void;
  onPickUpWaypoint: (id: string) => void;
  onPreviewMoveWaypoint: (id: string, dir: -1 | 1) => void;
  onDropPreviewWaypoint: (id: string) => void;
  onCancelPreviewWaypoint: (id: string) => void;
  updateActionPitch: (
    waypointId: string,
    actionId: string,
    value: number,
  ) => void;
  onStartAreaEdit: (area: MissionArea) => void;
  onPreviewAreaDraft: (areaId: string, draft: MissionArea) => void;
  onCancelAreaEdit: () => void;
  onCommitAreaEdit: (areaId: string, draft: MissionArea) => void;
}) {
  const routeCards = (
    editingAreaId !== null || editingAvoidId !== null ? [] : routes
  ).map((route, routeIndex) => ({ id: route.id, routeIndex }));

  const areaCards = mission.areas
    .filter(
      (area) =>
        editingAvoidId === null &&
        (editingAreaId === null || editingAreaId === area.id),
    )
    .map((area) => area);

  const visibleSequence =
    editingAreaId !== null
      ? [{ type: "area" as const, id: editingAreaId }]
      : editingAvoidId !== null
        ? []
        : missionSequence;

  return (
    <div
      className="flex flex-col gap-3 min-w-0"
      data-testid="ms-sequence-blocks"
    >
      {visibleSequence.map((item) => {
        if (item.type === "route") {
          const card = routeCards.find((entry) => entry.id === item.id);
          if (!card) return null;
          const route = routes.find((entry) => entry.id === item.id);
          if (!route) return null;
          return (
            <RouteSequenceCard
              key={route.id}
              route={route}
              routeIndex={card.routeIndex}
              mission={mission}
              orderedWaypoints={orderedWaypoints}
              worldType={worldType}
              recon={routeRecon(route.id)}
              collapsed={isCollapsed(`route:${route.id}`)}
              grabbedWaypointId={grabbedWaypointId}
              selected={selection}
              transfer={transferFrom("route", route.id)}
              isFinalSequenceItem={isFinalSequenceItem("route", route.id)}
              onToggleCollapsed={() => toggleCollapsed(`route:${route.id}`)}
              onToggleRecon={() =>
                onToggleRouteRecon(route.id, routeRecon(route.id))
              }
              onOpenRecon={() =>
                onOpenRecon("route", route.id, routeRecon(route.id))
              }
              onUpdateMission={onUpdateMission}
              onDeleteRoute={onDeleteRoute}
              onInsertActionAt={onInsertActionAt}
              onSelect={onSelect}
              onPickUpWaypoint={onPickUpWaypoint}
              onPreviewMoveWaypoint={onPreviewMoveWaypoint}
              onDropPreviewWaypoint={onDropPreviewWaypoint}
              onCancelPreviewWaypoint={onCancelPreviewWaypoint}
              onReorderWaypoint={onReorderWaypoint}
              onMoveAction={onMoveAction}
              onDeleteWaypoint={onDeleteWaypoint}
              onDeleteAction={onDeleteAction}
              onSetActionPitch={updateActionPitch}
              onAnnounce={onAnnounce}
            />
          );
        }
        const area = areaCards.find((entry) => entry.id === item.id);
        if (!area) return null;
        const recon = areaRecon(area.id);
        return (
          <AreaInspectorCard
            key={area.id}
            area={area}
            mission={mission}
            orderedWaypoints={orderedWaypoints}
            worldType={worldType}
            recon={recon}
            draft={areaDraft?.id === area.id ? areaDraft : area}
            editing={editingAreaId === area.id}
            collapsed={isCollapsed(`area:${area.id}`)}
            grabbedWaypointId={grabbedWaypointId}
            selected={selection}
            isFinalSequenceItem={isFinalSequenceItem("area", area.id)}
            transfer={transferFrom("area", area.id)}
            onEdit={() => onStartAreaEdit(area)}
            onDelete={() => onDeleteZone("area", area.id)}
            onToggleCollapsed={() => toggleCollapsed(`area:${area.id}`)}
            onToggleRecon={() =>
              onUpdateMission(
                {
                  ...mission,
                  areas: mission.areas.map((entry) =>
                    entry.id === area.id
                      ? {
                          ...entry,
                          reconnaissance: {
                            ...recon,
                            enabled: !recon.enabled,
                          },
                        }
                      : entry,
                  ),
                },
                `${area.label} reconnaissance ${recon.enabled ? "off" : "on"}.`,
              )
            }
            onOpenRecon={() => onOpenRecon("area", area.id, recon)}
            onUpdateMission={onUpdateMission}
            onSetActionPitch={updateActionPitch}
            onSelect={onSelect}
            onInsertActionAt={onInsertActionAt}
            onPickUpWaypoint={onPickUpWaypoint}
            onPreviewMoveWaypoint={onPreviewMoveWaypoint}
            onDropPreviewWaypoint={onDropPreviewWaypoint}
            onCancelPreviewWaypoint={onCancelPreviewWaypoint}
            onReorderWaypoint={onReorderWaypoint}
            onMoveAction={onMoveAction}
            onDeleteWaypoint={onDeleteWaypoint}
            onDeleteAction={onDeleteAction}
            onAnnounce={onAnnounce}
            onPreviewDraft={(nextDraft) =>
              onPreviewAreaDraft(area.id, nextDraft)
            }
            onCancelEdit={onCancelAreaEdit}
            onCommitEdit={(nextDraft) => onCommitAreaEdit(area.id, nextDraft)}
          />
        );
      })}
    </div>
  );
}
