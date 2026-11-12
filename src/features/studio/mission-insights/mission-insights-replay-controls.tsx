import {
  CheckIcon,
  ArrowsInSimpleIcon,
  ArrowsOutSimpleIcon,
  FastForwardIcon,
  GearIcon,
  PauseIcon,
  PlayIcon,
  RewindIcon,
} from "@phosphor-icons/react";
import { Button } from "skytrack-ui/button";
import {
  Menu,
  MenuCheckboxItem,
  MenuCheckboxItemIndicator,
  MenuGroup,
  MenuGroupLabel,
  MenuPortal,
  MenuPositioner,
  MenuPopup,
  MenuRadioGroup,
  MenuRadioItem,
  MenuRadioItemIndicator,
  MenuSeparator,
  MenuTrigger,
} from "skytrack-ui/menu";
import {
  Select,
  SelectIcon,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
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

const cameraOptions: ReadonlyArray<readonly [ReplayCamera, string]> = [
  ["3d", "3D"],
  ["top", "Top"],
  ["side", "Side"],
  ["chase", "Chase"],
];

const layerOptions: ReadonlyArray<readonly [keyof ReplayLayers, string]> = [
  ["follow", "Follow drone"],
  ["future", "Show future depth frames"],
  ["nearGround", "Include near-ground frames"],
  ["mixedRange", "Include mixed-range frames"],
  ["seenEmptyLater", "Show “seen empty later”"],
];

function formatClock(seconds: number) {
  const totalSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(totalSeconds / 60);
  return `${minutes}:${String(totalSeconds % 60).padStart(2, "0")}`;
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
  onFullscreenToggle,
  fullscreen,
  className = "",
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
  onFullscreenToggle: () => void;
  fullscreen: boolean;
  className?: string;
}) {
  return (
    <div
      className={`min-w-0 bg-muted/25 rounded-bl-(--radius) rounded-br-(--radius) border border-border border-t-0 bg-card p-3 text-card-foreground xl:rounded-br-none ${className}`}
    >
      <Slider
        value={time}
        min={0}
        max={maxTime}
        step={0.1}
        onValueChange={(value) =>
          onSeek(typeof value === "number" ? value : (value[0] ?? 0))
        }
        aria-label="Replay timeline"
      >
        <SliderControl className="p-2">
          <SliderTrack>
            <SliderIndicator />
            <SliderThumb aria-label="Replay time" />
          </SliderTrack>
        </SliderControl>
      </Slider>

      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-1 sm:gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-card-foreground hover:bg-muted hover:text-card-foreground"
            onClick={() => {
              if (playing) {
                onPlayingChange(false);
                return;
              }
              if (time >= maxTime) onSeek(0);
              onPlayingChange(true);
            }}
            aria-label={playing ? "Pause replay" : "Play replay"}
            aria-pressed={playing}
          >
            {playing ? (
              <PauseIcon aria-hidden="true" />
            ) : (
              <PlayIcon aria-hidden="true" />
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-card-foreground hover:bg-muted hover:text-card-foreground"
            onClick={() => onSeek(Math.max(0, time - 10))}
            aria-label="Back 10 seconds"
            title="Back 10 seconds"
          >
            <RewindIcon aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-card-foreground hover:bg-muted hover:text-card-foreground"
            onClick={() => onSeek(Math.min(maxTime, time + 10))}
            aria-label="Forward 10 seconds"
            title="Forward 10 seconds"
          >
            <FastForwardIcon aria-hidden="true" />
          </Button>
          <span className="ml-1 whitespace-nowrap text-sm tabular-nums sm:ml-2">
            {formatClock(time)} / {formatClock(maxTime)}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <Select
            value={speed}
            onValueChange={(value) => {
              if (typeof value === "string") onSpeedChange(value);
            }}
            items={speedOptions}
          >
            <SelectTrigger
              className="h-8 min-w-0 border-0 bg-transparent px-1 text-card-foreground shadow-none hover:bg-muted"
              aria-label="Playback speed"
            >
              <SelectValue>
                {speedOptions.find((option) => option.value === speed)?.label ??
                  "1×"}
              </SelectValue>
              <SelectIcon className="text-muted-foreground" />
            </SelectTrigger>
            <SelectPortal>
              <SelectPositioner side="top" align="end" sideOffset={8}>
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

          <Menu>
            <MenuTrigger
              type="button"
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-(--radius) bg-transparent p-0 text-card-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              aria-label="Replay settings"
              title="Replay settings"
            >
              <GearIcon aria-hidden="true" className="size-4" />
            </MenuTrigger>
            <MenuPortal>
              <MenuPositioner side="top" align="end" sideOffset={8}>
                <MenuPopup aria-label="Replay settings" className="w-64">
                  <MenuRadioGroup
                    value={cameraMode}
                    onValueChange={(value) => {
                      if (value) onCameraModeChange(value as ReplayCamera);
                    }}
                  >
                    <MenuGroupLabel>Camera</MenuGroupLabel>
                    {cameraOptions.map(([value, label]) => (
                      <MenuRadioItem
                        key={value}
                        value={value}
                        inset
                        className="!pl-8"
                      >
                        <MenuRadioItemIndicator>
                          <CheckIcon
                            aria-hidden="true"
                            weight="bold"
                            className="size-3.5"
                          />
                        </MenuRadioItemIndicator>
                        {label}
                      </MenuRadioItem>
                    ))}
                  </MenuRadioGroup>
                  <MenuSeparator />
                  <MenuGroup>
                    <MenuGroupLabel>Layers</MenuGroupLabel>
                    {layerOptions.map(([key, label]) => (
                      <MenuCheckboxItem
                        key={key}
                        checked={layers[key]}
                        className="!pl-8"
                        onCheckedChange={(checked) =>
                          onLayerChange(key, checked)
                        }
                        inset
                      >
                        <MenuCheckboxItemIndicator />
                        {label}
                      </MenuCheckboxItem>
                    ))}
                  </MenuGroup>
                </MenuPopup>
              </MenuPositioner>
            </MenuPortal>
          </Menu>

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-card-foreground hover:bg-muted hover:text-card-foreground"
            onClick={onFullscreenToggle}
            aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {fullscreen ? (
              <ArrowsInSimpleIcon aria-hidden="true" />
            ) : (
              <ArrowsOutSimpleIcon aria-hidden="true" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
