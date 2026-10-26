/* create-wizard.tsx — "Create mission" 3-step wizard (Figma 631:29818).
   Steps: 1 General (mission name + project) → 2 World (2D/3D type and 3D
   world list) → 3 Drone (drone list) → Create mission. World/type mapping
   below is an explicit mock (backend data pending). */

import { useState } from "react";
import { ArrowLeftIcon, UploadIcon } from "@phosphor-icons/react";
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
import { FieldControl, FieldLabel, FieldRoot } from "skytrack-ui/field";
import { RadioGroup, RadioRoot } from "skytrack-ui/radio";
import {
  Select,
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
import {
  Tabs,
  TabsIndicator,
  TabsList,
  TabsPanel,
  TabsTab,
} from "skytrack-ui/tabs";
import { WORLDS } from "../../domain/mission-model";
import type { WorkspaceDroneProfile } from "./database/drone-store";
import type { WorkspaceWorldRecord } from "./database/workspace-resources-store";
import MissionThumbnail from "./mission-thumbnail";

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
      variant="standard"
      className=" relative w-fit max-w-none m-[0_auto] p-[0.25rem_0_0] flex items-center justify-center gap-0"
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
              variant="standard"
              disabled={n > step}
              className={[
                `ms-wizard-stepbtn is-${state}`,
                "inline-flex flex-[0_0_auto] items-center gap-[0.375rem] p-[0_0_0.5rem] bg-transparent text-(--muted-foreground) [font:inherit] text-[0.8125rem] [&:not(:disabled):hover]:text-(--foreground) [button&:focus-visible]:[outline:0.125rem_solid_var(--primary)] [button&:focus-visible]:outline-offset-1 data-active:text-(--foreground) data-active:font-semibold grid place-items-center w-[1.5rem] h-[1.5rem] rounded-[50%] bg-(--muted) text-(--foreground) text-[0.75rem] font-semibold",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-label={`Step ${n}: ${label}`}
            >
              <span
                className=" inline-flex items-center justify-center w-[1.125rem] h-[1.125rem] rounded-[50%] bg-(--muted) text-(--muted-foreground) text-[0.6875rem] font-bold [.ms-wizard-stepbtn[data-active]_&]:bg-(--primary) [.ms-wizard-stepbtn[data-active]_&]:text-(--primary-foreground)"
                aria-hidden="true"
                data-testid="ms-wizard-num"
              >
                {n}
              </span>
              <span data-testid="ms-wizard-label">{label}</span>
            </TabsTab>
            {n < STEPS.length ? (
              <span
                className=" block w-[2rem] h-px m-[0_0.625rem] bg-(--border) flex-[0_0_auto]"
                aria-hidden="true"
                data-testid="ms-wizard-connector"
              />
            ) : null}
          </span>
        );
      })}
      <TabsIndicator variant="underline" />
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
            <TabsPanel value="1" className="ms-wizard-panel">
              <div className="ms-lib-form">
                <FieldRoot name="wizard-mission-name">
                  <FieldLabel>Mission name</FieldLabel>
                  <FieldControl
                    value={title}
                    onValueChange={(v) =>
                      setTitle(typeof v === "string" ? v : "")
                    }
                    placeholder="Enter text"
                    maxLength={120}
                    aria-label="Mission name"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        goNext();
                      }
                    }}
                  />
                </FieldRoot>
                <div className="ms-field">
                  <span className="ms-field-label" id="ms-wizard-project-label">
                    Project
                  </span>
                  <Select
                    value={projectId}
                    onValueChange={(v) => setProjectId(String(v))}
                  >
                    <SelectTrigger
                      aria-labelledby="ms-wizard-project-label"
                      className="ms-lib-select"
                    >
                      <SelectValue placeholder="Select a project">
                        {projects.find((p) => p.id === projectId)?.name ?? ""}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectPortal>
                      <SelectPositioner>
                        <SelectPopup>
                          <SelectList>
                            {projects.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                <SelectItemIndicator />
                                <SelectItemText>{p.name}</SelectItemText>
                              </SelectItem>
                            ))}
                          </SelectList>
                        </SelectPopup>
                      </SelectPositioner>
                    </SelectPortal>
                  </Select>
                </div>
              </div>
            </TabsPanel>
            <TabsPanel value="2" className="ms-wizard-panel">
              <div className="ms-lib-form">
                <div className="ms-field">
                  <span
                    className="ms-field-label"
                    id="ms-wizard-worldtype-label"
                  >
                    World type
                  </span>
                  <Tabs
                    value={worldType}
                    onValueChange={(value) => {
                      if (value === "2D" || value === "3D")
                        pickWorldType(value);
                    }}
                    className=" w-full max-w-none"
                    data-testid="ms-wizard-mode-tabs"
                  >
                    <TabsList
                      variant="filled"
                      className=" w-[10.625rem] self-start"
                      aria-labelledby="ms-wizard-worldtype-label"
                      data-testid="ms-wizard-toggle"
                    >
                      <TabsTab value="2D" variant="filled">
                        2D
                      </TabsTab>
                      <TabsTab value="3D" variant="filled">
                        3D
                      </TabsTab>
                    </TabsList>
                    <TabsPanel value="2D" className="ms-wizard-mode-panel" />
                    <TabsPanel value="3D" className="ms-wizard-mode-panel">
                      <div className="ms-field">
                        <span
                          className="ms-field-label"
                          id="ms-wizard-world-label"
                        >
                          World list
                        </span>
                        <RadioGroup
                          value={worldId}
                          onValueChange={(v: unknown) => {
                            const id = String(v);
                            const selected = worldsForType.find(
                              (item) => item.id === id,
                            );
                            setWorldId(id);
                            if (selected) setWorld(selected.name);
                          }}
                          aria-labelledby="ms-wizard-world-label"
                          className="ms-wizard-radio-list"
                        >
                          {worldsForType.map((worldProfile) => (
                            <label
                              key={worldProfile.id}
                              className="ms-wizard-radio-row"
                            >
                              <span
                                className="ms-wizard-thumb"
                                aria-hidden="true"
                              >
                                <MissionThumbnail />
                              </span>
                              <span className="ms-wizard-row-text">
                                {worldProfile.name}
                                <span className="ms-wizard-tags">
                                  <span className="ms-wizard-tag">
                                    {worldProfile.status}
                                  </span>
                                </span>
                              </span>
                              <RadioRoot
                                value={worldProfile.id}
                                aria-label={`${worldProfile.name} · ${worldProfile.status}`}
                                className="order-3 ml-auto flex-[0_0_auto]"
                              />
                            </label>
                          ))}
                        </RadioGroup>
                        {worldsForType.length === 0 ? (
                          <p className="ms-hint">
                            Add or register a World in this Workspace before
                            creating a 3D mission.
                          </p>
                        ) : null}
                      </div>
                    </TabsPanel>
                  </Tabs>
                </div>
                {worldType === "2D" ? (
                  <div className="ms-field">
                    <span
                      className="ms-field-label"
                      id="ms-wizard-terrain-label"
                    >
                      Terrain layer (Optional)
                    </span>
                    <div
                      className=" flex flex-col items-center gap-[0.5rem] p-[1.25rem_0.75rem] [border:0.0625rem_dashed_var(--border)] rounded-(--radius) bg-(--muted) text-(--muted-foreground) text-[0.75rem]"
                      role="group"
                      aria-labelledby="ms-wizard-terrain-label"
                      data-testid="ms-wizard-dropzone"
                    >
                      <UploadIcon
                        aria-hidden="true"
                        className="w-[1.25rem] h-[1.25rem]"
                      />
                      <span className="ms-hint">
                        {terrainFile ?? "No file chosen"}
                      </span>
                      <label
                        className={
                          ' inline-block p-[0.375rem_0.75rem] [border:0.0625rem_solid_var(--border)] rounded-(--radius) bg-(--card) text-(--foreground) text-[0.75rem] font-semibold cursor-pointer [&:hover]:border-(--primary) [&:hover]:text-(--primary) focus-within:[outline:0.125rem_solid_var(--primary)] focus-within:outline-offset-1 absolute inset-0 pointer-events-none [&::before]:absolute [&::before]:inset-0 [&::before]:[content:""] [&::before]:bg-bottom-right [&::before]:bg-repeat-y [&::after]:absolute [&::after]:inset-0 [&::after]:[content:""] [&::after]:bg-bottom-right [&::after]:bg-repeat-y [&::before]:bg-[repeating-linear-gradient(to_top,transparent_0,transparent_calc(1%-0.03125rem),color-mix(in_srgb,var(--border)_75%,transparent)_calc(1%-0.03125rem),color-mix(in_srgb,var(--border)_75%,transparent)_1%)] [&::before]:mask-[linear-gradient(to_left,#000_0_1.125rem,transparent_1.125rem)] [&::after]:bg-[repeating-linear-gradient(to_top,transparent_0,transparent_calc(0.2%-0.00625rem),color-mix(in_srgb,var(--border)_40%,transparent)_calc(0.2%-0.00625rem),color-mix(in_srgb,var(--border)_40%,transparent)_0.2%)] [&::after]:mask-[linear-gradient(to_left,#000_0_0.5625rem,transparent_0.5625rem)]'
                        }
                        data-testid="ms-wizard-filebtn"
                      >
                        Choose File
                        <input
                          type="file"
                          className="ms-sr"
                          aria-label="Choose terrain file"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) setTerrainFile(file.name);
                            event.target.value = "";
                          }}
                        />
                      </label>
                    </div>
                  </div>
                ) : null}
              </div>
            </TabsPanel>
            <TabsPanel value="3" className="ms-wizard-panel">
              <div className="ms-lib-form">
                <div className="ms-field">
                  <span className="ms-field-label" id="ms-wizard-drone-label">
                    Drone list
                  </span>
                  <RadioGroup
                    value={droneId}
                    onValueChange={(v: unknown) => setDroneId(String(v))}
                    aria-labelledby="ms-wizard-drone-label"
                    className="ms-wizard-radio-list"
                  >
                    {drones.map((drone) => (
                      <label key={drone.id} className="ms-wizard-radio-row">
                        <span className="ms-wizard-thumb" aria-hidden="true">
                          <MissionThumbnail />
                        </span>
                        <span className="ms-wizard-row-text">
                          {drone.name}
                          <span className="ms-wizard-tags">
                            <span className="ms-wizard-tag">
                              {drone.firmwareFamily === "Unspecified"
                                ? "Firmware not specified"
                                : drone.firmwareFamily}
                            </span>
                            {drone.flightControllerModel ? (
                              <span className="ms-wizard-tag">
                                {drone.flightControllerModel}
                              </span>
                            ) : null}
                          </span>
                        </span>
                        <RadioRoot
                          value={drone.id}
                          aria-label={drone.name}
                          className="order-3 ml-auto flex-[0_0_auto]"
                        />
                      </label>
                    ))}
                    {drones.length === 0 ? (
                      <p className="ms-drone-empty-components">
                        Add a Drone profile to this Workspace before creating a
                        mission.
                      </p>
                    ) : null}
                  </RadioGroup>
                </div>
              </div>
            </TabsPanel>
          </Tabs>
          <DialogFooter
            className=" in-[.ms-lib-wizard]:flex in-[.ms-lib-wizard]:items-center in-[.ms-lib-wizard]:justify-between in-[.ms-lib-wizard]:gap-[0.5rem]"
            data-testid="ms-wizard-footer"
          >
            <span
              className=" flex items-center gap-[0.5rem]"
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
              className=" flex items-center gap-[0.5rem]"
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
