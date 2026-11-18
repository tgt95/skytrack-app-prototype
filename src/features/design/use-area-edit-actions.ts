import type { MissionArea, StudioMission } from "@/domain/mission-model";

interface UseAreaEditActionsOptions {
  mission: StudioMission;
  editingAvoidId: string | null;
  onCancelPreview: () => void;
  onDetailEditStateChange: (active: boolean) => void;
  onPreviewMission: (next: StudioMission) => void;
  onCommitPreview: (next: StudioMission, label?: string) => void;
  setEditingAreaId: (id: string | null) => void;
  setEditingAvoidId: (id: string | null) => void;
  setAreaDraft: (area: MissionArea | null) => void;
  setAvoidDraft: (avoid: null) => void;
}

export function useAreaEditActions({
  mission,
  editingAvoidId,
  onCancelPreview,
  onDetailEditStateChange,
  onPreviewMission,
  onCommitPreview,
  setEditingAreaId,
  setEditingAvoidId,
  setAreaDraft,
  setAvoidDraft,
}: UseAreaEditActionsOptions) {
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
      areas: mission.areas.map((area) =>
        area.id === areaId ? nextDraft : area,
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
        areas: mission.areas.map((area) =>
          area.id === areaId ? nextDraft : area,
        ),
      },
      "Area scan settings committed.",
    );
    setEditingAreaId(null);
    setAreaDraft(null);
    onDetailEditStateChange(false);
  };

  return { startAreaEdit, previewAreaDraft, cancelAreaEdit, commitAreaEdit };
}
