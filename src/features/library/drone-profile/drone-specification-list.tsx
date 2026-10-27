import { TrashIcon } from "@phosphor-icons/react";
import { Button } from "skytrack-ui/button";
import { SkyTooltip } from "../../../ui/components/sky-tooltip";
import type { DroneHardwareSpecification } from "../database/drone-store";
import { TextField } from "./drone-profile-fields";

export function DroneSpecificationList({
  specifications,
  onPatch,
  onRemove,
}: {
  specifications: DroneHardwareSpecification[];
  onPatch: (
    specificationId: string,
    patch: Partial<DroneHardwareSpecification>,
  ) => void;
  onRemove: (specificationId: string) => void;
}) {
  return (
    <div
      className=" flex flex-col gap-[0.5rem]"
      data-testid="ms-drone-specification-list"
    >
      {specifications.map((specification) => (
        <div
          className=" grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2rem] [align-items:end] gap-[0.5rem] [@media_(max-width:_45rem)]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2rem]"
          key={specification.id}
          data-testid="ms-drone-specification-row"
        >
          <TextField
            label="Specification"
            value={specification.label}
            onChange={(label) => onPatch(specification.id, { label })}
            placeholder="e.g. Capacity"
          />
          <TextField
            label="Value"
            value={specification.value}
            onChange={(value) => onPatch(specification.id, { value })}
            placeholder="e.g. 5300 mAh"
          />
          <SkyTooltip>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Remove specification ${specification.label || "row"}`}
              onClick={() => onRemove(specification.id)}
            >
              <TrashIcon aria-hidden="true" />
            </Button>
          </SkyTooltip>
        </div>
      ))}
    </div>
  );
}
