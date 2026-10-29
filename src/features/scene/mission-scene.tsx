/* Route-local Cesium host; authored geometry uses the mission's local ENU anchor. */

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import type {
  MissionSceneHandle,
  MissionSceneProps,
} from "./mission-scene-types";
export type { MissionSceneHandle, SceneReadiness } from "./mission-scene-types";
import type { Viewer } from "cesium";
import {
  missionOrigin,
  type SceneTool,
  type StudioMission,
} from "../../domain/mission-model";
import { MissionCompassCube } from "./mission-compass-cube";
import type { MissionCubeSnap } from "./mission-compass-model";
import { removeSceneEntitiesInLayer } from "./scene-entity-ownership";
import { syncDraftOverlay } from "./scene-draft-sync";
import { syncCommittedMissionEntities } from "./sync-committed-layer";
import { syncCaptureEntities } from "./sync-capture-layer";
import { createMissionSceneHandle } from "./mission-scene-handle";
import { startMissionSceneRuntime } from "./scene-viewer-runtime";
import { fitMission } from "./scene-camera-gestures";
import { MissionSceneStatus } from "./mission-scene-status";
import { useMissionSceneWorldLayers } from "./use-mission-scene-world-layers";
import { MissionSceneWorldModelStatus } from "./mission-scene-world-model-status";
import { MISSION_DESIGN_PREFERENCES_CHANGE_EVENT, readMissionDesignPreferences } from "../../shared/mission-design-preferences";

type CesiumNS = typeof import("cesium");

import {
  enuToLngLat,
  syncSearchMarkerEntities,
} from "./mission-scene-helpers";

