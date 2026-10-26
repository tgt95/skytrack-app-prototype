import {
  CaretDownIcon,
  CrosshairIcon,
  DroneIcon,
  GearIcon,
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
  MapTrifoldIcon,
  PlusIcon,
  StackIcon,
} from "@phosphor-icons/react";
import { Button } from "skytrack-ui/button";
import { CheckboxIndicator, CheckboxRoot } from "skytrack-ui/checkbox";
import {
  Popover,
  PopoverArrow,
  PopoverClose,
  PopoverPopup,
  PopoverPortal,
  PopoverPositioner,
  PopoverTitle,
  PopoverTrigger,
} from "skytrack-ui/popover";
import {
  Select,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
  SelectList,
  SelectPopup,
  SelectPortal,
  SelectPositioner,
  SelectTrigger,
} from "skytrack-ui/select";
import {
  Slider,
  SliderControl,
  SliderIndicator,
  SliderThumb,
  SliderTrack,
} from "skytrack-ui/slider";
import { Toolbar, ToolbarButton, ToolbarSeparator } from "skytrack-ui/toolbar";
import type { MissionSceneHandle } from "../scene/mission-scene";
import type { MissionBasemapStyle } from "../scene/basemaps";
import type { StudioMission } from "../../domain/mission-model";
import { SkyTooltip } from "../../shared/sky-tooltip";
import MapControlTooltip from "../../shared/map-control-tooltip";
import { BasemapPickerGrid } from "../design/design-controls";
import AddressSearchControls from "../search/address-search-controls";
import type { useAddressSearch } from "../search/use-address-search";

export interface DroneChoice {
  value: string;
  label: string;
}

interface MissionContextCardsProps {
  mission: StudioMission;
  droneChoices: DroneChoice[];
  selectedDroneValue: string;
  onSelectVehicle: (droneId: string, label: string) => void;
  onOpenWorldPicker: () => void;
}

export function MissionContextCards({
  mission,
  droneChoices,
  selectedDroneValue,
  onSelectVehicle,
  onOpenWorldPicker,
}: MissionContextCardsProps) {
  return (
    <div
      className=" absolute top-[0.5rem] left-[0.5rem] flex flex-row items-stretch gap-[0.5rem] w-max max-w-[min(40rem,calc(100%-1.5rem))] pointer-events-none [@media_(max-width:_61.25rem)]:top-[0.5rem] [@media_(max-width:_61.25rem)]:left-[0.5rem] [@media_(max-width:_61.25rem)]:gap-[0.375rem] [@media_(max-width:_61.25rem)]:max-w-[min(32.5rem,calc(100%-1rem))] [@media_(max-width:_61.25rem)]:flex-wrap"
      role="group"
      aria-label="Mission context"
    >
      <div
        className="ms-drone-card pointer-events-auto"
        data-testid="ms-drone-card"
      >
        <Select<string>
          items={droneChoices}
          value={selectedDroneValue}
          onValueChange={(value: unknown) => {
            const selected = droneChoices.find(
              (choice) => choice.value === String(value),
            );
            if (selected)
              onSelectVehicle(
                selected.value,
                selected.label.replace(/ \(legacy\)$/, ""),
              );
          }}
        >
          <SelectTrigger
            className="ms-drone-trigger"
            data-testid="ms-drone-select"
            aria-label={`Vehicle: ${mission.vehicle}`}
          >
            <span className="ms-drone-thumb" aria-hidden="true">
              <DroneIcon />
            </span>
            <span className="ms-drone-meta">
              <span className="ms-drone-name-row">
                <span className="ms-drone-name" title={mission.vehicle}>
                  {mission.vehicle}
                </span>
                <CaretDownIcon aria-hidden="true" className="ms-drone-caret" />
              </span>
              <span className="ms-drone-routes">All routes</span>
            </span>
          </SelectTrigger>
          <SelectPortal>
            <SelectPositioner side="bottom" align="start" sideOffset={4}>
              <SelectPopup>
                <SelectList>
                  {droneChoices.map((drone) => (
                    <SelectItem key={drone.value} value={drone.value}>
                      <SelectItemIndicator />
                      <SelectItemText>{drone.label}</SelectItemText>
                    </SelectItem>
                  ))}
                </SelectList>
              </SelectPopup>
            </SelectPositioner>
          </SelectPortal>
        </Select>
        <span
          className=" flex-[0_0_auto] self-stretch w-px m-[0.25rem_0.5rem] bg-(--border) [@media_(max-width:_61.25rem)]:m-[0.25rem_0.375rem]"
          aria-hidden="true"
          data-testid="ms-drone-divider"
        />
        <SkyTooltip>
          <button
            type="button"
            className="ms-drone-add flex-[0_0_auto] self-center inline-flex items-center justify-center w-[2rem] h-[2rem] p-0 [border:0] rounded-(--radius) bg-transparent text-(--muted-foreground) text-[1rem] cursor-not-allowed disabled:opacity-[0.55] [@media_(max-width:_61.25rem)]:w-[2rem] [@media_(max-width:_61.25rem)]:h-[2rem]"
            data-testid="ms-drone-add"
            disabled
            aria-label="Add drone"
            title="Add drone"
          >
            <PlusIcon aria-hidden="true" />
          </button>
        </SkyTooltip>
      </div>
      <div
        className="ms-drone-card  pointer-events-auto"
        data-testid="ms-drone-card"
      >
        <Button
          type="button"
          variant="ghost"
          className="ms-drone-trigger  self-stretch h-auto focus-visible:[outline:0.125rem_solid_var(--primary)] focus-visible:outline-offset-1"
          data-testid="ms-world-select"
          aria-label={`Choose world and mission type; current world ${mission.world}, ${mission.worldType ?? "3D"}`}
          onClick={onOpenWorldPicker}
        >
          <span className="ms-drone-thumb" aria-hidden="true">
            <MapTrifoldIcon />
          </span>
          <span className="ms-drone-meta justify-center">
            <span className="ms-drone-name-row">
              <span className="ms-drone-name" title={mission.world}>
                {mission.world}
              </span>
              <CaretDownIcon aria-hidden="true" className="ms-drone-caret" />
            </span>
            <span className="ms-drone-routes">{mission.worldType ?? "3D"}</span>
          </span>
        </Button>
      </div>
    </div>
  );
}

