import { useEffect, useMemo, useState } from "react";
import { Button } from "skytrack-ui/button";
import { PageHeader } from "skytrack-ui/page-header";
import { Tabs, TabsList, TabsPanel, TabsTab } from "skytrack-ui/tabs";
import { LibraryPageLayout } from "@/features/library/cards/library-presentation";
import {
  DEFAULT_DRONE_GEOMETRY,
  droneGeometryMass,
  droneGeometryThrustRatio,
  getDronePayloads,
  validateDroneGeometry,
  withDronePayloads,
  type DroneGeometry,
} from "@/domain/drone-geometry";
import {
  DEFAULT_DRONE_ONBOARDING_DATA,
  type DroneOnboardingData,
  type DroneSensorProfile,
} from "@/domain/drone-onboarding";
import { type WorkspaceDroneProfile } from "@/features/library/database/drone-store";
import {
  DroneGeometryFields,
  DronePayloadFields,
} from "./drone-geometry-fields";
import { DroneOnboardingFields } from "./drone-onboarding-fields";
import { DronePreviewPanel } from "./drone-preview-panel";
import {
  DroneFlightTuningFields,
  DroneManualPidFields,
} from "./drone-tuning-fields";

type EditorTab =
  | "geometry"
  | "payloads"
  | "calibration"
  | "appearance"
  | "flight-tuning"
  | "manual-pid";
const EDITOR_TABS: readonly EditorTab[] = [
  "geometry",
  "payloads",
  "calibration",
  "appearance",
  "flight-tuning",
  "manual-pid",
];

function isEditorTab(value: string): value is EditorTab {
  return EDITOR_TABS.includes(value as EditorTab);
}

