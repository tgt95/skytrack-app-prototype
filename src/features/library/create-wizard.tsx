/* create-wizard.tsx — "Create mission" 3-step wizard (Figma 631:29818).
   Steps: 1 General (mission name + project) → 2 World (2D/3D type and 3D
   world list) → 3 Drone (drone list) → Create mission. World/type mapping
   below is an explicit mock (backend data pending). */

import { useState } from "react";
import { ArrowLeftIcon } from "@phosphor-icons/react";
import { Button } from "skytrack-ui/button";
import {
  Dialog,
  DialogBackdrop,
  DialogFooter,
  DialogHeader,
  DialogPopup,
  DialogPortal,
  DialogTitle,
} from "skytrack-ui/dialog";
import { Tabs, TabsList, TabsTab } from "skytrack-ui/tabs";
import { WORLDS } from "../../domain/mission-model";
import type { WorkspaceDroneProfile } from "./database/drone-store";
import type { WorkspaceWorldRecord } from "./database/workspace-resources-store";
import { DroneStep } from "./create-wizard/drone-step";
import { GeneralStep } from "./create-wizard/general-step";
import { WorldStep } from "./create-wizard/world-step";

export interface WizardResult {
  title: string;
  projectId: string;
  world: string;
  worldType: "2D" | "3D";
  worldId?: string;
  vehicle: string;
  droneId: string;
}

const STEPS = ["General", "World", "Drone"] as const;

function Stepper({ step }: { step: 1 | 2 | 3 }) {
  return (
    <TabsList
      variant="line"
      className="relative max-w-0 mx-auto pt-1 px-0 pb-0 flex items-center justify-center gap-0"
      aria-label="Create mission steps"
    >
      {STEPS.map((label, i) => {
        const n = (i + 1) as 1 | 2 | 3;
        return (
          <span
            key={label}
            className=" flex items-center flex-[0_0_auto]"
            data-testid="ms-wizard-step-slot"
          >
            <TabsTab
              value={String(n)}
              disabled={n > step}
              aria-label={`Step ${n}: ${label}`}
            >
              <span
                className="inline-flex size-4.5 items-center justify-center rounded-full bg-muted text-[0.6875rem] font-bold text-muted-foreground data-[active]:bg-primary data-[active]:text-primary-foreground"
                data-active={n === step ? "" : undefined}
                aria-hidden="true"
                data-testid="ms-wizard-num"
              >
                {n}
              </span>
              <span data-testid="ms-wizard-label">{label}</span>
            </TabsTab>
            {n < STEPS.length ? (
              <span
                className=" block w-8 h-px my-0 mx-2.5 bg-(--border) flex-[0_0_auto]"
                aria-hidden="true"
                data-testid="ms-wizard-connector"
              />
            ) : null}
          </span>
        );
      })}
    </TabsList>
  );
}

