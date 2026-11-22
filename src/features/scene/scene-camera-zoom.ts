import type { Cartesian2, Cartesian3, Viewer } from "cesium";

type CesiumNS = typeof import("cesium");
type TerrainTriangle = readonly [Cartesian3, Cartesian3, Cartesian3];

const CAMERA_GROUND_CLEARANCE_M = 3;

interface SafeZoomArgs {
  viewer: Viewer;
  Cesium: CesiumNS;
  amountM: number;
  zoomIn: boolean;
  anchorPosition?: Cartesian2;
  terrainTriangles?: readonly TerrainTriangle[];
}

/** Apply a camera zoom without allowing it to cross the visible ground. */
export function zoomSceneCameraSafely({
  viewer,
  Cesium,
  amountM,
  zoomIn,
  anchorPosition,
  terrainTriangles = [],
}: SafeZoomArgs): void {
  if (viewer.isDestroyed() || !Number.isFinite(amountM) || amountM <= 0) return;

  const camera = viewer.camera;
  const startPosition = camera.positionWC.clone();
  const orientation = {
    heading: camera.heading,
    pitch: camera.pitch,
    roll: camera.roll,
  };

  const groundHeightAt = (position: Cartesian3): number => {
    const cartographic = Cesium.Cartographic.fromCartesian(position);
    if (!cartographic) return 0;
    let groundHeight = viewer.scene.globe.getHeight(cartographic) ?? 0;
    const normal = Cesium.Ellipsoid.WGS84.geodeticSurfaceNormal(
      position,
      new Cesium.Cartesian3(),
    );
    const rayOrigin = Cesium.Cartesian3.add(
      position,
      Cesium.Cartesian3.multiplyByScalar(
        normal,
        10000,
        new Cesium.Cartesian3(),
      ),
      new Cesium.Cartesian3(),
    );
    const ray = {
      origin: rayOrigin,
      direction: Cesium.Cartesian3.negate(normal, new Cesium.Cartesian3()),
    };
    for (const triangle of terrainTriangles) {
      const hit = Cesium.IntersectionTests.rayTriangle(
        ray,
        triangle[0],
        triangle[1],
        triangle[2],
        false,
      );
      if (!hit) continue;
      const height = Cesium.Cartographic.fromCartesian(hit)?.height;
      if (typeof height === "number" && Number.isFinite(height)) {
        groundHeight = Math.max(groundHeight, height);
      }
    }
    return groundHeight;
  };

  const isAboveGround = (position: Cartesian3): boolean => {
    const cartographic = Cesium.Cartographic.fromCartesian(position);
    return (
      !!cartographic &&
      cartographic.height >=
        groundHeightAt(position) + CAMERA_GROUND_CLEARANCE_M
    );
  };

  const pathStaysAboveGround = (
    start: Cartesian3,
    end: Cartesian3,
  ): boolean => {
    const delta = Cesium.Cartesian3.subtract(
      end,
      start,
      new Cesium.Cartesian3(),
    );
    const distance = Cesium.Cartesian3.magnitude(delta);
    if (distance <= 0) return true;
    const ray = new Cesium.Ray(
      start,
      Cesium.Cartesian3.divideByScalar(
        delta,
        distance,
        new Cesium.Cartesian3(),
      ),
    );
    const ellipsoidHit = Cesium.IntersectionTests.rayEllipsoid(
      ray,
      Cesium.Ellipsoid.WGS84,
    );
    if (
      ellipsoidHit &&
      ellipsoidHit.stop >= 0 &&
      ellipsoidHit.start <= distance
    ) {
      return false;
    }
    for (const triangle of terrainTriangles) {
      const hit = Cesium.IntersectionTests.rayTriangle(
        ray,
        triangle[0],
        triangle[1],
        triangle[2],
        false,
      );
      if (hit && Cesium.Cartesian3.distance(start, hit) <= distance)
        return false;
    }
    return true;
  };

  function applyCursorAnchor(position: Cartesian2, anchor?: Cartesian3) {
    const fixedAnchor =
      anchor ?? camera.pickEllipsoid(position, viewer.scene.globe.ellipsoid);
    if (!fixedAnchor) return;
    const after = camera.pickEllipsoid(position, viewer.scene.globe.ellipsoid);
    if (!after) return;
    const correction = Cesium.Cartesian3.subtract(
      fixedAnchor,
      after,
      new Cesium.Cartesian3(),
    );
    camera.setView({
      destination: Cesium.Cartesian3.add(
        camera.positionWC,
        correction,
        new Cesium.Cartesian3(),
      ),
      orientation: {
        heading: camera.heading,
        pitch: camera.pitch,
        roll: camera.roll,
      },
    });
  }

  // Recover a camera left below ground by a previous zoom attempt before
  // processing the next input. Keep its geographic position and view direction.
  if (!isAboveGround(startPosition)) {
    const cartographic = Cesium.Cartographic.fromCartesian(startPosition);
    if (cartographic) {
      const safePosition = Cesium.Cartesian3.fromRadians(
        cartographic.longitude,
        cartographic.latitude,
        groundHeightAt(startPosition) + CAMERA_GROUND_CLEARANCE_M,
        Cesium.Ellipsoid.WGS84,
      );
      camera.setView({ destination: safePosition, orientation });
    }
  }

  const recoveredPosition = camera.positionWC.clone();
  const cursorAnchor = anchorPosition
    ? camera.pickEllipsoid(anchorPosition, viewer.scene.globe.ellipsoid)
    : undefined;
  if (!zoomIn) {
    camera.zoomOut(amountM);
    if (cursorAnchor && anchorPosition)
      applyCursorAnchor(anchorPosition, cursorAnchor);
    if (
      !isAboveGround(camera.positionWC) ||
      !pathStaysAboveGround(recoveredPosition, camera.positionWC)
    ) {
      camera.setView({ destination: recoveredPosition, orientation });
      camera.zoomOut(amountM);
      if (
        !isAboveGround(camera.positionWC) ||
        !pathStaysAboveGround(recoveredPosition, camera.positionWC)
      ) {
        camera.setView({ destination: recoveredPosition, orientation });
      }
    }
    viewer.scene.requestRender();
    return;
  }

  // Limit the forward step to the visible globe hit, preventing a large
  // wheel delta from tunnelling through the ellipsoid in a single event.
  const center = new Cesium.Cartesian2(
    viewer.canvas.clientWidth / 2,
    viewer.canvas.clientHeight / 2,
  );
  const centerRay = camera.getPickRay(center);
  const groundHit = centerRay
    ? viewer.scene.globe.pick(centerRay, viewer.scene)
    : undefined;
  let hitDistance = groundHit
    ? Cesium.Cartesian3.distance(camera.positionWC, groundHit)
    : Number.POSITIVE_INFINITY;
  if (centerRay) {
    for (const triangle of terrainTriangles) {
      const hit = Cesium.IntersectionTests.rayTriangle(
        centerRay,
        triangle[0],
        triangle[1],
        triangle[2],
        false,
      );
      if (!hit) continue;
      hitDistance = Math.min(
        hitDistance,
        Cesium.Cartesian3.distance(camera.positionWC, hit),
      );
    }
  }
  const maxStep = Math.min(
    amountM,
    Math.max(0, hitDistance - CAMERA_GROUND_CLEARANCE_M),
  );
  if (maxStep <= 0) {
    viewer.scene.requestRender();
    return;
  }

  const applyStep = (stepM: number): boolean => {
    camera.zoomIn(stepM);
    if (cursorAnchor && anchorPosition)
      applyCursorAnchor(anchorPosition, cursorAnchor);
    return (
      isAboveGround(camera.positionWC) &&
      pathStaysAboveGround(recoveredPosition, camera.positionWC)
    );
  };

  // Find the largest safe part of this zoom step. Reapplying from the same
  // camera pose avoids a sudden stop several metres above the ground.
  let low = 0;
  let high = maxStep;
  let accepted = 0;
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const step = attempt === 0 ? high : (low + high) / 2;
    camera.setView({ destination: recoveredPosition, orientation });
    if (applyStep(step)) {
      accepted = step;
      low = step;
    } else {
      high = step;
    }
  }
  if (accepted === 0)
    camera.setView({ destination: recoveredPosition, orientation });
  viewer.scene.requestRender();
}
