/* Area camera waypoint accordion: read-only generated photo rows with a
   per-action pitch override. The parent keeps the Area card header, scan
   settings form, and transfer/END blocks. */

import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "skytrack-ui/accordion";
import { NumberField, NumberFieldInput } from "skytrack-ui/number-field";
import type { StudioMission } from "../../../domain/mission-model";
import { SequenceActionBadge } from "./sequence-action-controls";
import { SEQUENCE_LIST_ITEM_CLASS } from "./sequence-drag";

type Waypoint = StudioMission["waypoints"][number];

export function AreaCameraWaypoints({
  areaLabel,
  waypoints,
  defaultGimbalPitchDeg,
  onSetPitch,
}: {
  areaLabel: string;
  waypoints: Waypoint[];
  defaultGimbalPitchDeg: number;
  onSetPitch: (wpId: string, actionId: string, pitch: number) => void;
}) {
  const photoCount = waypoints.reduce(
    (count, waypoint) =>
      count +
      waypoint.actions.filter((action) => action.kind === "photo").length,
    0,
  );

  return (
    <Accordion
      multiple
      className=" border-t border-t-border pt-0 px-2.5 pb-1.5"
      aria-label={`${areaLabel} waypoint camera settings`}
    >
      <AccordionItem value="camera-settings" className="border-b-0">
        <AccordionHeader>
          <AccordionTrigger className="min-h-[34px] gap-2 rounded-none py-1 text-left text-[11px] font-semibold text-muted-foreground hover:no-underline [&>svg]:size-3">
            Camera settings by waypoint ({photoCount})
          </AccordionTrigger>
        </AccordionHeader>
        <AccordionPanel>
          <ol
            className="list-none m-0 p-0 flex flex-col gap-0 max-h-75 overflow-auto border-t border-t-border"
            data-testid="ms-area-capture-rows"
          >
            {waypoints.flatMap((waypoint) =>
              waypoint.actions
                .filter((action) => action.kind === "photo")
                .map((action) => (
                  <li
                    className={`${SEQUENCE_LIST_ITEM_CLASS} flex items-center gap-2 pt-1.25 pr-1 pb-1.25 pl-1 min-h-10 bg-(--card) text-xs [list-style:none] border-b border-border last:border-b-0`}
                    key={action.id}
                    data-testid={`ms-area-capture-${waypoint.id}-${action.id}`}
                  >
                    <span
                      className="flex-[0_0_auto] min-w-7.5 py-0 px-1 inline-flex items-center justify-center text-xs font-semibold rounded-(--radius) bg-[oklch(from_var(--accent)_calc(l/1.02)_c_h)] text-(--muted-foreground) cursor-default focus-visible:outline-2 focus-visible:outline-(--primary) focus-visible:outline-offset-1"
                      aria-label={`Waypoint ${waypoint.seq}`}
                    >
                      {waypoint.seq}
                    </span>
                    <SequenceActionBadge kind="photo" />
                    <span className="flex-[1_1_auto] text-(--foreground) font-medium">
                      Photo capture
                    </span>
                    <label className="flex items-center gap-1 whitespace-nowrap">
                      <span className="text-(--muted-foreground)">Pitch</span>
                      <NumberField
                        value={
                          action.gimbalPitchDeg ?? defaultGimbalPitchDeg
                        }
                        min={-90}
                        max={0}
                        step={1}
                        onValueChange={(value) => {
                          if (typeof value === "number" && Number.isFinite(value))
                            onSetPitch(waypoint.id, action.id, value);
                        }}
                      >
                        <NumberFieldInput
                          className="text-right"
                          aria-label={`Pitch at waypoint ${waypoint.seq}`}
                        />
                      </NumberField>
                      <span>°</span>
                    </label>
                  </li>
                )),
            )}
          </ol>
        </AccordionPanel>
      </AccordionItem>
    </Accordion>
  );
}
