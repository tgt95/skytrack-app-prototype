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
import type { StudioMission } from "../../domain/mission-model";
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
            className=" ms-seq-list max-h-75 overflow-auto border-t border-t-border"
            data-testid="ms-area-capture-rows"
          >
            {waypoints.flatMap((waypoint) =>
              waypoint.actions
                .filter((action) => action.kind === "photo")
                .map((action) => (
                  <li
                    className={`ms-seq-action-row ${SEQUENCE_LIST_ITEM_CLASS} min-h-10 [.ms-seq-action-row&]:pr-1`}
                    key={action.id}
                    data-testid={`ms-area-capture-${waypoint.id}-${action.id}`}
                  >
                    <span
                      className="ms-seq-badge"
                      aria-label={`Waypoint ${waypoint.seq}`}
                    >
                      {waypoint.seq}
                    </span>
                    <SequenceActionBadge kind="photo" />
                    <span className="ms-action-label">Photo capture</span>
                    <label className="ms-action-camera-angle">
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
