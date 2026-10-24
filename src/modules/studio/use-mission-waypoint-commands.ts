import { useCallback, type Dispatch, type SetStateAction } from "react";
import {
  actionLabel,
  appendMissionSequenceItem,
  getMissionRoutes,
  getMissionStart,
  removeMissionSequenceItem,
  renumber,
  reorderWaypoints,
  uid,
  type CameraActionKind,
  type EnuPoint,
  type SceneSelection,
  type StudioMission,
} from "../../domain/mission-model";
import { refreshAvoidDetours } from "../../domain/mission-generation";

interface UseMissionWaypointCommandsArgs {
  mission: StudioMission;
  setSelection: Dispatch<SetStateAction<SceneSelection | null>>;
  commit: (next: StudioMission, label?: string) => void;
  say: (message: string) => void;
  detourNote: (mission: StudioMission) => string;
}

export function useMissionWaypointCommands({
  mission,
  setSelection,
  commit,
  say,
  detourNote,
}: UseMissionWaypointCommandsArgs) {
  const addWaypointAt = useCallback(
    (p: EnuPoint, requestedRouteId?: string) => {
      const routes = getMissionRoutes(mission);
      const routeId = requestedRouteId ?? routes[0]?.id ?? "route-1";
      const route = routes.find((item) => item.id === routeId);
      const nextRoutes = route
        ? mission.routes?.length
          ? mission.routes
          : routes
        : [
            ...(mission.routes ?? routes),
            {
              id: routeId,
              label: `Route ${routes.length + 1}`,
              targetSpeedMS: mission.targetSpeedMS,
            },
          ];
      const wp = {
        id: uid("wp"),
        seq: mission.waypoints.length + 1,
        x: Math.round(p.x * 10) / 10,
        y: Math.round(p.y * 10) / 10,
        z: mission.takeoffAltM,
        actions: route?.reconnaissance?.enabled
          ? [
              {
                id: uid("act"),
                kind: "photo" as const,
                label: actionLabel("photo"),
              },
            ]
          : [],
        routeId,
      };
      const out = refreshAvoidDetours(
        {
          ...mission,
          routes: nextRoutes,
          sequenceOrder: appendMissionSequenceItem(mission, {
            type: "route",
            id: routeId,
          }),
          waypoints: [...mission.waypoints, wp],
        },
        mission,
      );
      commit(
        out,
        `Waypoint ${wp.seq} added at ${wp.x}, ${wp.y}, altitude ${wp.z} m.${detourNote(out)}`,
      );
      setSelection({ kind: "waypoint", id: wp.id });
    },
    [commit, detourNote, mission],
  );

  const insertWaypointAt = useCallback(
    (beforeIndex: number, p: EnuPoint, z: number) => {
      const routeId =
        mission.waypoints[beforeIndex]?.routeId ??
        mission.waypoints[beforeIndex - 1]?.routeId ??
        getMissionRoutes(mission)[0]?.id;
      const routeReconEnabled = getMissionRoutes(mission).find(
        (route) => route.id === routeId,
      )?.reconnaissance?.enabled;
      const actions = routeReconEnabled
        ? [
            {
              id: uid("act"),
              kind: "photo" as const,
              label: actionLabel("photo"),
            },
          ]
        : [];
      const wp = {
        id: uid("wp"),
        seq: 0,
        x: p.x,
        y: p.y,
        z,
        actions,
        ...(routeId ? { routeId } : {}),
      };
      const waypoints = [...mission.waypoints];
      waypoints.splice(
        Math.max(0, Math.min(beforeIndex, waypoints.length)),
        0,
        wp,
      );
      const out = refreshAvoidDetours(
        { ...mission, waypoints: renumber(waypoints) },
        mission,
      );
      commit(out, `Waypoint inserted into route.${detourNote(out)}`);
      setSelection({ kind: "waypoint", id: wp.id });
    },
    [commit, detourNote, mission],
  );

  const removeWaypointById = useCallback(
    (id: string) => {
      const wp = mission.waypoints.find((w) => w.id === id);
      if (!wp || wp.generatedByArea || wp.generatedByAvoid) {
        say("Generated waypoints cannot be removed individually.");
        return;
      }
      const routes = getMissionRoutes(mission);
      const routeId = wp.routeId ?? routes[0]?.id;
      const waypoints = renumber(mission.waypoints.filter((w) => w.id !== id));
      const routeStillHasWaypoints =
        routeId !== undefined &&
        waypoints.some(
          (waypoint) =>
            !waypoint.generatedByArea &&
            !waypoint.generatedByAvoid &&
            (waypoint.routeId === routeId ||
              (!waypoint.routeId && routes[0]?.id === routeId)),
        );
      const removeEmptyRoute = routeId !== undefined && !routeStillHasWaypoints;
      const nextRoutes = removeEmptyRoute
        ? routes.filter((route) => route.id !== routeId)
        : routes;
      const out = refreshAvoidDetours(
        {
          ...mission,
          routes: nextRoutes.length > 0 ? nextRoutes : undefined,
          sequenceOrder: removeEmptyRoute
            ? removeMissionSequenceItem(mission, { type: "route", id: routeId })
            : mission.sequenceOrder,
          waypoints,
        },
        mission,
      );
      commit(
        out,
        `Waypoint ${wp.seq} deleted.${removeEmptyRoute ? " Empty Route removed from sequence." : ""}${detourNote(out)}`,
      );
    },
    [commit, detourNote, mission, say],
  );

  const onWaypointAltitudeChange = useCallback(
    (id: string, z: number) => {
      const wp = mission.waypoints.find((w) => w.id === id);
      if (!wp) return;
      const clamped = Math.max(0, Number.isFinite(z) ? z : wp.z);
      const rounded = Math.round(clamped * 100) / 100;
      const changedWaypoints = mission.waypoints.map((w) =>
        w.id === id
          ? {
              ...w,
              z: rounded,
              ...(w.generatedByArea || w.generatedByAvoid
                ? { altitudeOverrideM: rounded }
                : {}),
            }
          : w,
      );
      const changedMission = { ...mission, waypoints: changedWaypoints };
      const out = refreshAvoidDetours(changedMission, changedMission);
      commit(
        out,
        `Waypoint ${wp.seq} altitude set to ${rounded.toFixed(1)} m.${detourNote(out)}`,
      );
      setSelection({ kind: "waypoint", id });
    },
    [commit, detourNote, mission],
  );

  const onWaypointPositionChange = useCallback(
    (id: string, x: number, y: number) => {
      const wp = mission.waypoints.find((w) => w.id === id);
      if (!wp || wp.generatedByArea || wp.generatedByAvoid) return;
      const nx =
        Math.round(
          Math.max(-2000, Math.min(2000, Number.isFinite(x) ? x : wp.x)) * 10,
        ) / 10;
      const ny =
        Math.round(
          Math.max(-2000, Math.min(2000, Number.isFinite(y) ? y : wp.y)) * 10,
        ) / 10;
      // No-op drag (released where it started): keep selection, no history.
      if (nx === wp.x && ny === wp.y) {
        setSelection({ kind: "waypoint", id });
        return;
      }
      const out = refreshAvoidDetours(
        {
          ...mission,
          waypoints: mission.waypoints.map((w) =>
            w.id === id ? { ...w, x: nx, y: ny } : w,
          ),
        },
        mission,
      );
      commit(
        out,
        `Waypoint ${wp.seq} moved to ${nx}, ${ny}; altitude kept at ${wp.z.toFixed(1)} m.${detourNote(out)}`,
      );
      setSelection({ kind: "waypoint", id });
    },
    [commit, detourNote, mission],
  );

  const onMoveWaypoint = useCallback(
    (id: string, dir: -1 | 1) => {
      const idx = mission.waypoints.findIndex((w) => w.id === id);
      const j = idx + dir;
      if (idx < 0 || j < 0 || j >= mission.waypoints.length) return;
      const list = [...mission.waypoints];
      const [moved] = list.splice(idx, 1);
      list.splice(j, 0, moved);
      const out = refreshAvoidDetours(
        { ...mission, waypoints: renumber(list) },
        mission,
      );
      commit(out, `Waypoint moved to position ${j + 1}.${detourNote(out)}`);
      setSelection({ kind: "waypoint", id });
    },
    [commit, detourNote, mission],
  );

  const onReorderWaypoint = useCallback(
    (id: string, toIndex: number) => {
      const list = reorderWaypoints(mission.waypoints, id, toIndex);
      if (list === mission.waypoints) return;
      const out = refreshAvoidDetours({ ...mission, waypoints: list }, mission);
      const position = list.findIndex((w) => w.id === id) + 1;
      commit(
        out,
        `Waypoint reordered to position ${position} of ${list.length}.${detourNote(out)}`,
      );
      setSelection({ kind: "waypoint", id });
    },
    [commit, detourNote, mission],
  );

  const onMoveAction = useCallback(
    (
      fromWpId: string,
      actionId: string,
      toWpId: string,
      toActionId?: string,
      position: "before" | "after" = "after",
    ) => {
      const sourceWaypoint = mission.waypoints.find(
        (waypoint) => waypoint.id === fromWpId,
      );
      const targetWaypoint = mission.waypoints.find(
        (waypoint) => waypoint.id === toWpId,
      );
      if (!sourceWaypoint || !targetWaypoint) return;
      const routes = getMissionRoutes(mission);
      const sourceRouteId = sourceWaypoint.routeId ?? routes[0]?.id;
      const targetRouteId = targetWaypoint.routeId ?? routes[0]?.id;
      if (sourceRouteId !== targetRouteId) return;

      const sourceActions = [...sourceWaypoint.actions];
      const sourceIndex = sourceActions.findIndex(
        (action) => action.id === actionId,
      );
      if (sourceIndex < 0) return;
      const [movingAction] = sourceActions.splice(sourceIndex, 1);
      const targetActions =
        fromWpId === toWpId ? sourceActions : [...targetWaypoint.actions];
      let insertionIndex = targetActions.length;

      if (toActionId) {
        if (toActionId === actionId) return;
        insertionIndex = targetActions.findIndex(
          (action) => action.id === toActionId,
        );
        if (insertionIndex < 0) return;
        if (position === "after") insertionIndex += 1;
      }
      targetActions.splice(insertionIndex, 0, movingAction);

      if (
        fromWpId === toWpId &&
        sourceWaypoint.actions.every(
          (action, index) => action.id === targetActions[index]?.id,
        )
      )
        return;

      const waypoints = mission.waypoints.map((waypoint) => {
        if (fromWpId === toWpId && waypoint.id === fromWpId)
          return { ...waypoint, actions: targetActions };
        if (waypoint.id === fromWpId)
          return { ...waypoint, actions: sourceActions };
        if (waypoint.id === toWpId)
          return { ...waypoint, actions: targetActions };
        return waypoint;
      });
      commit(
        { ...mission, waypoints },
        `${movingAction.label} moved to waypoint ${targetWaypoint.seq}.`,
      );
    },
    [commit, mission],
  );

  const onDeleteAction = useCallback(
    (wpId: string, actionId: string) => {
      commit(
        {
          ...mission,
          waypoints: mission.waypoints.map((w) =>
            w.id === wpId
              ? { ...w, actions: w.actions.filter((a) => a.id !== actionId) }
              : w,
          ),
        },
        "Action removed.",
      );
    },
    [commit, mission],
  );

  const onAddWaypointToRoute = useCallback(
    (routeId: string) => {
      const routes = getMissionRoutes(mission);
      const targetRouteId = routeId || routes[0]?.id || "route-1";
      const routeWps = mission.waypoints.filter(
        (w) =>
          !w.generatedByArea &&
          !w.generatedByAvoid &&
          (w.routeId === targetRouteId ||
            (!w.routeId && targetRouteId === routes[0]?.id)),
      );
      const lastWp = routeWps[routeWps.length - 1];
      const anchor = getMissionStart(mission);
      const basePos = lastWp
        ? { x: lastWp.x + 5, y: lastWp.y + 5 }
        : { x: anchor.x + 5, y: anchor.y + 5 };
      addWaypointAt(basePos, targetRouteId);
    },
    [addWaypointAt, mission],
  );

  const onDeleteRoute = useCallback(
    (routeId: string) => {
      const routes = getMissionRoutes(mission);
      const remainingRoutes = routes.filter((r) => r.id !== routeId);
      const remainingWaypoints = mission.waypoints.filter((w) => {
        if (w.generatedByArea || w.generatedByAvoid) return true;
        const wRouteId = w.routeId ?? routes[0]?.id;
        return wRouteId !== routeId;
      });
      const out = refreshAvoidDetours(
        {
          ...mission,
          routes: remainingRoutes,
          sequenceOrder: removeMissionSequenceItem(mission, {
            type: "route",
            id: routeId,
          }),
          waypoints: renumber(remainingWaypoints),
        },
        mission,
      );
      commit(out, `Route deleted.${detourNote(out)}`);
      setSelection(null);
    },
    [commit, detourNote, mission],
  );

  const onInsertActionAt = useCallback(
    (wpId: string, actionIndex: number, kind: CameraActionKind) => {
      commit(
        {
          ...mission,
          waypoints: mission.waypoints.map((w) => {
            if (w.id !== wpId) return w;
            const actions = [...w.actions];
            actions.splice(actionIndex, 0, {
              id: uid("act"),
              kind,
              label: actionLabel(kind),
            });
            return { ...w, actions };
          }),
        },
        `${actionLabel(kind)} added.`,
      );
    },
    [commit, mission],
  );
  return {
    addWaypointAt,
    insertWaypointAt,
    removeWaypointById,
    onWaypointAltitudeChange,
    onWaypointPositionChange,
    onMoveWaypoint,
    onReorderWaypoint,
    onMoveAction,
    onDeleteAction,
    onAddWaypointToRoute,
    onDeleteRoute,
    onInsertActionAt,
  };
}
