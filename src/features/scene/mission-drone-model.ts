import type { Cartesian3, Model, Viewer } from "cesium";

type CesiumNS = typeof import("cesium");
export type MissionDroneModelState = "loading" | "ready" | "error";

interface DronePose {
  position: Cartesian3;
  heading: number;
  show: boolean;
}

/** Load the local procedural quadrotor and keep its Cesium model matrix in sync with the mission pose. */
export function loadMissionDroneModel({
  viewer,
  Cesium,
  onState,
}: {
  viewer: Viewer;
  Cesium: CesiumNS;
  onState: (state: MissionDroneModelState) => void;
}) {
  let cancelled = false;
  let model: Model | null = null;
  let removeReadyListener: (() => void) | null = null;
  let pose: DronePose | null = null;
  const url = new URL("../../assets/mission-drone.glb", import.meta.url).href;

  const applyPose = () => {
    if (!model?.ready || !pose || viewer.isDestroyed()) return;
    model.modelMatrix = Cesium.Transforms.headingPitchRollToFixedFrame(
      pose.position,
      new Cesium.HeadingPitchRoll(pose.heading, 0, 0),
      Cesium.Ellipsoid.WGS84,
    );
    model.show = pose.show;
    viewer.scene.requestRender();
  };

  onState("loading");
  void Cesium.Model.fromGltfAsync({
    url,
    modelMatrix: Cesium.Matrix4.clone(Cesium.Matrix4.IDENTITY),
    scale: 4.8,
    minimumPixelSize: 40,
    upAxis: Cesium.Axis.Y,
    forwardAxis: Cesium.Axis.Z,
    allowPicking: true,
    scene: viewer.scene,
    show: false,
  })
    .then((loaded) => {
      if (cancelled || viewer.isDestroyed()) {
        if (!loaded.isDestroyed()) loaded.destroy();
        return;
      }
      const activeModel = viewer.scene.primitives.add(loaded);
      model = activeModel;
      const ready = () => {
        removeReadyListener?.();
        removeReadyListener = null;
        if (cancelled || !activeModel.ready || viewer.isDestroyed()) return;
        applyPose();
        onState("ready");
      };
      if (activeModel.ready) ready();
      else removeReadyListener = activeModel.readyEvent.addEventListener(ready);
    })
    .catch(() => {
      if (!cancelled && !viewer.isDestroyed()) onState("error");
    });

  return {
    setPose(position: Cartesian3, heading: number, show: boolean) {
      pose = { position, heading, show };
      applyPose();
    },
    destroy() {
      cancelled = true;
      removeReadyListener?.();
      removeReadyListener = null;
      if (!model || viewer.isDestroyed()) return;
      viewer.scene.primitives.remove(model);
      model = null;
      viewer.scene.requestRender();
    },
  };
}
