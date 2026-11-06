import { DotsThreeIcon } from "@phosphor-icons/react";
import { Badge } from "skytrack-ui/badge";
import { Button } from "skytrack-ui/button";
import {
  Menu,
  MenuItem,
  MenuPopup,
  MenuPortal,
  MenuPositioner,
  MenuSeparator,
  MenuTrigger,
} from "skytrack-ui/menu";
import { Toggle } from "skytrack-ui/toggle";
import { ToggleGroup } from "skytrack-ui/toggle-group";
import { SkyTooltip } from "@/ui/components/sky-tooltip";
import { AvoidZoneIcon } from "@/ui/components/icons";
import type { AvoidZone } from "@/domain/mission-model";
import {
  distanceFromDisplay,
  distanceToDisplay,
  distanceUnit,
  formatDistance,
  useMeasurementSystem,
} from "@/shared/measurement-units";
import SliderField from "@/features/design/controls/slider-field";

export interface AvoidInspectorCardProps {
  zone: AvoidZone;
  draft: AvoidZone;
  editing: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onPreviewDraft: (nextDraft: AvoidZone) => void;
  onCancelEdit: () => void;
  onCommitEdit: (draft: AvoidZone) => void;
}

export default function AvoidInspectorCard({
  zone,
  draft,
  editing,
  onEdit,
  onDelete,
  onPreviewDraft,
  onCancelEdit,
  onCommitEdit,
}: AvoidInspectorCardProps) {
  const unitSystem = useMeasurementSystem();
  return (
    <section
      className={`ms-card border border-border rounded-(--radius) bg-(--background) gap-3 ms-object-block p-0 [&.is-editing]:border-(--primary) ${editing ? " is-editing" : ""}`}
      aria-label={zone.label}
    >
      <div className="ms-route-head flex flex-col gap-1 flex-row! items-center min-w-0 p-3 max-sm:flex-wrap">
        <div className="ms-route-title-group flex items-center gap-1.5 flex-[0_0_auto] min-w-0 whitespace-nowrap">
          <AvoidZoneIcon aria-hidden="true" className="ms-route-icon w-4 h-4 text-foreground shrink-0" />
          <span className="ms-route-name text-sm font-semibold flex-[0_0_auto] min-w-0 whitespace-nowrap">
            {zone.label}
          </span>
        </div>
        <span className="ms-route-stats text-xs text-(--muted-foreground) block flex-[1_1_0] ml-auto min-w-0 overflow-hidden text-right text-ellipsis whitespace-nowrap max-sm:ml-0 max-sm:text-left">
          <Badge className="rounded-(--radius)"
            count={zone.type === "privacy" ? "People / Privacy" : "Obstacle"}
            status="secondary"
            size="sm"
          />
        </span>
        <div className="ms-route-actions flex items-center gap-0 ml-auto shrink-0">
          <Menu>
            <SkyTooltip>
              <MenuTrigger
                aria-label={`More options for ${zone.label}`}
                className="border-0 bg-transparent p-0"
                render={<Button variant="ghost" size="icon-sm" />}
              >
                <DotsThreeIcon aria-hidden="true" />
              </MenuTrigger>
            </SkyTooltip>
            <MenuPortal>
              <MenuPositioner side="bottom" align="end" sideOffset={4}>
                <MenuPopup>
                  <MenuItem onClick={onEdit}>Edit zone</MenuItem>
                  <MenuSeparator />
                  <MenuItem onClick={onDelete}>Delete zone</MenuItem>
                </MenuPopup>
              </MenuPositioner>
            </MenuPortal>
          </Menu>
        </div>
      </div>
      {editing ? (
        <form
          className="ms-zone-settings flex flex-col gap-2 p-3 border-t border-t-border"
          aria-label={`${zone.label} settings`}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              onCancelEdit();
            } else if (event.key === "Enter") {
              event.stopPropagation();
              if (
                event.target instanceof HTMLElement &&
                event.target.getAttribute("role") === "slider"
              ) {
                event.preventDefault();
                event.currentTarget.requestSubmit();
              }
            }
          }}
          onSubmit={(event) => {
            event.preventDefault();
            onCommitEdit(draft);
          }}
        >
          <p className="ms-hint m-0 text-xs text-(--muted-foreground) leading-[1.5] p-3">
            Choose whether this is a static physical obstacle or a
            people/privacy exclusion zone.
          </p>
          <ToggleGroup
            value={[draft.type ?? "obstacle"]}
            variant="segmented"
            size="xs"
            aria-label={`${zone.label} type`}
            className="ms-avoid-type-toggle mb-2.5"
            onValueChange={(values) => {
              const value = values[0];
              if (value === "obstacle" || value === "privacy")
                onPreviewDraft({ ...draft, type: value });
            }}
          >
            <Toggle value="obstacle">Obstacle</Toggle>
            <Toggle value="privacy">People / Privacy</Toggle>
          </ToggleGroup>
          <SliderField
            label={`Zone height (${distanceUnit(unitSystem)})`}
            value={distanceToDisplay(draft.heightM ?? 15, unitSystem)}
            min={distanceToDisplay(1, unitSystem)}
            max={distanceToDisplay(150, unitSystem)}
            step={unitSystem === "imperial" ? 1 : 0.5}
            unit={distanceUnit(unitSystem)}
            onChange={(value) =>
              onPreviewDraft({
                ...draft,
                heightM: Math.max(1, distanceFromDisplay(value, unitSystem)),
              })
            }
          />
          <SliderField
            label={`Flight clearance (${distanceUnit(unitSystem)})`}
            value={distanceToDisplay(draft.clearanceM ?? 2, unitSystem)}
            min={distanceToDisplay(0, unitSystem)}
            max={distanceToDisplay(50, unitSystem)}
            step={unitSystem === "imperial" ? 1 : 0.5}
            unit={distanceUnit(unitSystem)}
            onChange={(value) =>
              onPreviewDraft({
                ...draft,
                clearanceM: Math.max(0, distanceFromDisplay(value, unitSystem)),
              })
            }
          />
          <div className="ms-btnrow flex justify-end flex-row gap-1.5">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onCancelEdit}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" variant="default">
              Submit zone
            </Button>
          </div>
        </form>
      ) : (
        <p className="ms-hint m-0 text-xs text-(--muted-foreground) leading-[1.5] p-3">
          Height {formatDistance(zone.heightM ?? 15, unitSystem)} · Clearance{" "}
          {formatDistance(zone.clearanceM ?? 2, unitSystem)}
        </p>
      )}
    </section>
  );
}
