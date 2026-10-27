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
import { Tabs, TabsIndicator, TabsList, TabsTab } from "skytrack-ui/tabs";
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
      className=" relative w-fit max-w-none m-[0_auto] pt-1 px-0 pb-0 flex items-center justify-center gap-0"
      aria-label="Create mission steps"
    >
      {STEPS.map((label, i) => {
        const n = (i + 1) as 1 | 2 | 3;
        const state = n < step ? "done" : n === step ? "active" : "todo";
        return (
          <span
            key={label}
            className=" flex items-center flex-[0_0_auto]"
            data-testid="ms-wizard-step-slot"
          >
            <TabsTab
              value={String(n)}
              variant="line"
              disabled={n > step}
              className={[
                `ms-wizard-stepbtn is-${state}`,
                "inline-flex flex-[0_0_auto] items-center gap-1.5 pt-0 px-0 pb-2 bg-transparent text-(--muted-foreground) [font:inherit] text-[0.8125rem] [&:not(:disabled):hover]:text-(--foreground) [button&:focus-visible]:outline-2 [button&:focus-visible]:outline-(--primary) [button&:focus-visible]:outline-offset-1 data-active:text-(--foreground) data-active:font-semibold grid place-items-center w-6 h-6 rounded-[50%] bg-(--muted) text-(--foreground) text-xs font-semibold",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-label={`Step ${n}: ${label}`}
            >
              <span
                className=" inline-flex items-center justify-center w-4.5 h-4.5 rounded-[50%] bg-(--muted) text-(--muted-foreground) text-[0.6875rem] font-bold [.ms-wizard-stepbtn[data-active]_&]:bg-(--primary) [.ms-wizard-stepbtn[data-active]_&]:text-(--primary-foreground)"
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
      <TabsIndicator variant="line" />
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
  onClose,
  onSubmit,
}: {
  open: boolean;
  projects: { id: string; name: string }[];
  drones: WorkspaceDroneProfile[];
  worlds: WorkspaceWorldRecord[];
  initialProjectId: string;
  initialTitle: string;
  onClose: () => void;
  onSubmit: (result: WizardResult) => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [title, setTitle] = useState(initialTitle);
  const [projectId, setProjectId] = useState(initialProjectId);
  const [worldType, setWorldType] = useState<"2D" | "3D">("2D");
  const [terrainFile, setTerrainFile] = useState<string | null>(null);
  const [world, setWorld] = useState<string>(WORLDS[0]);
  const [worldId, setWorldId] = useState("");
  const [droneId, setDroneId] = useState<string>(drones[0]?.id ?? "");
  const selectedDrone = drones.find((drone) => drone.id === droneId);

  /* Parent remounts (key) per open, so initial state is fresh each time. */
  const worldsForType = worlds.filter(
    (worldProfile) =>
      worldProfile.status === "Sample" || worldProfile.status === "Registered",
  );
  const canNext = title.trim() !== "" && projectId !== "";
  const canLeaveWorld = worldType === "2D" || worldId !== "";
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
        <DialogPopup
          aria-label="Create mission"
          className="ms-lib-wizard w-[min(32rem,calc(100vw-2rem))]"
        >
          <DialogHeader>
            <DialogTitle className="heading">Create mission</DialogTitle>
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
            className=" w-full max-w-none"
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
              terrainFile={terrainFile}
              onTerrainFileSelect={setTerrainFile}
            />
            <DroneStep
              drones={drones}
              droneId={droneId}
              onDroneSelect={setDroneId}
            />
          </Tabs>
          <DialogFooter
            className=" in-[.ms-lib-wizard]:flex in-[.ms-lib-wizard]:items-center in-[.ms-lib-wizard]:justify-between in-[.ms-lib-wizard]:gap-2"
            data-testid="ms-wizard-footer"
          >
            <span
              className=" flex items-center gap-2"
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
              className=" flex items-center gap-2"
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