function onboardingRecordId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function DroneProfileEditorPage({
  mode,
  profile,
  onCancel,
  onSave,
}: {
  mode: "create" | "edit";
  profile: WorkspaceDroneProfile | null;
  onCancel: () => void;
  onSave: (profile: WorkspaceDroneProfile) => void;
}) {
  const [draft, setDraft] = useState<WorkspaceDroneProfile | null>(profile);
  const [geometry, setGeometry] = useState<DroneGeometry>(
    profile?.geometry ?? DEFAULT_DRONE_GEOMETRY,
  );
  const [lastValidGeometry, setLastValidGeometry] = useState<DroneGeometry>(
    profile?.geometry ?? DEFAULT_DRONE_GEOMETRY,
  );
  const [tab, setTab] = useState<EditorTab>("geometry");
  const [view, setView] = useState<"isometric" | "top" | "front">("isometric");
  const [resetKey, setResetKey] = useState(0);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    setDraft(profile);
    const nextGeometry = profile?.geometry ?? { ...DEFAULT_DRONE_GEOMETRY };
    setGeometry(nextGeometry);
    setLastValidGeometry(nextGeometry);
    setFormError("");
  }, [profile]);

  const geometryErrors = useMemo(
    () => validateDroneGeometry(geometry),
    [geometry],
  );
  const geometryValid = Object.keys(geometryErrors).length === 0;
  const previewGeometry = geometryValid ? geometry : lastValidGeometry;
  const massKg = droneGeometryMass(previewGeometry);
  const payloadMassKg = getDronePayloads(previewGeometry).reduce(
    (sum, payload) => sum + payload.massKg,
    0,
  );
  const thrustRatio = droneGeometryThrustRatio(previewGeometry);

  if (!draft) return null;

  const patchDraft = (patch: Partial<WorkspaceDroneProfile>) =>
    setDraft((current) => (current ? { ...current, ...patch } : current));
  const patchOnboarding = (patch: Partial<DroneOnboardingData>) =>
    setDraft((current) =>
      current
        ? {
            ...current,
            onboarding: {
              ...DEFAULT_DRONE_ONBOARDING_DATA,
              ...current.onboarding,
              ...patch,
            },
          }
        : current,
    );
  const patchGeometry = (patch: Partial<DroneGeometry>) => {
    const next = { ...geometry, ...patch };
    setGeometry(next);
    if (Object.keys(validateDroneGeometry(next)).length === 0)
      setLastValidGeometry(next);
    setFormError("");
  };
  const addSensor = () => {
    const defaultSensor = DEFAULT_DRONE_ONBOARDING_DATA.sensors[0];
    if (!defaultSensor) return;
    const sensor = {
      ...defaultSensor,
      id: onboardingRecordId("sensor"),
    };
    setDraft((current) =>
      current
        ? {
            ...current,
            onboarding: {
              ...DEFAULT_DRONE_ONBOARDING_DATA,
              ...current.onboarding,
              sensors: [...(current.onboarding?.sensors ?? []), sensor],
            },
          }
        : current,
    );
  };
  const removeSensor = (id: string) =>
    patchOnboarding({
      sensors: (draft.onboarding?.sensors ?? []).filter(
        (sensor) => sensor.id !== id,
      ),
    });
  const patchSensor = (sensor: DroneSensorProfile) =>
    patchOnboarding({
      sensors: (draft.onboarding?.sensors ?? []).map((current) =>
        current.id === sensor.id ? sensor : current,
      ),
    });
  const submit = () => {
    if (!draft.name.trim()) {
      setTab("geometry");
      setFormError("Enter a drone name before saving.");
      window.requestAnimationFrame(() =>
        document.querySelector<HTMLInputElement>("#ms-drone-name")?.focus(),
      );
      return;
    }
    if (!geometryValid) {
      const hasPayloadErrors = Object.keys(geometryErrors).some((key) =>
        key.startsWith("payload."),
      );
      setTab(hasPayloadErrors ? "payloads" : "geometry");
      setFormError("Fix the highlighted geometry fields before saving.");
      window.requestAnimationFrame(() =>
        document.querySelector<HTMLElement>("[aria-invalid='true']")?.focus(),
      );
      return;
    }
    onSave({
      ...draft,
      name: draft.name.trim(),
      profileCode: draft.profileCode?.trim() ?? "",
      geometry,
      onboarding: draft.onboarding ?? DEFAULT_DRONE_ONBOARDING_DATA,
    });
  };

  const pageTitle =
    mode === "create" ? "Add drone" : `Edit ${profile?.name ?? draft.name}`;

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => {
        const nextTab = String(value);
        if (isEditorTab(nextTab)) setTab(nextTab);
      }}
      className="w-full max-w-none gap-0"
    >
      <LibraryPageLayout
        titleId="ms-drone-editor-title"
        sectionClassName="grid min-w-0 grid-cols-1 gap-6 bg-(--canvas) xl:grid-cols-[minmax(0,1fr)_minmax(24rem,0.8fr)]"
        header={
          <PageHeader
            className="sticky top-0 z-20 p-6 pb-0"
            data-testid="ms-drone-editor-header"
            title={
              <span
                id="ms-drone-editor-title"
                data-testid="ms-lib-page-header-copy"
              >
                {pageTitle}
              </span>
            }
            toolbar={
              <div
                className="inline-flex items-center justify-end gap-2 shrink-0"
                data-testid="ms-lib-page-header-actions"
              >
                {formError && (
                  <span
                    role="status"
                    aria-live="polite"
                    className="text-sm text-destructive"
                  >
                    {formError}
                  </span>
                )}
                <Button type="button" variant="secondary" onClick={onCancel}>
                  Cancel
                </Button>
                <Button type="button" variant="default" onClick={submit}>
                  Save
                </Button>
              </div>
            }
          >
            <TabsList aria-label="Drone editor sections" className="border-0">
              <TabsTab value="geometry">Geometry</TabsTab>
              <TabsTab value="payloads">Payloads &amp; sensors</TabsTab>
              <TabsTab value="calibration">Calibration</TabsTab>
              <TabsTab value="appearance">Appearance</TabsTab>
              <TabsTab value="flight-tuning">Flight tuning</TabsTab>
              <TabsTab value="manual-pid">Manual PID</TabsTab>
            </TabsList>
          </PageHeader>
        }
      >
        <div className="order-last min-w-0 xl:order-none xl:col-start-1 xl:row-start-1">
          <TabsPanel value="geometry" className="flex flex-col gap-4">
            <DroneGeometryFields
              geometry={geometry}
              displayName={draft.name}
              profileCode={draft.profileCode ?? ""}
              errors={geometryErrors}
              onPatch={patchGeometry}
              onPatchProfile={patchDraft}
            />
          </TabsPanel>
          <TabsPanel value="payloads" className="flex flex-col gap-4">
            <DronePayloadFields
              geometry={geometry}
              errors={geometryErrors}
              onAddPayload={() =>
                patchGeometry(
                  withDronePayloads(geometry, [
                    ...getDronePayloads(geometry),
                    {
                      id: onboardingRecordId("payload"),
                      name: `Payload ${getDronePayloads(geometry).length + 1}`,
                      description: "",
                      massKg: 0.2,
                      boxX: 0.1,
                      boxY: 0.08,
                      boxZ: 0.055,
                      positionX: 0,
                      positionY: 0,
                      positionZ: -0.08,
                    },
                  ]),
                )
              }
              onRemovePayload={(index) =>
                patchGeometry(
                  withDronePayloads(
                    geometry,
                    getDronePayloads(geometry).filter(
                      (_payload, payloadIndex) => payloadIndex !== index,
                    ),
                  ),
                )
              }
              onPatchPayload={(index, patch) =>
                patchGeometry(
                  withDronePayloads(
                    geometry,
                    getDronePayloads(geometry).map((payload, payloadIndex) =>
                      payloadIndex === index
                        ? { ...payload, ...patch }
                        : payload,
                    ),
                  ),
                )
              }
            />
            <DroneOnboardingFields
              section="sensors"
              data={draft.onboarding ?? DEFAULT_DRONE_ONBOARDING_DATA}
              totalMassKg={massKg}
              onPatch={patchOnboarding}
              onAddSensor={addSensor}
              onRemoveSensor={removeSensor}
              onPatchSensor={patchSensor}
            />
          </TabsPanel>
          <TabsPanel value="calibration" className="flex flex-col gap-4">
            <DroneOnboardingFields
              section="calibration"
              data={draft.onboarding ?? DEFAULT_DRONE_ONBOARDING_DATA}
              totalMassKg={massKg}
              onPatch={patchOnboarding}
              onAddSensor={addSensor}
              onRemoveSensor={removeSensor}
              onPatchSensor={patchSensor}
            />
          </TabsPanel>
          <TabsPanel value="appearance" className="flex flex-col gap-4">
            <DroneOnboardingFields
              section="appearance"
              data={draft.onboarding ?? DEFAULT_DRONE_ONBOARDING_DATA}
              totalMassKg={massKg}
              onPatch={patchOnboarding}
              onAddSensor={addSensor}
              onRemoveSensor={removeSensor}
              onPatchSensor={patchSensor}
            />
          </TabsPanel>
          <TabsPanel value="flight-tuning" className="flex flex-col gap-4">
            <DroneFlightTuningFields />
          </TabsPanel>
          <TabsPanel value="manual-pid" className="flex flex-col gap-4">
            <DroneManualPidFields
              gains={
                draft.onboarding?.manualPid ??
                DEFAULT_DRONE_ONBOARDING_DATA.manualPid
              }
              onChange={(manualPid) => patchOnboarding({ manualPid })}
            />
          </TabsPanel>
        </div>
        <DronePreviewPanel
          geometry={previewGeometry}
          geometryValid={geometryValid}
          massKg={massKg}
          payloadMassKg={payloadMassKg}
          thrustRatio={thrustRatio}
          view={view}
          setView={setView}
          resetKey={resetKey}
          setResetKey={setResetKey}
        />
      </LibraryPageLayout>
    </Tabs>
  );
}
