import { PlusIcon } from "@phosphor-icons/react";
import { Button } from "skytrack-ui/button";
import type {
  DroneHardwareComponent,
  DroneHardwareSpecification,
} from "../database/drone-store";
import { DroneComponentRow } from "./drone-component-row";

export function DroneHardwareSection({
  components,
  onAddComponent,
  onRemoveComponent,
  onPatchComponent,
  onAddSpecification,
  onPatchSpecification,
  onRemoveSpecification,
}: {
  components: DroneHardwareComponent[];
  onAddComponent: () => void;
  onRemoveComponent: (componentId: string) => void;
  onPatchComponent: (
    componentId: string,
    patch: Partial<DroneHardwareComponent>,
  ) => void;
  onAddSpecification: (componentId: string) => void;
  onPatchSpecification: (
    componentId: string,
    specificationId: string,
    patch: Partial<DroneHardwareSpecification>,
  ) => void;
  onRemoveSpecification: (componentId: string, specificationId: string) => void;
}) {
  return (
    <section
      className="ms-drone-form-section"
      aria-labelledby="ms-drone-hardware-title"
    >
      <div
        className="ms-drone-section-heading  flex-row items-center justify-between gap-[0.875rem] [@media_(max-width:_45rem)]:items-start"
        data-testid="ms-drone-components-heading"
      >
        <div>
          <h2
            id="ms-drone-hardware-title"
            className="heading m-0 text-[0.875rem] font-semibold"
          >
            Hardware components
          </h2>
          <p className="m-0 text-(--muted-foreground) text-[0.75rem] leading-[1.5]">
            Track subsystem, part identity, specifications, installation state,
            and source. Unknown details stay blank.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={onAddComponent}>
          <PlusIcon aria-hidden="true" /> Add component
        </Button>
      </div>
      {components.length === 0 ? (
        <p className="ms-drone-empty-components">
          No hardware components added.
        </p>
      ) : (
        <div
          className=" flex flex-col gap-[0.5rem]"
          data-testid="ms-drone-component-list"
        >
          {components.map((component, index) => (
            <DroneComponentRow
              key={component.id}
              component={component}
              index={index}
              onPatch={(patch) => onPatchComponent(component.id, patch)}
              onRemove={() => onRemoveComponent(component.id)}
              onAddSpecification={() => onAddSpecification(component.id)}
              onPatchSpecification={(specificationId, patch) =>
                onPatchSpecification(component.id, specificationId, patch)
              }
              onRemoveSpecification={(specificationId) =>
                onRemoveSpecification(component.id, specificationId)
              }
            />
          ))}
        </div>
      )}
    </section>
  );
}
