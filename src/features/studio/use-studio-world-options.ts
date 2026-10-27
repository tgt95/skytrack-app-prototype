import { useCallback, useMemo, useState } from "react";
import type { StudioMission } from "../../domain/mission-model";
import type { MissionWorldOption } from "./studio-dialogs";
import type { MissionStudioRoute } from "../library/router";
import {
  loadWorkspaceResources,
  saveWorkspaceResources,
  selectableWorldsForWorkspace,
  worldsForWorkspace,
  type WorkspaceResourceState,
  type WorkspaceWorldRecord,
} from "../library/database/workspace-resources-store";

export function useStudioWorldOptions({
  mission,
  workspaceId,
  route,
}: {
  mission: StudioMission;
  workspaceId: string;
  route: MissionStudioRoute;
}) {
  const [worldsRevision, setWorldsRevision] = useState(0);
  const selectableMissionWorlds = useMemo<WorkspaceWorldRecord[]>(
    () => selectableWorldsForWorkspace(workspaceId),
    [workspaceId, route, worldsRevision],
  );
  const missionWorldOptions = useMemo<MissionWorldOption[]>(() => {
    if (
      !mission.world ||
      selectableMissionWorlds.some(
        (world) => world.id === mission.worldId || world.name === mission.world,
      )
    ) {
      return selectableMissionWorlds;
    }

    const archivedWorld = worldsForWorkspace(workspaceId).find((world) =>
      mission.worldId
        ? world.id === mission.worldId
        : world.name === mission.world,
    );
    if (archivedWorld) {
      return [
        ...selectableMissionWorlds,
        { ...archivedWorld, status: "Legacy" as const },
      ];
    }

    return [
      ...selectableMissionWorlds,
      {
        id: mission.worldId ?? `legacy-world:${encodeURIComponent(mission.world)}`,
        workspaceId,
        name: mission.world,
        location: "",
        status: "Legacy" as const,
        sourceType: "none" as const,
        sourceMissionId: "",
        sourceMissionLabel: "",
        sourceFlightReference: "",
        reconstructionReference: "",
        note: "",
      },
    ];
  }, [mission.world, mission.worldId, selectableMissionWorlds, workspaceId]);
  const persistImportedWorld = useCallback((world: WorkspaceWorldRecord) => {
    const current: WorkspaceResourceState = loadWorkspaceResources();
    const next: WorkspaceResourceState = {
      ...current,
      worlds: [
        ...current.worlds.filter((item) => item.id !== world.id),
        world,
      ],
    };
    if (!saveWorkspaceResources(next)) return false;
    setWorldsRevision((revision) => revision + 1);
    return true;
  }, []);

  return {
    selectableMissionWorlds,
    missionWorldOptions,
    persistImportedWorld,
  };
}
