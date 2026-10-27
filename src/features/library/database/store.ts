/* modules/library/database/store.ts — local JSON-backed repository for the Mission Library.
   No backend in this prototype. How it works:
   - Seeds live in `modules/library/database/*.json` — edit them directly to change the
     demo data. They are bundled at build time.
   - Every mutation is auto-persisted to `localStorage` (JSON, same shape),
     so edits/starred/created items survive reloads.
   - "Export JSON" downloads the current state; copy it back into the seed
     files to promote runtime edits into seeds.
   - Clear the `skytrack-library-db-v1` localStorage key (or wipe site data)
     to fall back to seeds. */

import projectsSeed from './projects.json'
import templatesSeed from './templates.json'
import { getWorkspace } from '../workspace/workspace-data.ts'
import { STORAGE_KEYS, STORAGE_VERSIONS } from '../../../shared/storage-keys'

export interface LibMission {
  id: string
  name: string
  editedAgo: string
  starred: boolean
  shared: boolean
  viewOnly: boolean
  world?: string
  worldType?: '2D' | '3D'
  worldId?: string
  vehicle?: string
  droneId?: string
  /** Canonical Studio mission snapshot saved locally by the Design Save action. */
  missionData?: string
}

export interface LibProject {
  id: string
  name: string
  workspaceId?: string
  missions: LibMission[]
}

export interface LibTemplate {
  id: string
  title: string
  desc: string
  byline: string
}

export const DB_KEY = STORAGE_KEYS.libraryDatabase
export const DB_VERSION = STORAGE_VERSIONS.libraryDatabase

interface DatabaseShape {
  version: number
  projects: LibProject[]
}

function isMission(value: unknown): value is LibMission {
  const m = value as Partial<LibMission>
  return (
    typeof m === 'object' &&
    m !== null &&
    typeof m.id === 'string' &&
    typeof m.name === 'string' &&
    typeof m.editedAgo === 'string' &&
    typeof m.starred === 'boolean' &&
    typeof m.shared === 'boolean' &&
    typeof m.viewOnly === 'boolean' &&
    (m.world === undefined || typeof m.world === 'string') &&
    (m.worldType === undefined || m.worldType === '2D' || m.worldType === '3D') &&
    (m.vehicle === undefined || typeof m.vehicle === 'string') &&
    (m.droneId === undefined || (typeof m.droneId === 'string' && m.droneId.length <= 128)) &&
    (m.worldId === undefined || (typeof m.worldId === 'string' && m.worldId.length <= 128)) &&
    (m.missionData === undefined || typeof m.missionData === 'string')
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isProject(value: unknown): value is LibProject {
  const p = value as Partial<LibProject>
  return (
    typeof p === 'object' &&
    p !== null &&
    typeof p.id === 'string' &&
    typeof p.name === 'string' &&
    (p.workspaceId === undefined || typeof p.workspaceId === 'string') &&
    Array.isArray(p.missions) &&
    p.missions.every(isMission)
  )
}

function isDatabase(value: unknown): value is DatabaseShape {
  return isRecord(value) && value.version === DB_VERSION &&
    Array.isArray(value.projects) && value.projects.every(isProject)
}

function parseSnapshotMetadata(raw: string | undefined): Record<string, unknown> | null {
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw) as unknown
    return isRecord(parsed) ? parsed : null
  } catch {
    return null
  }
}

function seedProjects(): LibProject[] {
  return Array.isArray(projectsSeed) && projectsSeed.every(isProject)
    ? (projectsSeed as LibProject[])
    : []
}

