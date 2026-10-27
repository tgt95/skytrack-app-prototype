/* design-panel.tsx — right inspector for the Design stage: route card,
   waypoint/END sequence, zones, validation, mission props, code view. */

import { memo, useState } from "react";
import { Tabs, TabsIndicator, TabsList, TabsTab } from "skytrack-ui/tabs";
import {
  type CameraActionKind,
  type MissionArea,
  type SceneSelection,
  type StudioMission,
  type ValidationIssue,
} from "../../domain/mission-model";
import type { DerivedTransfer } from "../../domain/transfer-planner";
import MissionPreview from "../simulation/mission-preview";
import { ReconSettingsPage } from "./reconnaissance-inspector";
import { DesignSequenceBlocks } from "./design-sequence-blocks";
import MissionSettingsCard, {
  MissionChecksCard,
} from "./mission-settings-card";
import CodeInspectorPanel from "./code-inspector-panel";
import type { AIModelCardModel } from "../../ui/components/ai-model-card";
import AvoidInspectorCard from "./avoid-inspector-card";
import type { SequenceDropPosition } from "./sequence-drag";
import useDesignPanelState from "./use-design-panel-state";
export { ZoneDraftPanel } from "./zone-draft-panel";

export interface DesignPanelProps {
  mission: StudioMission;
  worldType: "2D" | "3D";
  transfers: DerivedTransfer[];
  issues: ValidationIssue[];
  selection: SceneSelection | null;
  codeView: boolean;
  previewView: boolean;
  codeDraft: string;
  codeLang: "python" | "json";
  aiModels: AIModelCardModel[];
  aiModelsOpen: boolean;
  selectedAIModelId: string | null;
  onAIModelsOpenChange: (open: boolean) => void;
  onSelectAIModel: (modelId: string | null) => void;
  onImportAIModel: () => void;
  jsonDraft: string;
  jsonError: string | null;
  onCodeViewChange: (code: boolean) => void;
  onPreviewViewChange: (preview: boolean) => void;
  onCodeDraftChange: (text: string) => void;
  onCodeLangChange: (lang: "python" | "json") => void;
  onJsonDraftChange: (text: string) => void;
  onApplyJson: () => void;
  onExportJson: () => void;
  onSelect: (sel: SceneSelection | null) => void;
  onUpdateMission: (next: StudioMission, label?: string) => void;
  onPreviewMission: (next: StudioMission) => void;
  onCommitPreview: (next: StudioMission, label?: string) => void;
  onCancelPreview: () => void;
  onDetailEditStateChange: (active: boolean) => void;
  onAddWaypoint: (routeId?: string) => void;
  onDeleteRoute: (routeId: string) => void;
  onDeleteWaypoint: (id: string) => void;
  onMoveWaypoint: (id: string, dir: -1 | 1) => void;
  onReorderWaypoint: (id: string, toIndex: number) => void;
  onMoveAction: (
    fromWpId: string,
    actionId: string,
    toWpId: string,
    toActionId?: string,
    position?: SequenceDropPosition,
  ) => void;
  onInsertActionAt: (
    wpId: string,
    actionIndex: number,
    kind: CameraActionKind,
  ) => void;
  onDeleteAction: (wpId: string, actionId: string) => void;
  onAddZone: (kind: "area" | "avoid") => void;
  onDeleteZone: (kind: "area" | "avoid", id: string) => void;
  onRenameZone: (kind: "area" | "avoid", id: string, label: string) => void;
  onCollapsePane: () => void;
  onAnnounce: (text: string) => void;
  previewPositionRef: { current: { x: number; y: number; z: number } | null };
  previewCaptureRef: { current: string | null };
}

