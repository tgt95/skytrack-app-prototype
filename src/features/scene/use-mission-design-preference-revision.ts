import { useEffect, useState } from "react";
import { MISSION_DESIGN_PREFERENCES_CHANGE_EVENT } from "@/shared/mission-design-preferences";

export function useMissionDesignPreferenceRevision() {
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const updatePreferences = () =>
      setRevision((currentRevision) => currentRevision + 1);
    window.addEventListener(
      MISSION_DESIGN_PREFERENCES_CHANGE_EVENT,
      updatePreferences,
    );
    return () =>
      window.removeEventListener(
        MISSION_DESIGN_PREFERENCES_CHANGE_EVENT,
        updatePreferences,
      );
  }, []);

  return revision;
}