function normalizeProjects(projects: LibProject[]): LibProject[] {
  const seededMissionById = new Map(
    seedProjects().flatMap((project) => project.missions.map((mission) => [mission.id, mission] as const))
  )
  return projects.map((project) => ({
    ...project,
    workspaceId: getWorkspace(project.workspaceId).id,
    missions: project.missions.map((mission) => {
      const seeded = seededMissionById.get(mission.id)
      const snapshot = parseSnapshotMetadata(mission.missionData)
      const snapshotWorldType = snapshot?.worldType === '2D' || snapshot?.worldType === '3D' ? snapshot.worldType : undefined
      const snapshotWorld = typeof snapshot?.world === 'string' ? snapshot.world : undefined
      const snapshotWorldId = typeof snapshot?.worldId === 'string' ? snapshot.worldId : undefined
      const snapshotVehicle = typeof snapshot?.vehicle === 'string' ? snapshot.vehicle : undefined
      const snapshotDroneId = typeof snapshot?.droneId === 'string' ? snapshot.droneId : undefined
      return {
        ...mission,
        worldType: mission.worldType ?? snapshotWorldType ?? seeded?.worldType,
        world: mission.world ?? snapshotWorld ?? seeded?.world,
        worldId: mission.worldId ?? snapshotWorldId,
        vehicle: mission.vehicle ?? snapshotVehicle ?? seeded?.vehicle,
        droneId: mission.droneId ?? snapshotDroneId
      }
    })
  }))
}

export function seedTemplates(): LibTemplate[] {
  return Array.isArray(templatesSeed) ? (templatesSeed as LibTemplate[]) : []
}

/** Load persisted state, falling back to the JSON seeds. Never throws. */
export function loadProjects(): LibProject[] {
  try {
    const raw = localStorage.getItem(DB_KEY)
    if (raw) {
      const parsed: unknown = JSON.parse(raw) as unknown
      if (isDatabase(parsed)) {
        return normalizeProjects(parsed.projects)
      }
    }
  } catch {
    /* storage unavailable or corrupt: fall through to seeds */
  }
  return normalizeProjects(seedProjects())
}

/** Find the owning project and mission for a stable Library mission ID. */
export function findMissionRecord(
  projects: LibProject[],
  missionId: string
): { project: LibProject; mission: LibMission } | null {
  for (const project of projects) {
    const mission = project.missions.find((item) => item.id === missionId)
    if (mission) return { project, mission }
  }
  return null
}

/** Persist the current state. Returns false if browser storage is unavailable. */
export function saveProjects(projects: LibProject[]): boolean {
  try {
    const shape: DatabaseShape = { version: DB_VERSION, projects: normalizeProjects(projects) }
    localStorage.setItem(DB_KEY, JSON.stringify(shape))
    return true
  } catch {
    return false
  }
}

/** Save a complete Studio snapshot into the matching local Library record. */
export function saveMissionSnapshot(
  missionId: string,
  missionData: string,
  metadata: Pick<LibMission, 'name' | 'world' | 'worldType' | 'worldId' | 'vehicle' | 'droneId'>
): boolean {
  const projects = loadProjects()
  let found = false
  const next = projects.map((project) => ({
    ...project,
    missions: project.missions.map((mission) => {
      if (mission.id !== missionId) return mission
      found = true
      return {
        ...mission,
        ...metadata,
        missionData,
        editedAgo: 'Edited just now'
      }
    })
  }))
  return found && saveProjects(next)
}

/** Keep a cloned snapshot's internal identity aligned with its new Library ID. */
export function cloneMissionSnapshotIdentity(
  missionData: string | undefined,
  missionId: string,
  name: string
): string | undefined {
  if (!missionData) return undefined
  try {
    const parsed: unknown = JSON.parse(missionData) as unknown
    if (!isRecord(parsed)) return undefined
    const mission = parsed
    return JSON.stringify({ ...mission, id: missionId, name })
  } catch {
    return undefined
  }
}

/** Forget persisted state so seeds load again. Never throws. */
export function clearProjects(): void {
  try {
    localStorage.removeItem(DB_KEY)
  } catch {
    /* ignore */
  }
}

/** Download the current state as JSON (promote into seeds by hand). */
export function exportProjects(projects: LibProject[]): void {
  const shape: DatabaseShape & { exportedAt: string } = {
    version: DB_VERSION,
    projects,
    exportedAt: new Date().toISOString()
  }
  const blob = new Blob([JSON.stringify(shape, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'skytrack-library.json'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
