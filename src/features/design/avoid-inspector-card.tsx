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
import { SkyTooltip } from "../../ui/components/sky-tooltip";
import { AvoidZoneIcon } from "../../ui/components/icons";
import type { AvoidZone } from "../../domain/mission-model";
import SliderField from "./slider-field";

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
  return (
    <section
      className={`ms-card ms-object-block${editing ? " is-editing" : ""}`}
      aria-label={zone.label}
    >
      <div className="ms-route-head flex-row! items-center gap-[0.5rem] min-w-0 p-[0.75rem] [@media_(max-width:_40rem)]:flex-wrap">
        <div className="ms-route-title-group">
          <AvoidZoneIcon aria-hidden="true" className="ms-route-icon" />
          <span className="ms-route-name flex-[0_0_auto] min-w-0 whitespace-nowrap">
            {zone.label}
          </span>
        </div>
        <span className="ms-route-stats block flex-[1_1_0] ml-auto min-w-0 overflow-hidden text-right text-ellipsis whitespace-nowrap [@media_(max-width:_40rem)]:ml-0 [@media_(max-width:_40rem)]:text-left">
          <Badge
            count={zone.type === "privacy" ? "People / Privacy" : "Obstacle"}
            status="secondary"
            size="sm"
          />
        </span>
        <div className="ms-route-actions">
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
          className="ms-zone-settings"
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
          <p className="ms-hint p-[0.75rem]">
            Choose whether this is a static physical obstacle or a
            people/privacy exclusion zone.
          </p>
          <ToggleGroup
            value={[draft.type ?? "obstacle"]}
            variant="segmented"
            size="xs"
            aria-label={`${zone.label} type`}
            className="ms-avoid-type-toggle"
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
            label="Zone height (m)"
            value={draft.heightM ?? 15}
            min={1}
            max={150}
            step={0.5}
            unit="m"
            onChange={(value) =>
              onPreviewDraft({ ...draft, heightM: Math.max(1, value) })
            }
          />
          <SliderField
            label="Flight clearance (m)"
            value={draft.clearanceM ?? 2}
            min={0}
            max={50}
            step={0.5}
            unit="m"
            onChange={(value) =>
              onPreviewDraft({ ...draft, clearanceM: Math.max(0, value) })
            }
          />
          <div className="ms-btnrow">
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
        <p className="ms-hint p-[0.75rem]">
          Height {(zone.heightM ?? 15).toFixed(1)} m · Clearance{" "}
          {(zone.clearanceM ?? 2).toFixed(1)} m
        </p>
      )}
    </section>
  );
}
