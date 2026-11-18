import { useState } from "react";
import type { StudioMission } from "@/domain/mission-model";
import { windEnvironmentOf } from "@/domain/mission-model";
import { WindEnvironmentSettingsPage } from "./wind-environment-settings-page";
import { MissionSettingsToastHost, notifyMissionSettingsApplied } from "./mission-settings-toast";

export function WindEnvironmentSettingsSubpage({
  mission,
  onUpdateMission,
  onClose,
}: {
  mission: StudioMission;
  onUpdateMission: (next: StudioMission, label?: string) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(() => ({ ...windEnvironmentOf(mission) }));
  const apply = () => {
    onUpdateMission({ ...mission, windEnvironment: { ...draft } }, "Wind environment settings updated.");
    notifyMissionSettingsApplied();
    onClose();
  };

  return (
    <>
      <MissionSettingsToastHost />
      <WindEnvironmentSettingsPage
        value={draft}
        onChange={setDraft}
        onCancel={onClose}
        onApply={apply}
      />
    </>
  );
}