interface StudioMapControlsProps {
  worldType: StudioMission["worldType"];
  worldName: string;
  sceneRef: { current: MissionSceneHandle | null };
  addressSearch: ReturnType<typeof useAddressSearch>;
  onAnnounce: (message: string) => void;
  stageIsDesign: boolean;
  showPhotoMarkers: boolean;
  onShowPhotoMarkersChange: (show: boolean) => void;
  showCameraFootprint: boolean;
  onShowCameraFootprintChange: (show: boolean) => void;
  footprintOpacity: number;
  onFootprintOpacityChange: (opacity: number) => void;
  basemapStyle: MissionBasemapStyle;
  onBasemapStyleChange: (style: MissionBasemapStyle) => void;
}

export function StudioMapControls({
  worldType,
  worldName,
  sceneRef,
  addressSearch,
  onAnnounce,
  stageIsDesign,
  showPhotoMarkers,
  onShowPhotoMarkersChange,
  showCameraFootprint,
  onShowCameraFootprintChange,
  footprintOpacity,
  onFootprintOpacityChange,
  basemapStyle,
  onBasemapStyleChange,
}: StudioMapControlsProps) {
  return (
    <div
      className=" [.ms-scene-wrap.has-alt-ruler_&]:right-[2rem] absolute left-[0.75rem] right-[0.75rem] bottom-[0.75rem] z-5 pointer-events-none flex flex-col items-end gap-[0.625rem] *:pointer-events-auto"
      data-testid="ms-control-groups"
    >
      {worldType === "2D" ? (
        <AddressSearchControls
          controller={addressSearch}
          onAnnounce={onAnnounce}
        />
      ) : null}
      <Toolbar orientation="vertical" aria-label="Camera controls">
        <MapControlTooltip
          label="Zoom in"
          trigger={
            <ToolbarButton
              type="button"
              size="icon"
              aria-label="Zoom in"
              onClick={() => sceneRef.current?.zoomBy(1)}
            />
          }
        >
          <MagnifyingGlassPlusIcon aria-hidden="true" />
        </MapControlTooltip>
        <MapControlTooltip
          label="Zoom out"
          trigger={
            <ToolbarButton
              type="button"
              size="icon"
              aria-label="Zoom out"
              onClick={() => sceneRef.current?.zoomBy(-1)}
            />
          }
        >
          <MagnifyingGlassMinusIcon aria-hidden="true" />
        </MapControlTooltip>
        <MapControlTooltip
          label="Reset camera"
          trigger={
            <ToolbarButton
              type="button"
              size="icon"
              aria-label="Reset camera"
              onClick={() => sceneRef.current?.resetCamera()}
            />
          }
        >
          <CrosshairIcon aria-hidden="true" />
        </MapControlTooltip>
        <ToolbarSeparator className="mx-0" />
        <MapControlTooltip
          label="Top-down 2D view"
          trigger={
            <ToolbarButton
              type="button"
              size="icon"
              aria-label="Top-down 2D view"
              onClick={() => {
                sceneRef.current?.snapTopDown();
                onAnnounce("Top-down 2D view.");
              }}
            />
          }
        >
          <span
            className=" text-[0.75rem] font-bold tracking-[0.02em]"
            aria-hidden="true"
            data-testid="ms-2d-label"
          >
            2D
          </span>
        </MapControlTooltip>
      </Toolbar>
      {stageIsDesign ? (
        <Toolbar orientation="vertical" aria-label="Map settings">
          <Popover>
            <MapControlTooltip
              label="Map display settings"
              trigger={
                <PopoverTrigger
                  aria-label="Map display settings"
                  data-testid="ms-map-gear-trigger"
                  render={
                    <ToolbarButton type="button" size="icon">
                      <GearIcon aria-hidden="true" />
                    </ToolbarButton>
                  }
                />
              }
            />
            <PopoverPortal>
              <PopoverPositioner side="left" align="end" sideOffset={8}>
                <PopoverPopup
                  className=" w-[18.75rem] max-h-[min(80vh,35rem)] overflow-y-auto p-[0.875rem] [border:0.0625rem_solid_var(--border)] rounded-[calc(var(--radius)+0.25rem)] bg-(--card) text-(--foreground) w-[16rem]"
                  data-testid="ms-map-gear-popup"
                >
                  <PopoverArrow />
                  <div
                    className=" flex items-center justify-between pb-[0.5rem] mb-[0.25rem] [border-bottom:0.0625rem_solid_var(--border)]"
                    data-testid="ms-map-gear-head"
                  >
                    <PopoverTitle className="heading ms-basemap-title text-[1rem]">
                      Map display
                    </PopoverTitle>
                  </div>
                  <label className="ms-map-check-row">
                    <CheckboxRoot
                      checked={showPhotoMarkers}
                      onCheckedChange={(checked) =>
                        onShowPhotoMarkersChange(checked === true)
                      }
                      data-testid="ms-photo-markers-toggle"
                    >
                      <CheckboxIndicator aria-hidden="true">
                        ✓
                      </CheckboxIndicator>
                    </CheckboxRoot>
                    <span>Photo capture markers</span>
                  </label>
                  <label className="ms-map-check-row">
                    <CheckboxRoot
                      checked={showCameraFootprint}
                      onCheckedChange={(checked) =>
                        onShowCameraFootprintChange(checked === true)
                      }
                      data-testid="ms-camera-footprint-toggle"
                    >
                      <CheckboxIndicator aria-hidden="true">
                        ✓
                      </CheckboxIndicator>
                    </CheckboxRoot>
                    <span>Camera capture footprint</span>
                  </label>
                  {showCameraFootprint ? (
                    <div
                      className="ms-footprint-opacity m-[0.125rem_0_0_1.6875rem] p-[0_0.125rem_0.3125rem]"
                      data-testid="ms-footprint-opacity"
                    >
                      <div
                        className=" flex items-center justify-between mb-[0.375rem] text-(--muted-foreground) text-[0.75rem] font-semibold"
                        data-testid="ms-footprint-opacity-head"
                      >
                        <span>Footprint opacity</span>
                        <strong className="text-(--foreground) font-semibold">
                          {footprintOpacity}%
                        </strong>
                      </div>
                      <Slider
                        className="w-full"
                        value={footprintOpacity}
                        min={10}
                        max={80}
                        step={1}
                        onValueChange={(value: number | readonly number[]) => {
                          const next = Array.isArray(value) ? value[0] : value;
                          if (typeof next === "number" && Number.isFinite(next))
                            onFootprintOpacityChange(next);
                        }}
                      >
                        <SliderControl>
                          <SliderTrack>
                            <SliderIndicator />
                            <SliderThumb aria-label="Camera footprint opacity" />
                          </SliderTrack>
                        </SliderControl>
                      </Slider>
                    </div>
                  ) : null}
                </PopoverPopup>
              </PopoverPositioner>
            </PopoverPortal>
          </Popover>
          {worldType === "2D" || worldName !== "Blank space" ? (
            <Popover>
              <MapControlTooltip
                label="Basemap settings"
                trigger={
                  <PopoverTrigger
                    aria-label="Basemap settings"
                    data-testid="ms-basemap-trigger"
                    render={
                      <ToolbarButton type="button" size="icon">
                        <StackIcon aria-hidden="true" />
                      </ToolbarButton>
                    }
                  />
                }
              />
              <PopoverPortal>
                <PopoverPositioner side="left" align="end" sideOffset={8}>
                  <PopoverPopup
                    className="ms-basemap-popup w-[18.75rem] max-h-[min(80vh,35rem)] overflow-y-auto p-[0.875rem] [border:0.0625rem_solid_var(--border)] rounded-[calc(var(--radius)+0.25rem)] bg-(--card) text-(--foreground)"
                    data-testid="ms-basemap-popup"
                  >
                    <PopoverArrow />
                    <div
                      className=" flex items-center justify-between pb-[0.5rem] [border-bottom:0.0625rem_solid_var(--border)]"
                      data-testid="ms-basemap-heading"
                    >
                      <PopoverTitle className="heading ms-basemap-title">
                        Basemap
                      </PopoverTitle>
                      <SkyTooltip>
                        <PopoverClose
                          aria-label="Close basemap settings"
                          title="Close"
                          className=" inline-flex items-center justify-center w-[1.75rem] h-[1.75rem] [border:0] rounded-(--radius) bg-transparent text-(--muted-foreground) text-[1.3125rem] cursor-pointer"
                        >
                          ×
                        </PopoverClose>
                      </SkyTooltip>
                    </div>
                    <BasemapPickerGrid
                      value={basemapStyle}
                      onChange={onBasemapStyleChange}
                      testidPrefix="ms-basemap"
                    />
                  </PopoverPopup>
                </PopoverPositioner>
              </PopoverPortal>
            </Popover>
          ) : null}
        </Toolbar>
      ) : null}
    </div>
  );
}
