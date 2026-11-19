import type { LibProject } from "./store";

export function ensureSeededMission(
  projects: LibProject[],
  seededProjects: LibProject[],
  missionId: string,
): LibProject[] {
  const seedProject = seededProjects.find((project) =>
    project.missions.some((mission) => mission.id === missionId),
  );
  const seedMission = seedProject?.missions.find(
    (mission) => mission.id === missionId,
  );
  if (!seedProject || !seedMission) return projects;

  const existingMission = projects
    .flatMap((project) => project.missions)
    .find((mission) => mission.id === missionId);
  if (existingMission) {
    return projects.map((project) => ({
      ...project,
      missions: project.missions.map((mission) =>
        mission.id === missionId
          ? {
              ...seedMission,
              ...mission,
              missionData: mission.missionData ?? seedMission.missionData,
            }
          : mission,
      ),
    }));
  }

  const existingProject = projects.find(
    (project) => project.id === seedProject.id,
  );
  if (!existingProject) return [...projects, seedProject];

  return projects.map((project) =>
    project.id === seedProject.id
      ? {
          ...project,
          name:
            project.name === "Default project"
              ? seedProject.name
              : project.name,
          missions: [...project.missions, seedMission],
        }
      : project,
  );
}
