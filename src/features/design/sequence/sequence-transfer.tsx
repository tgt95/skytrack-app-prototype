import { Badge } from "skytrack-ui/badge";
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
import type { DerivedTransfer } from "../../../domain/transfer-planner";
import type { StudioMission } from "../../../domain/mission-model";
import { SEQUENCE_LIST_ITEM_CLASS } from "./sequence-drag";

export function TransferRow({
  transfer,
  as = "div",
}: {
  transfer?: DerivedTransfer;
  as?: "div" | "li";
}) {
  if (!transfer) return null;
  const Tag = as;
  return (
    <Tag
      className={`flex flex-wrap items-center gap-2 min-w-0 border-dashed bg-[color-mix(in_srgb,var(--primary)_6%,var(--background))] py-1.5 px-3 flex-nowrap ${as === "li" ? `${SEQUENCE_LIST_ITEM_CLASS} border-b border-border last:border-b-0` : "rounded-(--radius)"}`}
      role="note"
      data-testid={`ms-trans-${transfer.id}`}
      aria-label={`Generated transfer from ${transfer.fromLabel} to ${transfer.toLabel}, ${transfer.distanceM.toFixed(1)} meters`}
    >
      <Badge
        count="TRANS"
        status="outline"
      />
      <span className="flex-[1_1_auto] min-w-0 text-sm text-(--muted-foreground)">
        Go to the next {transfer.toType}
      </span>
      <span
        className="flex-[0_0_auto] text-[0.6875rem] text-(--muted-foreground) [font-variant-numeric:tabular-nums]"
        data-testid="ms-seq-dist"
      >
        {transfer.distanceM.toFixed(1)} m{transfer.hasDetour ? " · detour" : ""}
      </span>
      {transfer.errorMessage ? (
        <span className="m-0 text-xs leading-[1.5] border border-(--border) rounded-(--radius) py-1.5 px-2 bg-(--card) text-(--muted-foreground)">
          {transfer.errorMessage}
        </span>
      ) : null}
    </Tag>
  );
}

export function EndMissionControl({
  mission,
  onUpdateMission,
  as = "div",
}: {
  mission: StudioMission;
  onUpdateMission: (next: StudioMission, label?: string) => void;
  as?: "div" | "li";
}) {
  const Tag = as;
  return (
    <Tag
      className={`flex flex-row items-center gap-2 min-w-0 py-1.5 px-3 flex-nowrap bg-(--accent) ${as === "li" ? SEQUENCE_LIST_ITEM_CLASS : "rounded-(--radius)"}`}
    >
      <Badge
        count="END"
        status="outline"
      />
      <Select<string>
        items={[
          { value: "home", label: "Drone - Return to home" },
          { value: "stay", label: "Stay at last waypoint" },
        ]}
        value={mission.returnHomeOnEnd ? "home" : "stay"}
        onValueChange={(value: unknown) => {
          const home = String(value) !== "stay";
          if (home === mission.returnHomeOnEnd) return;
          onUpdateMission(
            { ...mission, returnHomeOnEnd: home },
            home
              ? "Drone returns home on end."
              : "Drone stays at last waypoint on end.",
          );
        }}
      >
        <SelectTrigger
          aria-label="End of mission behavior"
          data-testid="ms-end-select"
          className="flex-[1_1_auto] min-w-0 text-xs"
        >
          <SelectValue />
          <SelectIcon />
        </SelectTrigger>
        <SelectPortal>
          <SelectPositioner side="bottom" align="end" sideOffset={4}>
            <SelectPopup>
              <SelectList>
                <SelectItem value="home">
                  <SelectItemIndicator />
                  <SelectItemText>Drone - Return to home</SelectItemText>
                </SelectItem>
                <SelectItem value="stay">
                  <SelectItemIndicator />
                  <SelectItemText>Stay at last waypoint</SelectItemText>
                </SelectItem>
              </SelectList>
            </SelectPopup>
          </SelectPositioner>
        </SelectPortal>
      </Select>
    </Tag>
  );
}