export default function CreateMissionWizard({
  open,
  projects,
  drones,
  worlds,
  initialProjectId,
  initialTitle,
  onImportWorld,
  onClose,
  onSubmit,
}: {
  open: boolean;
  projects: { id: string; name: string }[];
  drones: WorkspaceDroneProfile[];
  worlds: WorkspaceWorldRecord[];
  initialProjectId: string;
  initialTitle: string;
  onImportWorld: (file: File) => Promise<WorkspaceWorldRecord>;
  onClose: () => void;
  onSubmit: (result: WizardResult) => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [title, setTitle] = useState(initialTitle);
  const [projectId, setProjectId] = useState(initialProjectId);
  const [worldType, setWorldType] = useState<"2D" | "3D">("2D");
  const [terrainFile, setTerrainFile] = useState<string | null>(null);
  const [importingWorld, setImportingWorld] = useState(false);
  const [worldImportError, setWorldImportError] = useState<string | null>(null);
  const [worldImportMessage, setWorldImportMessage] = useState<string | null>(null);
  const [world, setWorld] = useState<string>(WORLDS[0]);
  const [worldId, setWorldId] = useState("");
  const [droneId, setDroneId] = useState<string>(drones[0]?.id ?? "");
  const selectedDrone = drones.find((drone) => drone.id === droneId);

  /* Parent remounts (key) per open, so initial state is fresh each time. */
  const worldsForType = worlds.filter(
    (worldProfile) =>
      worldProfile.status === "Sample" ||
      worldProfile.status === "Registered" ||
      (worldProfile.status === "Draft" && Boolean(worldProfile.glbAssetId)),
  );
  const canNext = title.trim() !== "" && projectId !== "";
  const canLeaveWorld =
    !importingWorld && (worldType === "2D" || worldId !== "");
  const goNext = () => {
    if (step === 1 && canNext) setStep(2);
    else if (step === 2 && canLeaveWorld) setStep(3);
  };
  const goBack = () => {
    if (step === 3) setStep(2);
    else if (step === 2) setStep(1);
  };
  const pickWorldType = (t: "2D" | "3D") => {
    setWorldType(t);
    if (t === "2D") {
      setWorld(WORLDS[0]);
      setWorldId("");
      return;
    }
    const selected =
      worldsForType.find((item) => item.id === worldId) ?? worldsForType[0];
    setWorld(selected?.name ?? "");
    setWorldId(selected?.id ?? "");
  };
  const selectWorld = (id: string) => {
    const selected = worldsForType.find((item) => item.id === id);
    setWorldId(id);
    if (selected) setWorld(selected.name);
  };
  const importWorld = async (file: File) => {
    setWorldImportError(null);
    setWorldImportMessage(null);
    setImportingWorld(true);
    try {
      const imported = await onImportWorld(file);
      setWorldType("3D");
      setWorld(imported.name);
      setWorldId(imported.id);
      setWorldImportMessage(`${imported.name} imported and selected.`);
    } catch (error) {
      setWorldImportError(
        error instanceof Error
          ? error.message
          : "The World could not be imported. Check the GLB file and try again.",
      );
    } finally {
      setImportingWorld(false);
    }
  };
  const doCreate = () => {
    if (!canNext || !selectedDrone) return;
    onSubmit({
      title: title.trim(),
      projectId,
      world,
      worldType,
      ...(worldType === "3D" && worldId ? { worldId } : {}),
      vehicle: selectedDrone.name,
      droneId: selectedDrone.id,
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v: boolean) => {
        if (!v) onClose();
      }}
    >
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup aria-label="Create mission" className='top-8 translate-y-0'>
          <DialogHeader>
            <DialogTitle>Create mission</DialogTitle>
          </DialogHeader>
          <Tabs
            value={String(step)}
            onValueChange={(value) => {
              const nextStep = Number(value);
              if (
                Number.isInteger(nextStep) &&
                nextStep >= 1 &&
                nextStep < step
              ) {
                setStep(nextStep as 1 | 2 | 3);
              }
            }}
            data-testid="ms-wizard-tabs"
          >
            <Stepper step={step} />
            <GeneralStep
              title={title}
              onTitleChange={(value) => setTitle(value)}
              onNext={goNext}
              projects={projects}
              projectId={projectId}
              onProjectChange={setProjectId}
            />
            <WorldStep
              worldType={worldType}
              onWorldTypeChange={pickWorldType}
              worlds={worldsForType}
              worldId={worldId}
              onWorldSelect={selectWorld}
              onImportWorld={file => void importWorld(file)}
              importingWorld={importingWorld}
              worldImportError={worldImportError}
              worldImportMessage={worldImportMessage}
              terrainFile={terrainFile}
              onTerrainFileSelect={setTerrainFile}
            />
            <DroneStep
              drones={drones}
              droneId={droneId}
              onDroneSelect={setDroneId}
            />
          </Tabs>
          <DialogFooter data-testid="ms-wizard-footer">
            <span
              className="mr-auto flex items-center gap-2"
              data-testid="ms-wizard-footer-start"
            >
              {step > 1 ? (
                <Button
                  variant="secondary"
                  onClick={goBack}
                  aria-label={`Back to step ${step - 1}`}
                >
                  <ArrowLeftIcon aria-hidden="true" /> Back
                </Button>
              ) : null}
            </span>
            <span
              className="flex items-center gap-2"
              data-testid="ms-wizard-footer-end"
            >
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              {step < 3 ? (
                <Button
                  variant="default"
                  disabled={step === 1 ? !canNext : !canLeaveWorld}
                  onClick={goNext}
                >
                  Next
                </Button>
              ) : (
                <Button
                  variant="default"
                  disabled={!canNext || !selectedDrone}
                  onClick={doCreate}
                >
                  Create mission
                </Button>
              )}
            </span>
          </DialogFooter>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  );
}
