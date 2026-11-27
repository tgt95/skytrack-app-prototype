import { useEffect, useMemo, useState } from "react";
import { Button } from "skytrack-ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "skytrack-ui/card";
import { PageHeader } from "skytrack-ui/page-header";
import { Tabs, TabsList, TabsPanel, TabsTab } from "skytrack-ui/tabs";
import { LibraryPageLayout } from "@/features/library/cards/library-presentation";
import {
  DEFAULT_DRONE_GEOMETRY,
  droneGeometryMass,
  droneGeometryThrustRatio,
  validateDroneGeometry,
  type DroneGeometry,
} from "@/domain/drone-geometry";
import {
  newDroneHardwareComponent,
  type DroneHardwareComponent,
  type DroneHardwareSpecification,
  type WorkspaceDroneProfile,
} from "@/features/library/database/drone-store";
import { DronePerformanceSourceSection } from "./drone-performance-source-section";
import { DronePlatformSection } from "./drone-platform-section";
import { DroneHardwareSection } from "./drone-hardware-section";
import { DroneGeometryFields } from "./drone-geometry-fields";
import { DronePreview } from "./preview/drone-preview";

type EditorTab = "geometry" | "profile" | "components";

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <Card as="div" size="sm">
      <CardContent className="flex flex-col gap-1">
        <span className="text-muted-foreground">{label}</span>
        <strong>{value}</strong>
      </CardContent>
    </Card>
  );
}

function componentId(): string {
  return `component-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function specificationId(): string {
  return `spec-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
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
  const thrustRatio = droneGeometryThrustRatio(previewGeometry);

  if (!draft) return null;

  const patchDraft = (patch: Partial<WorkspaceDroneProfile>) =>
    setDraft((current) => (current ? { ...current, ...patch } : current));
  const patchGeometry = (patch: Partial<DroneGeometry>) => {
    const next = { ...geometry, ...patch };
    setGeometry(next);
    if (Object.keys(validateDroneGeometry(next)).length === 0)
      setLastValidGeometry(next);
    setFormError("");
  };
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
    componentIdValue: string,
    id: string,
    patch: Partial<DroneHardwareSpecification>,
  ) => {
    setDraft((current) =>
      current
        ? {
            ...current,
            components: current.components.map((item) =>
              item.id === componentIdValue
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
  const addSpecification = (componentIdValue: string) => {
    setDraft((current) =>
      current
        ? {
            ...current,
            components: current.components.map((item) =>
              item.id === componentIdValue
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
  const removeSpecification = (componentIdValue: string, id: string) => {
    setDraft((current) =>
      current
        ? {
            ...current,
            components: current.components.map((item) =>
              item.id === componentIdValue
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
  const submit = () => {
    if (!draft.name.trim()) {
      setTab("profile");
      setFormError("Enter a drone name before saving.");
      window.requestAnimationFrame(() =>
        document.querySelector<HTMLInputElement>("#ms-drone-name")?.focus(),
      );
      return;
    }
    if (!geometryValid) {
      setTab("geometry");
      setFormError("Fix the highlighted geometry fields before saving.");
      window.requestAnimationFrame(() =>
        document.querySelector<HTMLElement>("[aria-invalid='true']")?.focus(),
      );
      return;
    }
    onSave({ ...draft, name: draft.name.trim(), geometry });
  };

  const pageTitle =
    mode === "create" ? "Add drone" : `Edit ${profile?.name ?? draft.name}`;

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => setTab(String(value) as EditorTab)}
      className="w-full max-w-none gap-0"
    >
      <LibraryPageLayout
        titleId="ms-drone-editor-title"
        sectionClassName="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(24rem,1fr)]"
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
              <TabsTab value="profile">Profile &amp; performance</TabsTab>
              <TabsTab value="components">
                Hardware components ({draft.components.length})
              </TabsTab>
            </TabsList>
          </PageHeader>
        }
      >
        <div className="order-last min-w-0 xl:order-none xl:col-start-1 xl:row-start-1">
          <TabsPanel value="geometry" className="flex flex-col gap-4">
            <DroneGeometryFields
              geometry={geometry}
              errors={geometryErrors}
              onPatch={patchGeometry}
              onAddPayload={() =>
                patchGeometry({
                  payload: {
                    massKg: 0.2,
                    boxX: 0.1,
                    boxY: 0.08,
                    boxZ: 0.055,
                    positionX: 0,
                    positionY: 0,
                    positionZ: -0.08,
                  },
                })
              }
              onRemovePayload={() => patchGeometry({ payload: null })}
            />
          </TabsPanel>
          <TabsPanel value="profile" className="flex flex-col gap-6">
            <DronePlatformSection profile={draft} onPatch={patchDraft} />
            <DronePerformanceSourceSection
              profile={draft}
              onPatch={patchDraft}
            />
          </TabsPanel>
          <TabsPanel value="components" className="flex flex-col gap-4">
            <DroneHardwareSection
              components={draft.components}
              onAddComponent={addComponent}
              onRemoveComponent={removeComponent}
              onPatchComponent={patchComponent}
              onAddSpecification={addSpecification}
              onPatchSpecification={patchSpecification}
              onRemoveSpecification={removeSpecification}
            />
          </TabsPanel>
        </div>
        <aside
          className="order-first min-w-0 xl:order-none xl:col-start-2 xl:row-start-1 xl:sticky xl:top-32 xl:self-start"
          aria-label="Live drone preview"
        >
          <Card as="section">
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <CardTitle as="h2">3D preview</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setView("isometric");
                  setResetKey((key) => key + 1);
                }}
              >
                Reset view
              </Button>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="relative aspect-video min-h-72 overflow-hidden rounded-(--radius) border border-border bg-muted">
                <DronePreview
                  profile={previewGeometry}
                  viewMode={view}
                  resetKey={resetKey}
                />
                {!geometryValid && (
                  <div
                    className="absolute bottom-14 right-4 rounded-(--radius) border border-warning bg-background/90 px-2 py-1 text-sm text-warning"
                    role="status"
                  >
                    Preview shows last valid geometry
                  </div>
                )}
                <Tabs
                  value={view}
                  onValueChange={(value) =>
                    setView(String(value) as typeof view)
                  }
                  className="absolute bottom-2 left-2 w-fit gap-0"
                >
                  <TabsList variant="filled" aria-label="Preview view">
                    <TabsTab value="isometric">Isometric</TabsTab>
                    <TabsTab value="top">Top</TabsTab>
                    <TabsTab value="front">Front</TabsTab>
                  </TabsList>
                </Tabs>
              </div>
              <p className="m-0 text-muted-foreground">
                Drag to orbit · Shift/Command/Control-drag to pan · Alt-drag to
                adjust pitch · Scroll to zoom
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <StatTile
                  label="Total mass"
                  value={`${massKg.toFixed(2)} kg`}
                />
                <StatTile
                  label="Thrust / weight"
                  value={`${thrustRatio.toFixed(2)}×`}
                />
                <StatTile
                  label="Thrust reserve"
                  value={`${Math.max(0, Math.min(100, (1 - 1 / thrustRatio) * 100)).toFixed(0)}%`}
                />
              </div>
            </CardContent>
          </Card>
        </aside>
      </LibraryPageLayout>
    </Tabs>
  );
}
