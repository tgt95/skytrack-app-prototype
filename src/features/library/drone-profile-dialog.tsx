import { useEffect, useState } from "react";
import { XIcon } from "@phosphor-icons/react";
import { Button } from "skytrack-ui/button";
import {
  Dialog,
  DialogBackdrop,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPopup,
  DialogPortal,
  DialogTitle,
} from "skytrack-ui/dialog";
import {
  newDroneHardwareComponent,
  type DroneHardwareComponent,
  type DroneHardwareSpecification,
  type WorkspaceDroneProfile,
} from "./database/drone-store";
import { DronePlatformSection } from "./drone-profile/drone-platform-section";
import { DronePerformanceSourceSection } from "./drone-profile/drone-performance-source-section";
import { DroneHardwareSection } from "./drone-profile/drone-hardware-section";

function componentId(): string {
  return `component-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function specificationId(): string {
  return `spec-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function DroneProfileDialog({
  open,
  mode,
  profile,
  onClose,
  onSave,
}: {
  open: boolean;
  mode: "create" | "edit";
  profile: WorkspaceDroneProfile | null;
  onClose: () => void;
  onSave: (profile: WorkspaceDroneProfile) => void;
}) {
  const [draft, setDraft] = useState<WorkspaceDroneProfile | null>(profile);

  useEffect(() => setDraft(profile), [profile, open]);
  if (!draft) return null;

  const patchDraft = (patch: Partial<WorkspaceDroneProfile>) =>
    setDraft((current) => (current ? { ...current, ...patch } : current));
  const patchComponent = (
    id: string,
    patch: Partial<DroneHardwareComponent>,
  ) => {
    setDraft((current) =>
      current
        ? {
            ...current,
            components: current.components.map((item) =>
              item.id === id ? { ...item, ...patch } : item,
            ),
          }
        : current,
    );
  };
  const addComponent = () => {
    setDraft((current) =>
      current
        ? {
            ...current,
            components: [
              ...current.components,
              newDroneHardwareComponent(componentId()),
            ],
          }
        : current,
    );
  };
  const removeComponent = (id: string) => {
    setDraft((current) =>
      current
        ? {
            ...current,
            components: current.components.filter((item) => item.id !== id),
          }
        : current,
    );
  };
  const patchSpecification = (
    componentId: string,
    id: string,
    patch: Partial<DroneHardwareSpecification>,
  ) => {
    setDraft((current) =>
      current
        ? {
            ...current,
            components: current.components.map((item) =>
              item.id === componentId
                ? {
                    ...item,
                    specifications: item.specifications.map((specification) =>
                      specification.id === id
                        ? { ...specification, ...patch }
                        : specification,
                    ),
                  }
                : item,
            ),
          }
        : current,
    );
  };
  const addSpecification = (componentId: string) => {
    setDraft((current) =>
      current
        ? {
            ...current,
            components: current.components.map((item) =>
              item.id === componentId
                ? {
                    ...item,
                    specifications: [
                      ...item.specifications,
                      { id: specificationId(), label: "", value: "" },
                    ],
                  }
                : item,
            ),
          }
        : current,
    );
  };
  const removeSpecification = (componentId: string, id: string) => {
    setDraft((current) =>
      current
        ? {
            ...current,
            components: current.components.map((item) =>
              item.id === componentId
                ? {
                    ...item,
                    specifications: item.specifications.filter(
                      (specification) => specification.id !== id,
                    ),
                  }
                : item,
            ),
          }
        : current,
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(value: boolean) => {
        if (!value) onClose();
      }}
    >
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup
          className=" sm:max-w-[920px] max-h-[min(95dvh,100%)] flex flex-col overflow-hidden"
          aria-label={
            mode === "create"
              ? "Add drone"
              : `Edit ${profile?.name ?? draft.name}`
          }
        >
          <DialogHeader>
            <DialogTitle className="heading">
              {mode === "create"
                ? "Add drone"
                : `Edit ${profile?.name ?? draft.name}`}
            </DialogTitle>
            <DialogDescription>
              Manage this Workspace’s reference profile. Values are descriptive;
              compatibility is not checked and no flight hardware is connected.
            </DialogDescription>
          </DialogHeader>
          <div className="ms-drone-dialog-body">
            <DronePlatformSection profile={draft} onPatch={patchDraft} />
            <DronePerformanceSourceSection
              profile={draft}
              onPatch={patchDraft}
            />
            <DroneHardwareSection
              components={draft.components}
              onAddComponent={addComponent}
              onRemoveComponent={removeComponent}
              onPatchComponent={patchComponent}
              onAddSpecification={addSpecification}
              onPatchSpecification={patchSpecification}
              onRemoveSpecification={removeSpecification}
            />
          </div>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={onClose}
              className="w-auto flex-[0_0_auto]"
            >
              <XIcon aria-hidden="true" /> Cancel
            </Button>
            <Button
              variant="default"
              disabled={!draft.name.trim()}
              onClick={() => onSave({ ...draft, name: draft.name.trim() })}
              className="w-auto flex-[0_0_auto]"
            >
              Save drone
            </Button>
          </DialogFooter>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  );
}