const MissionScene = forwardRef<MissionSceneHandle, MissionSceneProps>(
  function MissionScene(
    {
      mission,
      tool,
      selection,
      simActive,
      clockRef,
      previewPositionRef,
      previewCaptureRef,
      plan,
      reducedMotion,
      showPhotoMarkers = true,
      showCameraFootprint = false,
      footprintOpacity = 42,
      showAreaSurface = false,
      basemap = "satellite",
      worldModel,
      searchMarker = null,
      pendingPoints,
      pendingShape,
      draftCursor,
      closeDraftAtStart,
      draftAreaSettings,
      draftAvoidSettings,
      drawingAltM,
      planeVisible,
      onPickWaypoint,
      onPickZone,
      onClearSelection,
      onScenePoint,
      onDraftHover,
      onClosePending,
      onInsertWaypoint,
      onRemoveWaypoint,
      onWaypointAltitudeChange,
      onWaypointPositionChange,
      onAvoidHeightChange,
      onPendingPositionChange,
      onPendingAltitudeChange,
      onInsertPendingPoint,
      onRemovePendingPoint,
      onGroupMovePreview,
      onGroupMoveCommit,
      onGroupMoveCancel,
      onReadinessChange,
    },
    ref,
  ) {
    const [preferencesRevision, setPreferencesRevision] = useState(0);
    const selectedPhotoWaypointId =
      selection?.kind === "waypoint" &&
      mission.waypoints
        .find((waypoint) => waypoint.id === selection.id)
        ?.actions.some((action) => action.kind === "photo")
        ? selection.id
        : null;
    const focusedPhotoWaypointId = showPhotoMarkers
      ? selectedPhotoWaypointId
      : null;
    const hostRef = useRef<HTMLDivElement>(null);
    const viewerRef = useRef<Viewer | null>(null);
    const cesiumRef = useRef<CesiumNS | null>(null);
    const editControlsRef = useRef<{
      hasActiveEditDrag(): boolean;
      escAbortEdits(): void;
    } | null>(null);
    const toolRef = useRef(tool);
    toolRef.current = tool;
    const missionRef = useRef(mission);
    missionRef.current = mission;
    const selectionRef = useRef(selection);
    selectionRef.current = selection;
    const simActiveRef = useRef(simActive);
    simActiveRef.current = simActive;
    const planRef = useRef(plan);
    planRef.current = plan;
    const reducedRef = useRef(reducedMotion);
    reducedRef.current = reducedMotion;
    const pendingPointsRef = useRef(pendingPoints);
    pendingPointsRef.current = pendingPoints;
    const pendingShapeRef = useRef(pendingShape);
    pendingShapeRef.current = pendingShape;
    const pickRef = useRef({
      onPickWaypoint,
      onPickZone,
      onClearSelection,
      onScenePoint,
      onDraftHover,
      onClosePending,
      onInsertWaypoint,
      onRemoveWaypoint,
      onWaypointAltitudeChange,
      onWaypointPositionChange,
      onAvoidHeightChange,
      onPendingPositionChange,
      onPendingAltitudeChange,
      onInsertPendingPoint,
      onRemovePendingPoint,
      onGroupMovePreview,
      onGroupMoveCommit,
      onGroupMoveCancel,
    });
    pickRef.current = {
      onPickWaypoint,
      onPickZone,
      onClearSelection,
      onScenePoint,
      onDraftHover,
      onClosePending,
      onInsertWaypoint,
      onRemoveWaypoint,
      onWaypointAltitudeChange,
      onWaypointPositionChange,
      onAvoidHeightChange,
      onPendingPositionChange,
      onPendingAltitudeChange,
      onInsertPendingPoint,
      onRemovePendingPoint,
      onGroupMovePreview,
      onGroupMoveCommit,
      onGroupMoveCancel,
    };
    const readinessRef = useRef(onReadinessChange);
    readinessRef.current = onReadinessChange;
    /* Keep high-frequency ruler values fresh without re-subscribing Cesium handlers. */
    const drawAltRef = useRef(drawingAltM);
    drawAltRef.current = drawingAltM;
    const planeVisibleRef = useRef(planeVisible);
    planeVisibleRef.current = planeVisible;
    /* Compact/expanded wireframes support hovered capture-frustum emphasis. */
    const hoveredPhotoRef = useRef<string | null>(null);
    const selectedPhotoRef = useRef<string | null>(selectedPhotoWaypointId);
    selectedPhotoRef.current = selectedPhotoWaypointId;
    const renderedPreviewCaptureRef = useRef<string | null>(null);
    /* Capture-layer ownership and last mission snapshot for preview invalidation. */
    const renderedPreviewMissionRef = useRef<StudioMission | null>(null);
    const frustumGeomRef = useRef(
      new Map<
        string,
        {
          compactBase: import("cesium").Cartesian3[];
          expandedBase: import("cesium").Cartesian3[];
          compactRays: import("cesium").Cartesian3[];
          expandedRays: import("cesium").Cartesian3[];
        }
      >(),
    );
    const worldTerrainTrianglesRef = useRef<
      Array<
        readonly [
          import("cesium").Cartesian3,
          import("cesium").Cartesian3,
          import("cesium").Cartesian3,
        ]
      >
    >([]);
    const showPhotoMarkersRef = useRef(showPhotoMarkers);
    showPhotoMarkersRef.current = showPhotoMarkers;
    /* Frustums show camera volume; the separate footprint toggle adds ground quads. */
    /* Z-only drag starts on LEFT_DOWN after a plain Z hold outside text inputs. */
    const zHeldRef = useRef(false);
    const zdragRef = useRef<{
      id: string;
      startY: number;
      startZ: number;
    } | null>(null);
    const zdragInputsRef = useRef(true);
    /* Hovered entity wins; otherwise ray-match authored segments. Delete is click-again. */
    const hoverRef = useRef<{
      insert: number | null;
      pendingInsert: number | null;
    }>({ insert: null, pendingInsert: null });
    const hoveredWaypointRef = useRef<string | null>(null);
    /* Pointer handler owns the ground guide; committed sync hides deleted or re-aims moved waypoints. */
    const revalidateWaypointGroundGuideRef = useRef<
      (mission: StudioMission) => void
    >(() => undefined);
    /* Waypoint drag previews XY or latched Shift-Z; commit once on pointerup. */
    const wpDragRef = useRef<{
      id: string;
      mode: "xy" | "z";
      startClientX: number;
      startClientY: number;
      startX: number;
      startY: number;
      startZ: number;
      moved: boolean;
    } | null>(null);
    /* Pending route drag previews XY or Shift-Z and commits once to the pane. */
    const pendingDragRef = useRef<{
      index: number;
      mode: "xy" | "z";
      startClientX: number;
      startClientY: number;
      startX: number;
      startY: number;
      startZ: number;
      currentX: number;
      currentY: number;
      currentZ: number;
      moved: boolean;
    } | null>(null);
    /* Draft click-again delete requires the same point and <=4 px travel; drags never delete. */
    const pendingDownRef = useRef<{
      index: number;
      x: number;
      y: number;
      tool: SceneTool;
    } | null>(null);
    const pendingClickArmRef = useRef<{
      index: number;
      toolRev: number;
    } | null>(null);
    const wpDownRef = useRef<{
      id: string;
      x: number;
      y: number;
      tool: SceneTool;
    } | null>(null);
    /* Selection-time tool/revisions prevent a tool switch from arming click-again delete. */
    const selectMetaRef = useRef<{
      id: string;
      tool: SceneTool;
      rev: number;
      selRev: number;
    } | null>(null);
    const topDownRef = useRef<() => void>(() => undefined);
    /* Restore an uncommitted Z preview; refs keep the callback fresh for both callers. */
    const abortZdragLocal = () => {
      const viewer = viewerRef.current;
      const Cesium = cesiumRef.current;
      const zdrag = zdragRef.current;
      if (!viewer || !Cesium || viewer.isDestroyed() || !zdrag) return;
      const wp = missionRef.current.waypoints.find((w) => w.id === zdrag.id);
      if (wp) {
        const g = enuToLngLat(wp.x, wp.y, missionOrigin(missionRef.current));
        const entity = viewer.entities.getById(`ms-wp-${zdrag.id}`);
        const pos = entity?.position as unknown as
          { setValue?: (v: import("cesium").Cartesian3) => void } | undefined;
        if (pos && typeof pos.setValue === "function") {
          pos.setValue(Cesium.Cartesian3.fromDegrees(g.lng, g.lat, wp.z));
        }
      }
      hoverRef.current = { insert: null, pendingInsert: null };
      viewer.scene.screenSpaceCameraController.enableInputs =
        zdragInputsRef.current;
      zdragRef.current = null;
      zHeldRef.current = false;
      viewer.scene.requestRender();
    };
    /* Restore the waypoint preview without commit; finishCamDrag restores camera inputs. */
    const abortWpDragLocal = () => {
      const viewer = viewerRef.current;
      const Cesium = cesiumRef.current;
      const wd = wpDragRef.current;
      wpDragRef.current = null;
      if (!viewer || !Cesium || viewer.isDestroyed() || !wd || !wd.moved)
        return;
      const g = enuToLngLat(
        wd.startX,
        wd.startY,
        missionOrigin(missionRef.current),
      );
      const entity = viewer.entities.getById(`ms-wp-${wd.id}`);
      const pos = entity?.position as unknown as
        { setValue?: (v: import("cesium").Cartesian3) => void } | undefined;
      if (pos && typeof pos.setValue === "function") {
        pos.setValue(Cesium.Cartesian3.fromDegrees(g.lng, g.lat, wd.startZ));
      }
      viewer.scene.requestRender();
    };
    const abortPendingDragLocal = () => {
      const viewer = viewerRef.current;
      const Cesium = cesiumRef.current;
      const pd = pendingDragRef.current;
      pendingDragRef.current = null;
      if (!viewer || !Cesium || viewer.isDestroyed() || !pd || !pd.moved)
        return;
      const g = enuToLngLat(
        pd.startX,
        pd.startY,
        missionOrigin(missionRef.current),
      );
      const entity = viewer.entities.getById(`ms-pending-${pd.index}`);
      const pos = entity?.position as unknown as
        { setValue?: (v: import("cesium").Cartesian3) => void } | undefined;
      if (pos && typeof pos.setValue === "function") {
        pos.setValue(Cesium.Cartesian3.fromDegrees(g.lng, g.lat, pd.startZ));
      }
      const lineEntity = viewer.entities.getById("ms-pending-line");
      if (lineEntity && pendingPointsRef.current.length >= 2) {
        const flat: number[] = [];
        const defAlt = Math.max(
          drawAltRef.current,
          missionRef.current.takeoffAltM,
          0.5,
        );
        pendingPointsRef.current.forEach((p) => {
          const pz = typeof p.z === "number" ? p.z : defAlt;
          const ptG = enuToLngLat(p.x, p.y, missionOrigin(missionRef.current));
          flat.push(ptG.lng, ptG.lat, pz);
        });
        const poly = lineEntity.polyline as unknown as
          | {
              positions?: {
                setValue?: (v: import("cesium").Cartesian3[]) => void;
              };
            }
          | undefined;
        if (
          poly &&
          poly.positions &&
          typeof poly.positions.setValue === "function"
        ) {
          poly.positions.setValue(
            Cesium.Cartesian3.fromDegreesArrayHeights(flat),
          );
        }
      }
      viewer.scene.requestRender();
    };

    /* Selection breaks disarm click-again delete; reselecting starts a fresh first click. */
    const toolRevRef = useRef(0);
    const selRevRef = useRef(0);
    const selKeyRef = useRef<string | null>(null);
    useEffect(() => {
      toolRevRef.current += 1;
      pendingClickArmRef.current = null;
      pendingDownRef.current = null;
    }, [tool]);
    useEffect(() => {
      // Equal waypoint selection is continuous; redundant updates don't disarm its click.
      const key = selection?.kind === "waypoint" ? selection.id : null;
      if (key === selKeyRef.current) return;
      selKeyRef.current = key;
      selRevRef.current += 1;
      if (key !== null) {
        selectMetaRef.current = {
          id: key,
          tool,
          rev: toolRevRef.current,
          selRev: selRevRef.current,
        };
      } else {
        selectMetaRef.current = null;
      }
    }, [selection, tool]);

    const [status, setStatus] = useState<"loading" | "ready" | "error">(
      "loading",
    );
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);
    const [without3d, setWithout3d] = useState(false);
    const fitRef = useRef(fitMission);
    fitRef.current = fitMission;
    const worldModelScene = useMissionSceneWorldLayers({
      viewerRef,
      cesiumRef,
      status,
      mission,
      missionRef,
      fitRef,
      source: worldModel,
      basemap,
    });
    /* Search pin is independently owned and never affects mission state or camera fitting. */
    useEffect(() => {
      const updatePreferences = () => setPreferencesRevision((revision) => revision + 1);
      window.addEventListener(MISSION_DESIGN_PREFERENCES_CHANGE_EVENT, updatePreferences);
      return () => window.removeEventListener(MISSION_DESIGN_PREFERENCES_CHANGE_EVENT, updatePreferences);
    }, []);

    useEffect(() => {
      const viewer = viewerRef.current;
      const Cesium = cesiumRef.current;
      if (!viewer || !Cesium || viewer.isDestroyed() || status !== "ready") return;
      const controller = viewer.scene.screenSpaceCameraController;
      const priorZoomEnabled = controller.enableZoom;
      controller.enableZoom = false;
      const handleWheel = (event: WheelEvent) => {
        if (viewer.isDestroyed()) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        const preferences = readMissionDesignPreferences();
        const isZoomIn = (event.deltaY < 0) !== (preferences.zoomDirection === "reversed");
        const distance = Math.max(1, viewer.camera.positionCartographic?.height ?? 100);
        const amount = Math.max(0.5, distance * Math.min(0.2, Math.abs(event.deltaY) * 0.001));
        const position = new Cesium.Cartesian2(event.offsetX, event.offsetY);
        const anchor = preferences.zoomAnchor === "cursor"
          ? viewer.camera.pickEllipsoid(position, viewer.scene.globe.ellipsoid)
          : undefined;
        if (isZoomIn) viewer.camera.zoomIn(amount);
        else viewer.camera.zoomOut(amount);
        if (anchor && preferences.zoomAnchor === "cursor") {
          const after = viewer.camera.pickEllipsoid(position, viewer.scene.globe.ellipsoid);
          if (after) {
            const correction = Cesium.Cartesian3.subtract(anchor, after, new Cesium.Cartesian3());
            const destination = Cesium.Cartesian3.add(viewer.camera.positionWC, correction, new Cesium.Cartesian3());
            viewer.camera.setView({ destination, orientation: { heading: viewer.camera.heading, pitch: viewer.camera.pitch, roll: viewer.camera.roll } });
          }
        }
        viewer.scene.requestRender();
      };
      viewer.canvas.addEventListener("wheel", handleWheel, { capture: true, passive: false });
      return () => {
        viewer.canvas.removeEventListener("wheel", handleWheel, true);
        if (!viewer.isDestroyed()) controller.enableZoom = priorZoomEnabled;
      };
    }, [status, preferencesRevision]);

    useEffect(() => {
      const viewer = viewerRef.current;
      const Cesium = cesiumRef.current;
      if (!viewer || !Cesium || viewer.isDestroyed() || status !== "ready")
        return;
      syncSearchMarkerEntities(viewer, Cesium, searchMarker);
    }, [status, searchMarker]);
    /* Compass cube orientation updates on camera change, gestures, and snaps. */
    const [orientation, setOrientation] = useState({
      heading: 0.6,
      pitch: -0.62,
    });
    const snapFnRef = useRef<(snap: MissionCubeSnap) => void>(() => undefined);
    const orbitByRef = useRef<(dx: number, dy: number) => void>(
      () => undefined,
    );
    const orbitEndRef = useRef<() => void>(() => undefined);
    const gestureModeRef = useRef("none");
    const handleCubeSnap = useCallback(
      (snap: MissionCubeSnap) => snapFnRef.current(snap),
      [],
    );
    const handleCubeOrbitBy = useCallback(
      (dx: number, dy: number) => orbitByRef.current(dx, dy),
      [],
    );
    const handleCubeOrbitEnd = useCallback(() => orbitEndRef.current(), []);
    /* Drain bounded frames after sync; Cesium builds primitives over several frames. */
    const settleRef = useRef(0);

    useImperativeHandle(ref, () =>
      createMissionSceneHandle({
        viewerRef,
        cesiumRef,
        fitRef,
        missionRef,
        planRef,
        reducedRef,
        clockRef,
        topDownRef,
        zdragRef,
        wpDragRef,
        pendingDragRef,
        editControlsRef,
        abortPendingDrag: abortPendingDragLocal,
        abortWpDrag: abortWpDragLocal,
        abortZdrag: abortZdragLocal,
      }),
    );

    /* ------------------------- viewer lifecycle ------------------------- */
    useEffect(
      () =>
        startMissionSceneRuntime({
          hostRef,
          viewerRef,
          cesiumRef,
          missionRef,
          simActiveRef,
          planRef,
          reducedRef,
          gestureModeRef,
          snapFnRef,
          orbitByRef,
          orbitEndRef,
          topDownRef,
          renderedPreviewCaptureRef,
          renderedPreviewMissionRef,
          settleRef,
          previewCaptureRef,
          previewPositionRef,
          clockRef,
          editControlsRef,
          editState: {
            missionRef,
            toolRef,
            selectionRef,
            simActiveRef,
            pickRef,
            drawAltRef,
            pendingPointsRef,
            pendingShapeRef,
            hoverRef,
            hoveredWaypointRef,
            hoveredPhotoRef,
            selectedPhotoRef,
            showPhotoMarkersRef,
            frustumGeomRef,
            zHeldRef,
            zdragRef,
            zdragInputsRef,
            wpDragRef,
            pendingDragRef,
            pendingDownRef,
            pendingClickArmRef,
            wpDownRef,
            selectMetaRef,
            toolRevRef,
            selRevRef,
            worldTerrainTrianglesRef,
            abortZdrag: abortZdragLocal,
            abortWpDrag: abortWpDragLocal,
            abortPendingDrag: abortPendingDragLocal,
          },
          readinessRef,
          setStatus,
          setErrorMessage,
          setOrientation,
          fitRef,
          revalidateWaypointGroundGuideRef,
          createViewer: (Cesium, host) =>
            new Cesium.Viewer(host, {
              animation: false,
              baseLayer: false,
              baseLayerPicker: false,
              fullscreenButton: false,
              geocoder: false,
              homeButton: false,
              infoBox: false,
              sceneModePicker: false,
              selectionIndicator: false,
              timeline: false,
              navigationHelpButton: false,
              navigationInstructionsInitiallyVisible: false,
              requestRenderMode: true,
              maximumRenderTimeChange: Number.POSITIVE_INFINITY,
              msaaSamples: 4,
              showRenderLoopErrors: false,
            }),
          destroyViewer: (viewer) => {
            if (!viewer.isDestroyed()) viewer.destroy();
          },
        }),
      [retryCount],
    );

    /* ------------------------- entity sync ------------------------- */
    /* Draft plane/points sync alone on ruler changes; preview heights match commit rules. */

    useEffect(() => {
      const viewer = viewerRef.current;
      const Cesium = cesiumRef.current;
      if (!viewer || !Cesium || viewer.isDestroyed() || status !== "ready")
        return;
      hoverRef.current = { insert: null, pendingInsert: null };
      worldTerrainTrianglesRef.current = syncCommittedMissionEntities({
        viewer,
        Cesium,
        mission,
        selection,
        simActive,
        showAreaSurface,
        focusedPhotoWaypointId,
        worldModelActive: worldModelScene.active,
      });
      viewer.scene.requestRender();
      settleRef.current = 90;
      if (hostRef.current)
        hostRef.current.dataset.entities = String(
          viewer.entities.values.length,
        );
      revalidateWaypointGroundGuideRef.current(mission);
    }, [mission, selection, simActive, status, showAreaSurface, worldModelScene.active, preferencesRevision]);

    /* Draft cursor/ruler changes refresh only draft-owned entities. */
    useEffect(() => {
      const viewer = viewerRef.current;
      const Cesium = cesiumRef.current;
      if (!viewer || !Cesium || viewer.isDestroyed() || status !== "ready")
        return;
      /* Replace draft-owned plane/points only; other entity layers must survive. */
      removeSceneEntitiesInLayer(viewer.entities, "draft");
      syncDraftOverlay(
        viewer,
        Cesium,
        mission,
        pendingPoints,
        tool,
        pendingShape,
        draftCursor,
        closeDraftAtStart,
        draftAreaSettings,
        draftAvoidSettings,
        drawingAltM,
        planeVisible,
      );
      viewer.scene.requestRender();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
      mission,
      pendingPoints,
      tool,
      drawingAltM,
      planeVisible,
      pendingShape,
      draftCursor,
      closeDraftAtStart,
      draftAreaSettings,
      draftAvoidSettings,
      status,
    ]);

    useEffect(() => {
      const viewer = viewerRef.current;
      const Cesium = cesiumRef.current;
      if (!viewer || !Cesium || viewer.isDestroyed()) return;
      hoveredPhotoRef.current = null;
      frustumGeomRef.current = syncCaptureEntities({
        viewer,
        Cesium,
        mission,
        focusedPhotoWaypointId,
        showPhotoMarkers,
        showCameraFootprint,
        footprintOpacity,
      });
      settleRef.current = 90;
      viewer.scene.requestRender();
    }, [
      mission,
      selection,
      showPhotoMarkers,
      showCameraFootprint,
      footprintOpacity,
      status,
    ]);

    return (
      <div className="ms-scene absolute inset-0" data-testid="ms-scene">
        <div
          ref={hostRef}
          className=" absolute inset-0 [&_canvas]:block [&_canvas]:w-full [&_canvas]:h-full"
          aria-hidden={status !== "ready"}
          data-testid="ms-scene-host"
        />
        {status === "ready" && !without3d ? (
          <MissionCompassCube
            heading={orientation.heading}
            pitch={orientation.pitch}
            interactive
            onSnap={handleCubeSnap}
            onOrbitBy={handleCubeOrbitBy}
            onOrbitEnd={handleCubeOrbitEnd}
          />
        ) : null}
        <MissionSceneStatus
          status={status}
          without3d={without3d}
          errorMessage={errorMessage}
          onRetry={() => {
            setWithout3d(false);
            setStatus("loading");
            onReadinessChange("loading");
            setRetryCount((c) => c + 1);
          }}
          onContinueWithout3D={() => {
            setWithout3d(true);
            onReadinessChange("without-3d");
          }}
        />
        <MissionSceneWorldModelStatus
          active={worldModelScene.active && status === "ready"}
          loading={worldModelScene.loading}
          error={worldModelScene.error}
        />
      </div>
    );
  },
);

export default MissionScene;
