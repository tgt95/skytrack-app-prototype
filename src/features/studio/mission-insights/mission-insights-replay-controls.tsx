import { CheckIcon, PauseIcon, PlayIcon } from "@phosphor-icons/react";
import { Button } from "skytrack-ui/button";
import { CheckboxIndicator, CheckboxRoot } from "skytrack-ui/checkbox";
import { FieldLabel, FieldRoot } from "skytrack-ui/field";
import {
  Select,
  SelectIcon,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
  SelectLabel,
  SelectList,
  SelectPopup,
  SelectPortal,
  SelectPositioner,
  SelectTrigger,
  SelectValue,
} from "skytrack-ui/select";
import {
  Slider,
  SliderControl,
  SliderIndicator,
  SliderThumb,
  SliderTrack,
} from "skytrack-ui/slider";
import { Toggle } from "skytrack-ui/toggle";
import { ToggleGroup } from "skytrack-ui/toggle-group";
import type {
  ReplayCamera,
  ReplayLayers,
} from "./mission-insights-flight-scene";

const speedOptions = [
  { value: "0.5", label: "0.5×" },
  { value: "1", label: "1×" },
  { value: "2", label: "2×" },
  { value: "4", label: "4×" },
  { value: "8", label: "8×" },
] as const;

function formatClock(seconds: number) {
  return `${seconds.toFixed(1)} s`;
}

function CheckboxField({
  id,
  label,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <FieldRoot className="flex-row items-center gap-2">
      <FieldLabel className="flex items-center gap-2">
        <CheckboxRoot
          id={id}
          checked={checked}
          onCheckedChange={(value) => onCheckedChange(value === true)}
        >
          <CheckboxIndicator>
            <CheckIcon aria-hidden="true" />
          </CheckboxIndicator>
        </CheckboxRoot>
        {label}
      </FieldLabel>
    </FieldRoot>
  );
}

export function MissionInsightsReplayControls({
  time,
  maxTime,
  speed,
  onSpeedChange,
  playing,
  onPlayingChange,
  cameraMode,
  onCameraModeChange,
  layers,
  onLayerChange,
  onSeek,
}: {
  time: number;
  maxTime: number;
  speed: string;
  onSpeedChange: (speed: string) => void;
  playing: boolean;
  onPlayingChange: (playing: boolean) => void;
  cameraMode: ReplayCamera;
  onCameraModeChange: (camera: ReplayCamera) => void;
  layers: ReplayLayers;
  onLayerChange: (key: keyof ReplayLayers, value: boolean) => void;
  onSeek: (time: number) => void;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-4 rounded-(--radius) border border-border bg-(--card) p-4">
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        <Button
          variant="outline"
          onClick={() => onPlayingChange(!playing)}
          aria-pressed={playing}
        >
          {playing ? (
            <PauseIcon aria-hidden="true" />
          ) : (
            <PlayIcon aria-hidden="true" />
          )}
          {playing ? "Pause" : "Play"}
        </Button>
        <FieldRoot className="flex-row items-center gap-2">
          <Select
            value={speed}
            onValueChange={(value) => {
              if (typeof value === "string") onSpeedChange(value);
            }}
            items={speedOptions}
          >
            <SelectLabel>Playback speed</SelectLabel>
            <SelectTrigger className="w-24" aria-label="Playback speed">
              <SelectValue>
                {speedOptions.find((option) => option.value === speed)?.label ??
                  "1×"}
              </SelectValue>
              <SelectIcon />
            </SelectTrigger>
            <SelectPortal>
              <SelectPositioner side="bottom" align="start" sideOffset={4}>
                <SelectPopup>
                  <SelectList>
                    {speedOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <SelectItemIndicator />
                        <SelectItemText>{option.label}</SelectItemText>
                      </SelectItem>
                    ))}
                  </SelectList>
                </SelectPopup>
              </SelectPositioner>
            </SelectPortal>
          </Select>
        </FieldRoot>
        <span className="ml-auto tabular-nums">
          {formatClock(time)} / {formatClock(maxTime)}
        </span>
      </div>
      <Slider
        value={time}
        min={0}
        max={maxTime}
        step={0.1}
        onValueChange={(value) =>
          onSeek(typeof value === "number" ? value : (value[0] ?? 0))
        }
      >
        <SliderControl>
          <SliderTrack>
            <SliderIndicator />
            <SliderThumb aria-label="Replay time" />
          </SliderTrack>
        </SliderControl>
      </Slider>
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <FieldRoot className="flex-row items-center gap-2">
          <FieldLabel id="ms-replay-camera-label">Camera</FieldLabel>
          <ToggleGroup
            value={[cameraMode]}
            onValueChange={(value: string[]) => {
              const next = value[0] as ReplayCamera | undefined;
              if (next) onCameraModeChange(next);
            }}
            variant="outline"
            size="sm"
            aria-label="Replay camera"
            aria-labelledby="ms-replay-camera-label"
          >
            <Toggle value="3d">3D</Toggle>
            <Toggle value="top">Top</Toggle>
            <Toggle value="side">Side</Toggle>
            <Toggle value="chase">Chase</Toggle>
          </ToggleGroup>
        </FieldRoot>
        <div className="flex min-w-0 flex-wrap gap-x-4 gap-y-2">
          <CheckboxField
            id="ms-follow-drone"
            label="Follow drone"
            checked={layers.follow}
            onCheckedChange={(value) => onLayerChange("follow", value)}
          />
          <CheckboxField
            id="ms-future-depth"
            label="Show future depth frames"
            checked={layers.future}
            onCheckedChange={(value) => onLayerChange("future", value)}
          />
          <CheckboxField
            id="ms-ground-depth"
            label="Include near-ground frames"
            checked={layers.nearGround}
            onCheckedChange={(value) => onLayerChange("nearGround", value)}
          />
          <CheckboxField
            id="ms-mixed-depth"
            label="Include mixed-range frames"
            checked={layers.mixedRange}
            onCheckedChange={(value) => onLayerChange("mixedRange", value)}
          />
          <CheckboxField
            id="ms-empty-later"
            label="Show “seen empty later”"
            checked={layers.seenEmptyLater}
            onCheckedChange={(value) => onLayerChange("seenEmptyLater", value)}
          />
        </div>
      </div>
    </div>
  );
}
