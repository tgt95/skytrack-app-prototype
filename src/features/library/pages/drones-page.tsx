import { DroneIcon, PlusIcon } from "@phosphor-icons/react";
import { Button } from "skytrack-ui/button";
import type { WorkspaceDroneProfile } from "../database/drone-store";
import {
  LibraryCardFrame,
  LibraryPageHeader,
  LibraryPageLayout,
} from "../cards/library-presentation.tsx";

export function DronesPage({
  workspaceName,
  drones,
  onCreate,
  onEdit,
  onDelete,
}: {
  workspaceName: string;
  drones: WorkspaceDroneProfile[];
  onCreate: () => void;
  onEdit: (drone: WorkspaceDroneProfile) => void;
  onDelete: (droneId: string) => void;
}) {
  return (
    <LibraryPageLayout
      titleId="ms-lib-drones-title"
      header={
        <LibraryPageHeader
          titleId="ms-lib-drones-title"
          title="Drones"
          description={
            <p className="ms-lib-sub mt-1 mx-0 mb-0 text-sm text-(--muted-foreground) hidden">
              Reference builds and hardware profiles for {workspaceName}.
            </p>
          }
          actions={
            <Button size="default" variant="default" onClick={onCreate}>
              <PlusIcon aria-hidden="true" /> Add Drone
            </Button>
          }
        />
      }
    >
      <div
        className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5"
        aria-label="Drones"
      >
        {drones.map((drone) => (
          <LibraryCardFrame
            key={drone.id}
            label={drone.name}
            className="ms-lib-resource-card min-h-39  relative cursor-default"
            actions={[
              {
                id: "edit",
                label: "Edit",
                group: "primary",
                onSelect: () => onEdit(drone),
              },
              {
                id: "delete",
                label: "Delete",
                group: "destructive",
                destructive: true,
                onSelect: () => onDelete(drone.id),
              },
            ]}
            data-testid="ms-lib-drone-profile-card"
          >
            <span className="ms-lib-resource-icon flex items-center justify-center w-full aspect-4/3 border-b border-b-border bg-(--muted) text-(--muted-foreground)">
              <DroneIcon
                aria-hidden="true"
                className="w-9 h-9"
              />
            </span>
            <span className="ms-lib-card-body flex flex-col gap-1 p-3 flex-1">
              <span className="text-sm font-medium">{drone.name}</span>
              <span className="text-xs text-muted-foreground leading-[1.5]">
                {drone.firmwareFamily === "Unspecified"
                  ? "Flight firmware not specified"
                  : `${drone.firmwareFamily} flight firmware`}
              </span>
              <span className="text-sm text-muted-foreground">
                {drone.flightControllerModel ||
                  "Flight controller not specified"}
              </span>
              <span
                className=" text-(--muted-foreground) text-[0.6875rem] leading-[1.45]"
                data-testid="ms-lib-drone-component-count"
              >
                {drone.components.length} hardware components
              </span>
            </span>
          </LibraryCardFrame>
        ))}
      </div>
    </LibraryPageLayout>
  );
}
