import type { ComponentProps, RefObject } from "react";
import MissionScene, { type MissionSceneHandle } from "../scene/mission-scene";
import LidarPreview from "../scene/lidar-preview";
import { DrawingAltitudeRuler } from "../design/drawing/drawing-altitude-ruler";
import type { MissionBasemapStyle } from "../scene/basemaps";
import type { StudioMission } from "../../domain/mission-model";
import type { SimPlan } from "../simulation/simulation";
import type { useAddressSearch } from "../search/use-address-search";
import { MissionContextCards, type DroneChoice } from "./mission-context-cards";
import { StudioMapControls } from "./studio-map-controls";

type SceneProps = Omit<ComponentProps<typeof MissionScene>, "ref">;

interface StudioSceneViewportProps {
  mission: StudioMission;
  hideContextCards?: boolean;
  sceneRef: RefObject<MissionSceneHandle | null>;
  sceneProps: SceneProps;
  editModeActive: boolean;
  drawing: boolean;
  stageIsDesign: boolean;
  toolIsArea: boolean;
  simActive: boolean;
  lidarOn: boolean;
  plan: SimPlan | null;
  simClockRef: { current: number };
  reducedMotion: boolean;
  drawingAltM: number;
  onDrawingAltitudeCommit: (altitudeM: number) => void;
  onAnnounce: (message: string) => void;
  droneChoices: DroneChoice[];
  selectedDroneValue: string;
  onSelectVehicle: (droneId: string, label: string) => void;
  onOpenWorldPicker: () => void;
  addressSearch: ReturnType<typeof useAddressSearch>;
  stage: "design" | "simulation";
  showPhotoMarkers: boolean;
  onShowPhotoMarkersChange: (show: boolean) => void;
  showCameraFootprint: boolean;
  onShowCameraFootprintChange: (show: boolean) => void;
  footprintOpacity: number;
  onFootprintOpacityChange: (opacity: number) => void;
  basemapStyle: MissionBasemapStyle;
  onBasemapStyleChange: (style: MissionBasemapStyle) => void;
}

export default function StudioSceneViewport({
  mission,
  hideContextCards = false,
  sceneRef,
  sceneProps,
  editModeActive,
  drawing,
  stageIsDesign,
  toolIsArea,
  simActive,
  lidarOn,
  plan,
  simClockRef,
  reducedMotion,
  drawingAltM,
  onDrawingAltitudeCommit,
  onAnnounce,
  droneChoices,
  selectedDroneValue,
  onSelectVehicle,
  onOpenWorldPicker,
  addressSearch,
  stage,
  showPhotoMarkers,
  onShowPhotoMarkersChange,
  showCameraFootprint,
  onShowCameraFootprintChange,
  footprintOpacity,
  onFootprintOpacityChange,
  basemapStyle,
  onBasemapStyleChange,
}: StudioSceneViewportProps) {
  return (
    <div
      className={[
        `ms-scene-wrap${drawing && stageIsDesign ? " has-alt-ruler" : ""}${editModeActive ? " is-editing-mode" : ""}`,
        "[@media_(max-width:_61.25rem)]:grow-0 shrink-0 basis-105 relative flex-[1_1_auto] min-h-0 bg-(--background)",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {!editModeActive && !hideContextCards ? (
        <div
          className=" absolute inset-0 z-4 pointer-events-none [&_.ms-drone-trigger]:flex-[1_1_auto] [&_.ms-drone-trigger]:min-w-0 [&_.ms-drone-trigger]:w-auto [&_.ms-drone-trigger]:min-h-0 [&_.ms-drone-trigger]:flex [&_.ms-drone-trigger]:items-center [&_.ms-drone-trigger]:gap-1.5 [&_.ms-drone-trigger]:pt-0.5 [&_.ms-drone-trigger]:pr-2 [&_.ms-drone-trigger]:pb-0.5 [&_.ms-drone-trigger]:pl-0.5 [&_.ms-drone-trigger]:[border:0] [&_.ms-drone-trigger]:rounded-[calc(var(--radius)-0.125rem)] [&_.ms-drone-trigger]:bg-transparent [&_.ms-drone-trigger]:[box-shadow:none] [&_.ms-drone-trigger]:text-inherit [&_.ms-drone-trigger]:[font:inherit] [&_.ms-drone-trigger]:text-left [&_.ms-drone-trigger]:cursor-pointer [&_.ms-drone-trigger:focus-visible]:outline-2 [&_.ms-drone-trigger:focus-visible]:outline-(--primary) [&_.ms-drone-trigger:focus-visible]:outline-offset-1"
          data-testid="ms-map-overlays"
        >
          <MissionContextCards
            mission={mission}
            droneChoices={droneChoices}
            selectedDroneValue={selectedDroneValue}
            onSelectVehicle={onSelectVehicle}
            onOpenWorldPicker={onOpenWorldPicker}
          />
        </div>
      ) : null}
      <div
        className=" absolute inset-0 z-1 [&.is-hidden]:invisible [&.is-hidden]:pointer-events-none"
        data-testid="ms-3d-layer"
      >
        {mission.worldType !== "2D" && mission.origin?.attribution ? (
          <a
            className=" absolute left-28 bottom-2.5 z-6 max-w-[min(19.375rem,calc(100%-8.25rem))] overflow-hidden py-0.75 px-1.75 border border-border rounded-(--radius) bg-(--card) text-(--muted-foreground) text-[0.6875rem] leading-[1.35] text-ellipsis [text-decoration:none] whitespace-nowrap [box-shadow:0_0.0625rem_0.25rem_color-mix(in_srgb,var(--foreground)_12%,transparent)] [&:hover]:text-(--foreground) [&:hover]:[text-decoration:underline]"
            href={mission.origin.attribution.href}
            target="_blank"
            rel="noreferrer"
            aria-label={`Geocoded origin attribution: ${mission.origin.attribution.label}`}
          >
            {mission.origin.attribution.label}
          </a>
        ) : null}
        <MissionScene ref={sceneRef} {...sceneProps} />
      </div>
      {simActive && lidarOn && plan ? (
        <LidarPreview
          plan={plan}
          clockRef={simClockRef}
          reducedMotion={reducedMotion}
        />
      ) : null}
      {drawing && stageIsDesign && !toolIsArea ? (
        <DrawingAltitudeRuler
          value={drawingAltM}
          onCommit={onDrawingAltitudeCommit}
          onAnnounce={onAnnounce}
        />
      ) : null}
      <StudioMapControls
        worldType={mission.worldType}
        worldName={mission.world}
        sceneRef={sceneRef}
        addressSearch={addressSearch}
        onAnnounce={onAnnounce}
        stageIsDesign={stage === "design"}
        showPhotoMarkers={showPhotoMarkers}
        onShowPhotoMarkersChange={onShowPhotoMarkersChange}
        showCameraFootprint={showCameraFootprint}
        onShowCameraFootprintChange={onShowCameraFootprintChange}
        footprintOpacity={footprintOpacity}
        onFootprintOpacityChange={onFootprintOpacityChange}
        basemapStyle={basemapStyle}
        onBasemapStyleChange={onBasemapStyleChange}
      />
    </div>
  );
}
