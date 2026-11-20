import { useState } from "react";
import type { StudioMission, WindEnvironmentSettings } from "@/domain/mission-model";
import { windEnvironmentOf } from "@/domain/mission-model";
import { WindEnvironmentSettingsPage } from "./wind-environment-settings-page";
import { MissionSettingsToastHost, notifyMissionSettingsApplied } from "./mission-settings-toast";

export function WindEnvironmentSettingsSubpage({
  mission,
  onUpdateMission,
  onWindPreviewChange,
  onClose,
}: {
  mission: StudioMission;
  onUpdateMission: (next: StudioMission, label?: string) => void;
  onWindPreviewChange: (value: WindEnvironmentSettings | null) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(() => ({ ...windEnvironmentOf(mission) }));
  const apply = () => {
    onUpdateMission({ ...mission, windEnvironment: { ...draft } }, "Wind environment settings updated.");
    onWindPreviewChange(null);
    notifyMissionSettingsApplied();
    onClose();
  };

  return (
    <>
      <MissionSettingsToastHost />
      <WindEnvironmentSettingsPage
        value={draft}
        onChange={(next) => {
          setDraft(next);
          onWindPreviewChange(next);
        }}
        onCancel={onClose}
        onApply={apply}
      />
    </>
  );
}
