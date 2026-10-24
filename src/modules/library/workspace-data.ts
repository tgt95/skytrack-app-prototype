import { STORAGE_KEYS } from '../../shared/storage-keys'

export interface WorkspaceWorld {
  id: string
  name: string
  type: '2D' | '3D'
  location: string
}

export interface WorkspaceDrone {
  id: string
  name: string
  model: string
  status: string
}

export interface WorkspaceDefinition {
  id: string
  name: string
  role: 'Admin' | 'Member'
  worlds: WorkspaceWorld[]
  drones: WorkspaceDrone[]
  aiModels: string[]
}

export interface SharedMissionFixture {
  id: string
  name: string
  worldType: '2D' | '3D'
  world: string
  editedAgo: string
}

export interface SharedProjectFixture {
  id: string
  name: string
  owner: string
  ownerInitials: string
  workspace: string
  sharedAgo: string
  missions: SharedMissionFixture[]
}

export const DEFAULT_WORKSPACE_ID = 'tuan-workspace'
export const ACTIVE_WORKSPACE_STORAGE_KEY = STORAGE_KEYS.activeWorkspace

export const WORKSPACES: WorkspaceDefinition[] = [
  {
    id: DEFAULT_WORKSPACE_ID,
    name: 'Tuan’s workspace',
    role: 'Admin',
    worlds: [
      { id: 'blank-space', name: 'Blank space', type: '2D', location: 'No terrain source' },
      { id: 'field-terrain', name: 'Field terrain', type: '3D', location: 'Redlands, CA' }
    ],
    drones: [
      { id: 'mini-pro-v6', name: 'Mini Pro V6', model: 'Multirotor · camera payload', status: 'Ready' },
      { id: 'matrice-4e', name: 'Matrice 4E', model: 'Enterprise · mapping payload', status: 'Ready' }
    ],
    aiModels: ['Roof inspection v1', 'Solar panel detector']
  },
  {
    id: 'survey-operations',
    name: 'Survey operations',
    role: 'Member',
    worlds: [
      { id: 'quarry-terrain', name: 'Quarry terrain', type: '3D', location: 'Benton County' },
      { id: 'coastal-world', name: 'Coastal world', type: '3D', location: 'Portland, ME' }
    ],
    drones: [
      { id: 'mavic-3-enterprise', name: 'Mavic 3 Enterprise', model: 'DJI · mapping payload', status: 'Ready' }
    ],
    aiModels: ['Coastal building segmentation']
  }
]

export const SHARED_PROJECTS: SharedProjectFixture[] = [
  {
    id: 'coastal-mapping',
    name: 'Coastal mapping',
    owner: 'Maya Nguyen',
    ownerInitials: 'MN',
    workspace: 'Coastal survey',
    sharedAgo: 'Shared yesterday',
    missions: [
      { id: 'harbor-orthomosaic', name: 'Harbor orthomosaic', worldType: '2D', world: 'Blank space', editedAgo: 'Edited 2 hours ago' }
    ]
  },
  {
    id: 'infrastructure-lab',
    name: 'Infrastructure lab',
    owner: 'Minh Tran',
    ownerInitials: 'MT',
    workspace: 'Engineering operations',
    sharedAgo: 'Shared 3 days ago',
    missions: [
      { id: 'north-bridge-model', name: 'North bridge model', worldType: '3D', world: 'North bridge world', editedAgo: 'Edited yesterday' }
    ]
  }
]

export function getWorkspace(id: string | null | undefined): WorkspaceDefinition {
  return WORKSPACES.find((workspace) => workspace.id === id) ?? WORKSPACES[0]
}

export function getSharedProject(id: string | null | undefined): SharedProjectFixture | null {
  return SHARED_PROJECTS.find((project) => project.id === id) ?? null
}

export function readActiveWorkspaceId(): string {
  try {
    return getWorkspace(localStorage.getItem(ACTIVE_WORKSPACE_STORAGE_KEY)).id
  } catch {
    return DEFAULT_WORKSPACE_ID
  }
}

export function saveActiveWorkspaceId(id: string): void {
  try {
    localStorage.setItem(ACTIVE_WORKSPACE_STORAGE_KEY, getWorkspace(id).id)
  } catch {
    /* Workspace switching remains available for this view when storage is unavailable. */
  }
}
