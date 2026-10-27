import { PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { Button } from "skytrack-ui/button";
import { FieldControl, FieldLabel, FieldRoot } from "skytrack-ui/field";
import {
  Select,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
  SelectIcon,
  SelectList,
  SelectPopup,
  SelectPortal,
  SelectPositioner,
  SelectTrigger,
  SelectValue,
} from "skytrack-ui/select";
import { SkyTooltip } from "../../../ui/components/sky-tooltip";
import {
  DRONE_COMPONENT_GROUPS,
  DRONE_COMPONENT_INSTALL_STATES,
  DRONE_DATA_SOURCE_TYPES,
  type DroneComponentGroup,
  type DroneComponentInstallState,
  type DroneDataSourceType,
  type DroneHardwareComponent,
  type DroneHardwareSpecification,
} from "../database/drone-store";
import { SelectField, TextField } from "./drone-profile-fields";
import { DroneSpecificationList } from "./drone-specification-list";

export function DroneComponentRow({
  component,
  index,
  onPatch,
  onRemove,
  onAddSpecification,
  onPatchSpecification,
  onRemoveSpecification,
}: {
  component: DroneHardwareComponent;
  index: number;
  onPatch: (patch: Partial<DroneHardwareComponent>) => void;
  onRemove: () => void;
  onAddSpecification: () => void;
  onPatchSpecification: (
    specificationId: string,
    patch: Partial<DroneHardwareSpecification>,
  ) => void;
  onRemoveSpecification: (specificationId: string) => void;
}) {
  return (
    <div
      className="ms-drone-component-row grid grid-cols-[2rem_minmax(9.0625rem,1.1fr)_minmax(9.6875rem,1.3fr)_minmax(9.6875rem,1.3fr)_2rem] [align-items:end] gap-2 p-2.5 border border-border rounded-(--radius) bg-(--card) [@media_(max-width:_45rem)]:grid-cols-[1.75rem_minmax(0,1fr)_2rem]"
      key={component.id}
    >
      <span
        className=" flex items-center h-9 text-(--muted-foreground) text-[0.6875rem] [font-variant-numeric:tabular-nums] [@media_(max-width:_45rem)]:row-[1/span_3] [@media_(max-width:_45rem)]:items-start [@media_(max-width:_45rem)]:pt-7"
        aria-hidden="true"
        data-testid="ms-drone-component-index"
      >
        {String(index + 1).padStart(2, "0")}
      </span>
      <FieldRoot
        className="ms-field  [@media_(max-width:_45rem)]:in-[.ms-drone-component-row]:col-2"
        data-testid="ms-drone-group-field"
      >
        <FieldLabel>Group</FieldLabel>
        <Select<DroneComponentGroup>
          items={DRONE_COMPONENT_GROUPS.map((value) => ({
            value,
            label: value,
          }))}
          value={component.group}
          onValueChange={(value: unknown) =>
            onPatch({ group: String(value) as DroneComponentGroup })
          }
        >
          <SelectTrigger>
            <SelectValue />
            <SelectIcon />
          </SelectTrigger>
          <SelectPortal>
            <SelectPositioner side="bottom" align="start" sideOffset={4}>
              <SelectPopup>
                <SelectList>
                  {DRONE_COMPONENT_GROUPS.map((value) => (
                    <SelectItem key={value} value={value}>
                      <SelectItemIndicator />
                      <SelectItemText>{value}</SelectItemText>
                    </SelectItem>
                  ))}
                </SelectList>
              </SelectPopup>
            </SelectPositioner>
          </SelectPortal>
        </Select>
      </FieldRoot>
      <FieldRoot className="ms-field">
        <FieldLabel>Component name</FieldLabel>
        <FieldControl
          value={component.name}
          onValueChange={(value: unknown) => onPatch({ name: String(value) })}
          placeholder="e.g. Pixhawk 6C Mini"
        />
      </FieldRoot>
      <FieldRoot
        className="ms-field  [@media_(max-width:_45rem)]:in-[.ms-drone-component-row]:col-2"
        data-testid="ms-drone-purpose-field"
      >
        <FieldLabel>Role / note</FieldLabel>
        <FieldControl
          value={component.purpose}
          onValueChange={(value: unknown) =>
            onPatch({ purpose: String(value) })
          }
          placeholder="Optional"
        />
      </FieldRoot>
      <SkyTooltip>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className=" mb-px [@media_(max-width:_45rem)]:col-3 [@media_(max-width:_45rem)]:row-1"
          aria-label={`Remove component ${component.name || index + 1}`}
          onClick={onRemove}
        >
          <TrashIcon aria-hidden="true" />
        </Button>
      </SkyTooltip>
      <details
        className=" col-span-full border-t border-t-border pt-2"
        data-testid="ms-drone-component-details"
      >
        <summary className="w-fit text-(--muted-foreground) text-xs cursor-pointer">
          Specifications &amp; source
        </summary>
        <div
          className=" flex flex-col gap-4 pt-3"
          data-testid="ms-drone-component-detail-body"
        >
          <div className="ms-drone-form-grid">
            <TextField
              label="Manufacturer"
              value={component.manufacturer}
              onChange={(manufacturer) => onPatch({ manufacturer })}
              placeholder="Not specified"
            />
            <TextField
              label="Model"
              value={component.model}
              onChange={(model) => onPatch({ model })}
              placeholder="Not specified"
            />
            <TextField
              label="Part number"
              value={component.partNumber}
              onChange={(partNumber) => onPatch({ partNumber })}
              placeholder="Optional"
            />
            <TextField
              label="Revision"
              value={component.revision}
              onChange={(revision) => onPatch({ revision })}
              placeholder="Optional"
            />
            <SelectField<DroneComponentInstallState>
              label="Install state"
              value={component.installState}
              options={DRONE_COMPONENT_INSTALL_STATES}
              onChange={(installState) => onPatch({ installState })}
            />
            <SelectField<DroneDataSourceType>
              label="Data source status"
              value={component.sourceType}
              options={DRONE_DATA_SOURCE_TYPES}
              onChange={(sourceType) => onPatch({ sourceType })}
            />
            <TextField
              label="Source label"
              value={component.sourceLabel}
              onChange={(sourceLabel) => onPatch({ sourceLabel })}
              placeholder="e.g. Owner-provided build list"
            />
            <TextField
              label="Source date"
              value={component.sourceDate}
              onChange={(sourceDate) => onPatch({ sourceDate })}
              type="date"
            />
            <TextField
              label="Source URL"
              value={component.sourceUrl}
              onChange={(sourceUrl) => onPatch({ sourceUrl })}
              placeholder="https://"
              type="url"
            />
          </div>
          <div
            className=" flex items-start justify-between gap-3 [@media_(max-width:_45rem)]:flex-col"
            data-testid="ms-drone-specifications-heading"
          >
            <div>
              <h3 className="sub-heading mt-0 mx-0 mb-0.75 text-xs">
                Key specifications
              </h3>
              <p className="max-w-140 m-0 text-(--muted-foreground) text-[0.6875rem] leading-[1.45]">
                Examples: battery chemistry, cell count, capacity, voltage,
                connector; motor size and KV; ESC current and firmware;
                propeller diameter, pitch, and blade count.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onAddSpecification}
            >
              <PlusIcon aria-hidden="true" /> Add specification
            </Button>
          </div>
          {component.specifications.length === 0 ? (
            <p className="ms-drone-empty-components">
              No specifications added.
            </p>
          ) : (
            <DroneSpecificationList
              specifications={component.specifications}
              onPatch={onPatchSpecification}
              onRemove={onRemoveSpecification}
            />
          )}
        </div>
      </details>
    </div>
  );
}
