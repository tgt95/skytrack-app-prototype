import { Button } from "skytrack-ui/button";
import {
  Slider,
  SliderControl,
  SliderIndicator,
  SliderThumb,
  SliderTrack,
} from "skytrack-ui/slider";
import { Switch, SwitchThumb } from "skytrack-ui/switch";
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

/* Playback speeds keep the existing time math (seconds per tick scale). */
const SPEED_OPTIONS = [
  { value: "0.5", label: "0.5×" },
  { value: "1", label: "1×" },
  { value: "2", label: "2×" },
  { value: "4", label: "4×" },
  { value: "16", label: "16×" },
];

export interface MissionPreviewControlsProps {
  showPhotoScanDemo: boolean;
  onPhotoScanDemoChange: (checked: boolean) => void;
  playing: boolean;
  onPlayToggle: () => void;
  scrub: number;
  duration: number;
  speed: number;
  onScrubChange: (next: number | readonly number[]) => void;
  onSpeedChange: (speed: number) => void;
  formattedTime: string;
  formattedDuration: string;
}

export default function MissionPreviewControls({
  showPhotoScanDemo,
  onPhotoScanDemoChange,
  playing,
  onPlayToggle,
  scrub,
  duration,
  speed,
  onScrubChange,
  onSpeedChange,
  formattedTime,
  formattedDuration,
}: MissionPreviewControlsProps) {
  return (
    <>
      <label className="flex items-center gap-2 text-sm">
        <Switch
          checked={showPhotoScanDemo}
          size="sm"
          data-testid="ms-preview-photo-demo-toggle"
          aria-label="Show photo scan demonstration"
          onCheckedChange={(checked: boolean) => onPhotoScanDemoChange(checked)}
        >
          <SwitchThumb />
        </Switch>
        Show photo scan demonstration
      </label>

      <div
        className=" flex items-center gap-[1rem] flex-wrap"
        role="region"
        aria-label="Route playback"
      >
        <Button
          type="button"
          variant="outline"
          aria-pressed={playing}
          onClick={onPlayToggle}
          disabled={duration <= 0}
          aria-label={playing ? "Pause flight preview" : "Play flight preview"}
          data-testid="ms-preview-play"
        >
          {playing ? "Pause" : "Play"}
        </Button>
        <div
          className=" flex-[1_1_auto] min-w-0"
          data-testid="ms-preview-scrub"
        >
          <Slider
            value={scrub}
            min={0}
            max={1000}
            step={1}
            onValueChange={onScrubChange}
          >
            <SliderControl>
              <SliderTrack>
                <SliderIndicator />
                <SliderThumb aria-label="Preview playback position" />
              </SliderTrack>
            </SliderControl>
          </Slider>
        </div>
        <div
          className=" flex-[0_0_auto] min-h-[2.125rem] [border:0.0625rem_solid_var(--border)] rounded-[0.375rem] bg-(--background) text-(--foreground)"
          data-testid="ms-preview-speed"
        >
          <Select<string>
            items={SPEED_OPTIONS}
            value={String(speed)}
            onValueChange={(next: unknown) => {
              const parsed = Number(next);
              if (
                SPEED_OPTIONS.some((option) => option.value === String(next)) &&
                Number.isFinite(parsed)
              )
                onSpeedChange(parsed);
            }}
          >
            <SelectTrigger
              aria-label="Preview playback speed"
              className=" min-w-[4.75rem]"
            >
              <SelectValue />
              <SelectIcon />
            </SelectTrigger>
            <SelectPortal>
              <SelectPositioner side="bottom" align="end" sideOffset={4}>
                <SelectPopup>
                  <SelectList>
                    {SPEED_OPTIONS.map((option) => (
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
        </div>
        <span
          className="ms-preview-time flex-[0_0_auto] text-[0.75rem] text-(--muted-foreground) [font-variant-numeric:tabular-nums] whitespace-nowrap"
          data-testid="ms-preview-time"
        >
          {formattedTime} / {formattedDuration}
        </span>
      </div>
    </>
  );
}
