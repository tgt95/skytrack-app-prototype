export interface LibraryEntry {
  missionId: string
  projectId: string
  project: string
  mission: string
  world?: string
  worldType?: '2D' | '3D'
  worldId?: string
  vehicle?: string
  droneId?: string
  workspaceId?: string
}

export type LibrarySection =
  | 'home'
  | 'recent'
  | 'projects'
  | 'worlds'
  | 'drones'
  | 'starred'
  | 'shared'
  | 'learn'
  | 'templates'
  | 'docs'
  | 'aimodels'
  | 'logs'
  | 'notifications'