function DesignPanel(props: DesignPanelProps) {
  const {
    mission,
    worldType,
    issues,
    selection,
    codeView,
    previewView,
    codeDraft,
    codeLang,
    aiModelsOpen,
    onAIModelsOpenChange,
    jsonDraft,
    jsonError,
    onCodeViewChange,
    onPreviewViewChange,
    onCodeDraftChange,
    onCodeLangChange,
    onJsonDraftChange,
    onApplyJson,
    onExportJson,
    onSelect,
    onUpdateMission,
    onPreviewMission,
    onCommitPreview,
    onCancelPreview,
    onDetailEditStateChange,
    onDeleteRoute,
    onDeleteWaypoint,
    onReorderWaypoint,
    onMoveAction,
    onInsertActionAt,
    onDeleteAction,
    onDeleteZone,
    onAnnounce,
    previewPositionRef,
    previewCaptureRef,
  } = props;
  const missionSettingsTooltip =
    "These settings are packaged into the mission file and sent to the drone. They govern how the drone executes the route autonomously in the field.";

  const {
    routes,
    missionSequence,
    isFinalSequenceItem,
    transferFrom,
    isCollapsed,
    toggleCollapsed,
    editingAreaId,
    setEditingAreaId,
    editingAvoidId,
    setEditingAvoidId,
    areaDraft,
    setAreaDraft,
    avoidDraft,
    setAvoidDraft,
    reconTarget,
    reconDraft,
    openReconSettings,
    updateReconDraft,
    cancelReconSettings,
    commitReconSettings,
    routeRecon,
    areaRecon,
    toggleRouteRecon,
    updateActionPitch,
    grabValid,
    orderedWaypoints,
    pickUpWaypoint,
    previewMoveWaypoint,
    dropPreviewWaypoint,
    cancelPreviewWaypoint,
  } = useDesignPanelState(props);
  const [settingsOpen, setSettingsOpen] = useState(true);

  if (reconTarget !== null) {
    return (
      <ReconSettingsPage
        codeView={codeView}
        target={reconTarget}
        value={reconDraft}
        onChange={updateReconDraft}
        onBack={cancelReconSettings}
        onCancel={cancelReconSettings}
        onSave={commitReconSettings}
      />
    );
  }

  const startAreaEdit = (area: MissionArea) => {
    if (editingAvoidId) onCancelPreview();
    setEditingAvoidId(null);
    setAvoidDraft(null);
    onDetailEditStateChange(true);
    setEditingAreaId(area.id);
    setAreaDraft({
      ...area,
      lineSpacingM: area.lineSpacingM ?? 6,
      orientationDeg: area.orientationDeg ?? 0,
      paddingM: area.paddingM ?? 0,
    });
  };

  const previewAreaDraft = (areaId: string, nextDraft: MissionArea) => {
    setAreaDraft(nextDraft);
    onPreviewMission({
      ...mission,
      areas: mission.areas.map((item) =>
        item.id === areaId ? nextDraft : item,
      ),
    });
  };

  const cancelAreaEdit = () => {
    onCancelPreview();
    setEditingAreaId(null);
    setAreaDraft(null);
    onDetailEditStateChange(false);
  };

  const commitAreaEdit = (areaId: string, nextDraft: MissionArea) => {
    onCommitPreview(
      {
        ...mission,
        areas: mission.areas.map((item) =>
          item.id === areaId ? nextDraft : item,
        ),
      },
      "Area scan settings committed.",
    );
    setEditingAreaId(null);
    setAreaDraft(null);
    onDetailEditStateChange(false);
  };

  return (
    <div
      className={`ms-inspector${codeView ? " ms-inspector-code" : ""}`}
      data-testid="ms-design-panel"
    >
      <div className="ms-inspector-main flex min-h-0 flex-1 flex-col">
        {/* Pane tabs: Design, Code and the photogrammetry route Preview. */}
        <div className="ms-pane-head sticky top-0 bg-(--card) z-2 in-[.ms-inspector]:bg-(--card)">
          <div
            className="ms-pane-tabs flex items-center justify-between gap-2 p-3 min-h-16 border-b border-border"
            data-testid="ms-pane-tabs"
          >
            <Tabs
              value={codeView ? "code" : previewView ? "preview" : "visual"}
              onValueChange={(v: unknown) => {
                const value = String(v);
                onPreviewViewChange(value === "preview");
                onCodeViewChange(value === "code");
              }}
              aria-label="Mission panel view"
              className=" text-[0.75rem]"
            >
              <TabsList variant="filled">
                <TabsTab value="visual">Design</TabsTab>
                <TabsTab
                  value="code"
                  disabled={editingAreaId !== null || editingAvoidId !== null}
                >
                  Code
                </TabsTab>
                <TabsTab
                  value="preview"
                  disabled={editingAreaId !== null || editingAvoidId !== null}
                >
                  Preview
                </TabsTab>
                <TabsIndicator variant="pill" />
              </TabsList>
            </Tabs>
          </div>
          {!codeView &&
            !previewView &&
            editingAreaId === null &&
            editingAvoidId === null && (
              <MissionSettingsCard
                mission={mission}
                open={settingsOpen}
                tooltip={missionSettingsTooltip}
                onOpenChange={setSettingsOpen}
                onUpdateMission={onUpdateMission}
                onAnnounce={onAnnounce}
              />
            )}
        </div>

        <div className="p-3 min-h-0 h-full">
          {codeView ? (
            <CodeInspectorPanel
              codeLang={codeLang}
              aiModelsOpen={aiModelsOpen}
              codeDraft={codeDraft}
              jsonDraft={jsonDraft}
              jsonError={jsonError}
              onCodeLangChange={onCodeLangChange}
              onAIModelsOpenChange={onAIModelsOpenChange}
              onCodeDraftChange={onCodeDraftChange}
              onJsonDraftChange={onJsonDraftChange}
              onApplyJson={onApplyJson}
              onExportJson={onExportJson}
            />
          ) : previewView ? (
            <MissionPreview
              mission={mission}
              onSelectWaypoint={(id) => onSelect({ kind: "waypoint", id })}
              previewPositionRef={previewPositionRef}
              previewCaptureRef={previewCaptureRef}
            />
          ) : (
            <>
              <DesignSequenceBlocks
                mission={mission}
                worldType={worldType}
                selection={selection}
                missionSequence={missionSequence}
                routes={routes}
                orderedWaypoints={orderedWaypoints}
                grabbedWaypointId={grabValid?.id ?? null}
                editingAreaId={editingAreaId}
                editingAvoidId={editingAvoidId}
                areaDraft={areaDraft}
                isCollapsed={isCollapsed}
                toggleCollapsed={toggleCollapsed}
                routeRecon={routeRecon}
                areaRecon={areaRecon}
                transferFrom={transferFrom}
                isFinalSequenceItem={isFinalSequenceItem}
                onToggleRouteRecon={toggleRouteRecon}
                onOpenRecon={openReconSettings}
                onUpdateMission={onUpdateMission}
                onSelect={onSelect}
                onDeleteRoute={onDeleteRoute}
                onDeleteWaypoint={onDeleteWaypoint}
                onReorderWaypoint={onReorderWaypoint}
                onMoveAction={onMoveAction}
                onInsertActionAt={onInsertActionAt}
                onDeleteAction={onDeleteAction}
                onDeleteZone={onDeleteZone}
                onAnnounce={onAnnounce}
                onPickUpWaypoint={pickUpWaypoint}
                onPreviewMoveWaypoint={previewMoveWaypoint}
                onDropPreviewWaypoint={dropPreviewWaypoint}
                onCancelPreviewWaypoint={cancelPreviewWaypoint}
                updateActionPitch={updateActionPitch}
                onStartAreaEdit={startAreaEdit}
                onPreviewAreaDraft={previewAreaDraft}
                onCancelAreaEdit={cancelAreaEdit}
                onCommitAreaEdit={commitAreaEdit}
              />

              {mission.avoids
                .filter(
                  (zone) =>
                    editingAreaId === null &&
                    (editingAvoidId === null || editingAvoidId === zone.id),
                )
                .map((zone) => (
                  <AvoidInspectorCard
                    key={zone.id}
                    zone={zone}
                    draft={avoidDraft?.id === zone.id ? avoidDraft : zone}
                    editing={editingAvoidId === zone.id}
                    onEdit={() => {
                      if (editingAreaId) onCancelPreview();
                      setEditingAreaId(null);
                      setAreaDraft(null);
                      onDetailEditStateChange(true);
                      setEditingAvoidId(zone.id);
                      setAvoidDraft({
                        ...zone,
                        type: zone.type ?? "obstacle",
                        heightM: zone.heightM ?? 15,
                        clearanceM: zone.clearanceM ?? 2,
                      });
                    }}
                    onDelete={() => onDeleteZone("avoid", zone.id)}
                    onPreviewDraft={(nextDraft) => {
                      setAvoidDraft(nextDraft);
                      onPreviewMission({
                        ...mission,
                        avoids: mission.avoids.map((item) =>
                          item.id === zone.id ? nextDraft : item,
                        ),
                      });
                    }}
                    onCancelEdit={() => {
                      onCancelPreview();
                      setEditingAvoidId(null);
                      setAvoidDraft(null);
                      onDetailEditStateChange(false);
                    }}
                    onCommitEdit={(nextDraft) => {
                      onCommitPreview(
                        {
                          ...mission,
                          avoids: mission.avoids.map((item) =>
                            item.id === zone.id ? nextDraft : item,
                          ),
                        },
                        "Avoid zone updated.",
                      );
                      setEditingAvoidId(null);
                      setAvoidDraft(null);
                      onDetailEditStateChange(false);
                    }}
                  />
                ))}

              <MissionChecksCard
                issues={issues}
                hidden={editingAreaId !== null || editingAvoidId !== null}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(DesignPanel);
