/* library.tsx — route-local Home / Projects / Project-detail shell for Mission Studio.
   Source evidence (all FACT unless noted):
   - App bundle routes: /home, /projects, /projects/:id, /starred-missions,
     /shared-with-me, /templates, /template/:templateId,
     /mission/:missionId, /shared-accounts/:missionId
     (renderer asset index-DPH7FYaV.js in /tmp/skytrack-asar-inspect.4JSf7T).
   - Sidebar: Home; group "Projects": Workspace Projects, Starred Missions
     (disabled when none), Shared with me (disabled when none); group
     "Resources": Learn (external https://getskytrack.com/help/category/
     get-builders-insights), Mission templates, Documentation (disabled).
     Discord card dismiss persists in sessionStorage; org footer opens the
     account menu (/account).
   - Home: PageTitle "Missions created by me" + dashed NewItemButton
     "New Mission" + MissionCardItem grid; then "Mission templates" +
     helper "Learn SkyTrack with Mission templates" + ghost "View all ->"
     to /templates + template grid preview (first 8 of 10); then a Learn
     preview block (below-fold in captures — UNVERIFIED layout, plausible).
   - Mission card: inline title (maxLength 120), "Edited <relative>", "View
     shared accounts" link (-> /shared-accounts/:id), Star/Unstar
     aria-labels, overflow menu (Open/Rename/Clone/Share/Delete),
     "View only" badge for non-owners. Delete confirm: "Delete Mission?"
     / Do you want to delete the "<name>" mission? (destructive). Clone
     toast: "Mission has been cloned".
   - Mission update dialog: "Update Mission", field "Mission title"
     (maxLength 120, autofocus, Enter submits), Cancel + "Save" (disabled
     when empty/unchanged), success surfaced as live-region announce text
     "Mission has been updated".
   - Projects: breadcrumb Home › Workspace Projects; PageTitle "Workspace
     Projects" + primary "+ New Project" (entry projects_header);
     ProjectCardItem grid; project detail breadcrumb adds the project name,
     header + New Mission button (entry project_detail), new missions
     prepend, empty project shows a dashed NewItemButton "New Mission".
   - ProjectCreationDialog: "New Project"/"Update Project", desc "Create
     project to manage your missions", field "Project title" (maxLength
     120), Cancel + Create/Update (disabled when empty/unchanged).
     Delete confirm: "Delete Project?" / Do you want to delete the
     "<name>" project? This action can't be reversed.
   - Starred empty state: Box icon, "No starred missions yet" /
     "Star a mission from a project to keep it close at hand."
   - Shared-with-me empty state: Box icon, "No missions have been shared
     with you yet" / "Missions shared with your account will appear here."
     Error state offers "Try again".
   - Templates page: PageTitle + helper + debounced (500ms) "Search
     templates" textbox + `N result(s) for "keyword"`; skeleton cards while
     loading.
   - ShareMissionDialog: email field (maxLength 254, invalid shows "Enter a
     valid email address"), Permission select with only "View only",
     Cancel + "Share Mission".
   - Home template titles/descriptions below are pixel-observed from live
     captures 08/10-home (v1.2.17); bottom-row descriptions were truncated
     in-capture and are completed here as explicitly mocked copy.
   Local state only (no backend). Icons are Phosphor, controls are
   skytrack-ui, styling uses semantic tokens only. Prototype chrome that is
   NOT the real shell: top bar ("Local preview" badge, "Restart to update"
   mock) and sidebar brand (full SkyTrack logo).
   Success feedback uses the parent live-region announce, not Toast UI. */

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeftIcon,
  ArrowSquareOutIcon,
  BellIcon,
  BookOpenIcon,
  CaretDownIcon,
  CaretRightIcon,
  CheckIcon,
  ClockIcon,
  DesktopIcon,
  DotsThreeVerticalIcon,
  DroneIcon,
  DownloadIcon,
  FoldersIcon,
  FolderIcon,
  GearIcon,
  GlobeHemisphereWestIcon,
  HouseIcon,
  MoonIcon,
  PackageIcon,
  PlusIcon,
  ScrollIcon,
  SignOutIcon,
  ShareNetworkIcon,
  SquaresFourIcon,
  StarIcon,
  SunIcon,
  UserIcon,
  UsersIcon,
  XIcon
} from '@phosphor-icons/react'
import { Badge } from 'skytrack-ui/badge'
import { Button } from 'skytrack-ui/button'
import { Tabs, TabsIndicator, TabsList, TabsPanel, TabsTab } from 'skytrack-ui/tabs'
import {
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPopup,
  DialogPortal,
  DialogTitle
} from 'skytrack-ui/dialog'
import { FieldControl, FieldLabel, FieldRoot } from 'skytrack-ui/field'
import {
  Menu,
  MenuItem,
  MenuPopup,
  MenuPortal,
  MenuPositioner,
  MenuSeparator,
  MenuSubmenuRoot,
  MenuSubmenuTrigger,
  MenuTrigger
} from 'skytrack-ui/menu'
import skytrackLogo from '../../assets/skytrack-logo.svg'
import MissionThumbnail from './mission-thumbnail'
import { getTemplateThumbnail } from './template-thumbnails'
import {
  exportProjects,
  loadProjects,
  saveProjects,
  cloneMissionSnapshotIdentity,
  seedTemplates,
  type LibMission,
  type LibProject,
  type LibTemplate
} from './database/store'
import {
  loadDroneProfiles,
  newDroneProfile,
  saveDroneProfiles,
  type WorkspaceDroneProfile
} from './database/drone-store'
import {
  loadWorkspaceResources,
  newWorkspaceWorld,
  saveWorkspaceResources,
  selectableWorldsForWorkspace,
  type WorkspaceAIModelRecord,
  type WorkspaceResourceState,
  type WorkspaceWorldRecord
} from './database/workspace-resources-store'
import DroneProfileDialog from './drone-profile-dialog'
import { WorldProfileDialog } from './workspace-resource-dialogs'
import { ImportAIModelDialog } from './import-ai-model-dialog'
import {
  DEFAULT_WORKSPACE_ID,
  getSharedProject,
  getWorkspace,
  readActiveWorkspaceId,
  saveActiveWorkspaceId,
  SHARED_PROJECTS,
  WORKSPACES
} from './workspace-data'
import CreateMissionWizard, { type WizardResult } from './create-wizard'
import { CloneProjectPicker, MissionDialog, ProjectDialog, ShareDialog } from './library-dialogs'
import { AccountMenuDialogs, type AccountMenuPanel } from './account-menu-dialogs'
import {
  readAccountProfile,
  readNotificationPreferences,
  saveAccountProfile,
  saveNotificationPreferences,
  type AccountProfile,
  type NotificationPreferences
} from './account-menu-state'
import { applyThemePreference, readThemePreference, saveThemePreference, type ThemePreference } from '../../theme-preference'

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

export type LibrarySection = 'home' | 'recent' | 'projects' | 'worlds' | 'drones' | 'starred' | 'shared' | 'learn' | 'templates' | 'docs' | 'aimodels' | 'logs' | 'notifications'

/* Seeds live in `modules/library/database/*.json` (see `modules/library/database/store.ts`); the
   pixel-observed notes moved there with the data. */
const TEMPLATES: LibTemplate[] = seedTemplates()

const LEARN_URL = 'https://getskytrack.com/help/category/get-builders-insights'
const LEARN_FEATURED = {
  title: 'Use simulation effectively when building autonomous missions',
  desc: 'How simulation fits into a responsible mission-building workflow.',
  url: 'https://getskytrack.com/en/resources/how-to-use-simulation-effectively-when-building-autonomous-missions-en-394'
}

function getUserInitial(name: string): string {
  const firstWord = name.trim().split(/\s+/u)[0]
  return firstWord?.[0]?.toLocaleUpperCase() ?? '?'
}

const NAV_MAIN: { id: LibrarySection; label: string; icon: typeof HouseIcon }[] = [
  { id: 'home', label: 'Home', icon: HouseIcon },
  { id: 'recent', label: 'Recent', icon: ClockIcon },
  { id: 'shared', label: 'Shared with me', icon: ShareNetworkIcon }
]

let localId = 100
function nextId(prefix: string): string {
  localId += 1
  /* Timestamp prefix keeps ids unique across reloads now that state
     persists in localStorage. */
  return `${prefix}-local-${Date.now().toString(36)}-${localId}`
}

export default function StudioLibrary({
  section,
  projectId,
  templateId,
  sharedMissionId,
  sharedProjectId,
  current,
  onNavigate,
  onOpenTemplate,
  onOpenSharedAccounts,
  onOpenSharedProject,
  onOpenMission,
  onAnnounce
}: {
  section: LibrarySection
  projectId: string | null
  templateId: string | null
  sharedMissionId: string | null
  sharedProjectId: string | null
  current: LibraryEntry | null
  onNavigate: (next: LibrarySection, nextProjectId: string | null) => void
  onOpenTemplate: (templateId: string | null) => void
  onOpenSharedAccounts: (missionId: string | null) => void
  onOpenSharedProject: (projectId: string | null) => void
  onOpenMission: (entry: LibraryEntry) => void
  onAnnounce: (text: string) => void
}) {
  const [projects, setProjects] = useState<LibProject[]>(loadProjects)
  const [droneProfiles, setDroneProfiles] = useState<WorkspaceDroneProfile[]>(loadDroneProfiles)
  const [workspaceResources, setWorkspaceResources] = useState<WorkspaceResourceState>(loadWorkspaceResources)
  const [aiModelCategory, setAIModelCategory] = useState('workspace')
  const [accountProfile, setAccountProfile] = useState<AccountProfile>(readAccountProfile)
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>(readNotificationPreferences)
  const [accountPanel, setAccountPanel] = useState<AccountMenuPanel | null>(null)
  const [themePreference, setThemePreference] = useState<ThemePreference>(readThemePreference)
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(readActiveWorkspaceId)
  const activeWorkspace = getWorkspace(activeWorkspaceId)
  const workspaceProjects = useMemo(
    () => projects.filter((project) => (project.workspaceId ?? DEFAULT_WORKSPACE_ID) === activeWorkspace.id),
    [activeWorkspace.id, projects]
  )
  const workspaceDrones = useMemo(
    () => droneProfiles.filter((profile) => profile.workspaceId === activeWorkspace.id),
    [activeWorkspace.id, droneProfiles]
  )
  const workspaceWorlds = useMemo(
    () => workspaceResources.worlds.filter((world) => world.workspaceId === activeWorkspace.id),
    [activeWorkspace.id, workspaceResources.worlds]
  )
  const workspaceAIModels = useMemo(
    () => workspaceResources.aiModels.filter((model) => model.workspaceId === activeWorkspace.id && model.origin !== 'user-upload'),
    [activeWorkspace.id, workspaceResources.aiModels]
  )
  const uploadedAIModels = useMemo(
    () => workspaceResources.aiModels.filter((model) => model.workspaceId === activeWorkspace.id && model.origin === 'user-upload'),
    [activeWorkspace.id, workspaceResources.aiModels]
  )
  const projectsRef = useRef<LibProject[]>(projects)
  projectsRef.current = projects
  const droneProfilesRef = useRef<WorkspaceDroneProfile[]>(droneProfiles)
  droneProfilesRef.current = droneProfiles
  const workspaceResourcesRef = useRef<WorkspaceResourceState>(workspaceResources)
  workspaceResourcesRef.current = workspaceResources
  const commitProjects = (next: LibProject[]) => {
    if (!saveProjects(next)) {
      onAnnounce('This change could not be saved in this browser. Check browser storage and try again.')
      return false
    }
    projectsRef.current = next
    setProjects(next)
    return true
  }
  const commitDroneProfiles = (next: WorkspaceDroneProfile[]) => {
    if (!saveDroneProfiles(next)) {
      onAnnounce('Drone profile could not be saved in this browser. Check browser storage and try again.')
      return false
    }
    droneProfilesRef.current = next
    setDroneProfiles(next)
    return true
  }
  const commitWorkspaceResources = (next: WorkspaceResourceState) => {
    if (!saveWorkspaceResources(next)) {
      onAnnounce('Workspace resource could not be saved in this browser. Check browser storage and try again.')
      return false
    }
    workspaceResourcesRef.current = next
    setWorkspaceResources(next)
    return true
  }
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [missionDlg, setMissionDlg] = useState<{
    mode: 'rename'
    projectId: string
    missionId: string
    initialName: string
  } | null>(null)
  const [projectDlg, setProjectDlg] = useState<{ mode: 'create' } | { mode: 'rename'; projectId: string; initialName: string } | null>(null)
  const [shareDlg, setShareDlg] = useState<{ projectId: string; missionId: string; name: string } | null>(null)
  const [deleteMission, setDeleteMission] = useState<{ projectId: string; missionId: string; name: string } | null>(null)
  const [deleteProject, setDeleteProject] = useState<{ projectId: string; name: string; missionCount: number } | null>(null)
  const [droneEditor, setDroneEditor] = useState<{ mode: 'create' | 'edit'; profile: WorkspaceDroneProfile } | null>(null)
  const [deleteDroneId, setDeleteDroneId] = useState<string | null>(null)
  const [worldEditor, setWorldEditor] = useState<{ mode: 'create' | 'edit'; profile: WorkspaceWorldRecord } | null>(null)
  const [deleteWorldId, setDeleteWorldId] = useState<string | null>(null)
  const [importModelOpen, setImportModelOpen] = useState(false)
  const [deleteModelId, setDeleteModelId] = useState<string | null>(null)
  const [cloneTarget, setCloneTarget] = useState<{ missionId: string; name: string } | null>(null)
  /* Create-mission wizard (Figma 631:29818): remounted per open via key so
     each run starts at step 1 with route-specific defaults. */
  const [wizardOpen, setWizardOpen] = useState(false)
  const [wizardKey, setWizardKey] = useState(0)
  const [wizardSeed, setWizardSeed] = useState({ projectId: '', title: '' })
  const [discordClosed, setDiscordClosed] = useState(() => {
    try {
      return sessionStorage.getItem('ms-lib-discord-closed') === '1'
    } catch {
      return false
    }
  })

  const updateAccountProfile = (name: string): boolean => {
    const next = { ...accountProfile, name: name.trim() }
    if (!next.name) return false
    if (!saveAccountProfile(next)) {
      onAnnounce('Display name could not be saved in this browser.')
      return false
    }
    setAccountProfile(next)
    onAnnounce('Display name saved on this browser.')
    return true
  }

  const updateNotificationPreferences = (next: NotificationPreferences) => {
    setNotificationPreferences(next)
    if (!saveNotificationPreferences(next)) {
      onAnnounce('Notification preferences could not be saved in this browser.')
    }
  }

  const updateThemePreference = (next: ThemePreference) => {
    setThemePreference(next)
    applyThemePreference(next)
    if (!saveThemePreference(next)) {
      onAnnounce('Theme changed, but the preference could not be saved in this browser.')
    } else {
      onAnnounce(`${next === 'system' ? 'System' : next === 'dark' ? 'Dark' : 'Light'} theme selected.`)
    }
  }

  /* Templates search is debounced 500ms in the real app. */
  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(query), 500)
    return () => window.clearTimeout(t)
  }, [query])

  const homeMissions = useMemo(
    () =>
      workspaceProjects.flatMap((p) =>
        p.missions.map((m) => ({ projectId: p.id, project: p.name, mission: m }))
      ),
    [workspaceProjects]
  )
  const starredMissions = useMemo(
    () => homeMissions.filter((e) => e.mission.starred),
    [homeMissions]
  )
  const filteredTemplates = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase()
    if (!q) return TEMPLATES
    return TEMPLATES.filter(
      (t) => t.title.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q)
    )
  }, [debouncedQuery])

  const activeProject = projectId ? (workspaceProjects.find((p) => p.id === projectId) ?? null) : null
  const activeTemplate = templateId ? (TEMPLATES.find((t) => t.id === templateId) ?? null) : null
  const activeSharedProject = sharedProjectId ? getSharedProject(sharedProjectId) : null
  const sharedMissionRecord = sharedMissionId
    ? projects.flatMap((project) => project.missions.map((mission) => ({ project, mission })))
      .find((record) => record.mission.id === sharedMissionId)
    : null
  const sharedView = sharedMissionRecord
    ? { project: sharedMissionRecord.project.name, mission: sharedMissionRecord.mission.name }
    : null
  const droneToDelete = droneProfiles.find((profile) => profile.id === deleteDroneId) ?? null
  const deleteDroneReferences = droneToDelete
    ? projects.flatMap((project) => {
      if ((project.workspaceId ?? DEFAULT_WORKSPACE_ID) !== droneToDelete.workspaceId) return []
      return project.missions.flatMap((mission) => {
        let snapshot: Record<string, unknown> | null = null
        try {
          snapshot = mission.missionData ? JSON.parse(mission.missionData) as Record<string, unknown> : null
        } catch {
          snapshot = null
        }
        const referencedId = mission.droneId ?? (typeof snapshot?.droneId === 'string' ? snapshot.droneId : undefined)
        const referencedName = mission.vehicle ?? (typeof snapshot?.vehicle === 'string' ? snapshot.vehicle : undefined)
        const matches = referencedId === droneToDelete.id || (
          !referencedId && Boolean(referencedName) &&
          [droneToDelete.name, ...droneToDelete.legacyLabels].includes(referencedName as string)
        )
        return matches ? [{ project: project.name, mission: mission.name }] : []
      })
    })
    : []
  const worldToDelete = workspaceWorlds.find((world) => world.id === deleteWorldId) ?? null
  const deleteWorldReferences = worldToDelete
    ? projects.flatMap((project) => {
      if ((project.workspaceId ?? DEFAULT_WORKSPACE_ID) !== worldToDelete.workspaceId) return []
      return project.missions.flatMap((mission) => {
        let snapshot: Record<string, unknown> | null = null
        try {
          snapshot = mission.missionData ? JSON.parse(mission.missionData) as Record<string, unknown> : null
        } catch {
          snapshot = null
        }
        const referencedId = mission.worldId ?? (typeof snapshot?.worldId === 'string' ? snapshot.worldId : undefined)
        const matches = referencedId ? referencedId === worldToDelete.id : mission.world === worldToDelete.name
        return matches ? [{ project: project.name, mission: mission.name }] : []
      })
    })
    : []
  const modelToDelete = uploadedAIModels.find((model) => model.id === deleteModelId) ?? null
  const sourceMissions = workspaceProjects.flatMap((project) => project.missions
    .filter((mission) => mission.worldType === '2D')
    .map((mission) => ({ id: mission.id, projectName: project.name, missionName: mission.name })))

  const openCreateWizard = (targetProjectId = workspaceProjects[0]?.id ?? '', title = '') => {
    setWizardSeed({ projectId: targetProjectId, title })
    setWizardKey((key) => key + 1)
    setWizardOpen(true)
  }

  const goto = (next: LibrarySection) => {
    onNavigate(next, null)
    onAnnounce(`${next === 'home' ? 'Home' : next}. Local preview.`)
  }

  const openProject = (id: string) => {
    onNavigate('projects', id)
    const p = projects.find((item) => item.id === id)
    onAnnounce(`Project ${p?.name ?? ''} opened. ${p?.missions.length ?? 0} missions.`)
  }

  const switchWorkspace = (id: string) => {
    const nextWorkspace = getWorkspace(id)
    setActiveWorkspaceId(nextWorkspace.id)
    saveActiveWorkspaceId(nextWorkspace.id)
    onNavigate('projects', null)
    onAnnounce(`${nextWorkspace.name} selected. Workspace resources updated.`)
  }

  const openMission = (projectIdOf: string, projectName: string, missionId: string) => {
    const owner = projectsRef.current.find((project) => project.id === projectIdOf)
    const item = owner?.missions.find((entry) => entry.id === missionId)
    if (!item) return
    onOpenMission({
      missionId: item.id,
      projectId: projectIdOf,
      project: projectName,
      mission: item.name,
      workspaceId: owner?.workspaceId ?? DEFAULT_WORKSPACE_ID,
      droneId: item.droneId,
      vehicle: item.vehicle,
      world: item.world,
      worldType: item.worldType,
      worldId: item.worldId
    })
  }

  const toggleStar = (pid: string, mid: string) => {
    const current = projectsRef.current
    const target = current.find((p) => p.id === pid)?.missions.find((m) => m.id === mid)
    if (!target) return
    const saved = commitProjects(
      current.map((p) =>
        p.id !== pid
          ? p
          : {
            ...p,
            missions: p.missions.map((m) => (m.id === mid ? { ...m, starred: !m.starred } : m))
          }
      )
    )
    if (!saved) return
    onAnnounce(target?.starred ? `Unstarred ${target.name}.` : `Starred ${target?.name ?? 'mission'}.`)
  }

  const submitMissionDlg = (title: string) => {
    if (!missionDlg) return
    const saved = commitProjects(
      projectsRef.current.map((p) =>
        p.id !== missionDlg.projectId
          ? p
          : { ...p, missions: p.missions.map((m) => (m.id === missionDlg.missionId ? { ...m, name: title } : m)) }
      )
    )
    if (!saved) return
    onAnnounce('Mission has been updated')
    setMissionDlg(null)
  }

  const submitProjectDlg = (title: string) => {
    if (projectDlg && projectDlg.mode === 'rename') {
      const saved = commitProjects(
        projectsRef.current.map((p) => (p.id === projectDlg.projectId ? { ...p, name: title } : p))
      )
      if (!saved) return
      onAnnounce('Project has been updated')
      setProjectDlg(null)
      return
    }
    const fresh: LibProject = { id: nextId('p'), name: title, workspaceId: activeWorkspace.id, missions: [] }
    if (!commitProjects([...projectsRef.current, fresh])) return
    onAnnounce(`Project ${title} created locally.`)
    setProjectDlg(null)
  }

  const confirmDeleteMission = () => {
    if (!deleteMission) return
    const saved = commitProjects(
      projectsRef.current.map((p) =>
        p.id !== deleteMission.projectId
          ? p
          : { ...p, missions: p.missions.filter((m) => m.id !== deleteMission.missionId) }
      )
    )
    if (!saved) return
    onAnnounce('Mission has been deleted')
    setDeleteMission(null)
  }

  const confirmDeleteProject = () => {
    if (!deleteProject) return
    if (!commitProjects(projectsRef.current.filter((p) => p.id !== deleteProject.projectId))) return
    if (projectId === deleteProject.projectId) onNavigate('projects', null)
    onAnnounce('Project has been deleted')
    setDeleteProject(null)
  }

  const cloneMission = (targetProjectId: string) => {
    if (!cloneTarget) return
    const current = projectsRef.current
    const source = current.flatMap((p) => p.missions.map((m) => ({ p, m }))).find((e) => e.m.id === cloneTarget.missionId)
    if (!source) {
      setCloneTarget(null)
      return
    }
    const copyId = nextId('m')
    const copyName = `${source.m.name} (copy)`
    const copy: LibMission = {
      ...source.m,
      id: copyId,
      name: copyName,
      missionData: cloneMissionSnapshotIdentity(source.m.missionData, copyId, copyName),
      editedAgo: 'Edited just now',
      starred: false,
      shared: false
    }
    if (!commitProjects(current.map((p) => (p.id === targetProjectId ? { ...p, missions: [copy, ...p.missions] } : p)))) return
    onAnnounce('Mission has been cloned')
    setCloneTarget(null)
  }

  const submitWizard = (result: WizardResult) => {
    const fresh: LibMission = {
      id: nextId('m'),
      name: result.title,
      editedAgo: 'Edited just now',
      starred: false,
      shared: false,
      viewOnly: false,
      world: result.world,
      worldType: result.worldType,
      ...(result.worldId ? { worldId: result.worldId } : {}),
      vehicle: result.vehicle,
      droneId: result.droneId
    }
    /* Save the JSON before navigating; opening the mission unmounts Library
       in the same commit. */
    const current = projectsRef.current
    const target = current.find((p) => p.id === result.projectId)
    const next = current.map((p) =>
      p.id === result.projectId ? { ...p, missions: [fresh, ...p.missions] } : p
    )
    if (!commitProjects(next)) return
    setWizardOpen(false)
    onAnnounce(`Mission ${result.title} created in ${target?.name ?? 'project'} (${result.world}, ${result.vehicle}).`)
    openMission(result.projectId, target?.name ?? '', fresh.id)
  }

  const saveDroneProfile = (profile: WorkspaceDroneProfile) => {
    const original = droneEditor?.profile
    const nextProfile = {
      ...profile,
      workspaceId: activeWorkspace.id,
      legacyLabels: original && original.name !== profile.name
        ? Array.from(new Set([...profile.legacyLabels, original.name]))
        : profile.legacyLabels
    }
    const next = droneEditor?.mode === 'edit'
      ? droneProfilesRef.current.map((item) => item.id === nextProfile.id ? nextProfile : item)
      : [...droneProfilesRef.current, nextProfile]
    if (!commitDroneProfiles(next)) return
    onAnnounce(droneEditor?.mode === 'edit' ? `${nextProfile.name} updated.` : `${nextProfile.name} added to ${activeWorkspace.name}.`)
    setDroneEditor(null)
  }

  const deleteDrone = () => {
    if (!deleteDroneId || deleteDroneReferences.length > 0) return
    const deleted = droneProfilesRef.current.find((profile) => profile.id === deleteDroneId)
    const next = droneProfilesRef.current.filter((profile) => profile.id !== deleteDroneId)
    if (!commitDroneProfiles(next)) return
    onAnnounce(`${deleted?.name ?? 'Drone'} deleted from ${activeWorkspace.name}.`)
    setDeleteDroneId(null)
  }

  const saveWorldProfile = (profile: WorkspaceWorldRecord) => {
    const nextProfile = { ...profile, workspaceId: activeWorkspace.id }
    const isEdit = worldEditor?.mode === 'edit'
    const nextWorlds = isEdit
      ? workspaceResourcesRef.current.worlds.map((world) => world.id === nextProfile.id ? nextProfile : world)
      : [...workspaceResourcesRef.current.worlds, nextProfile]
    if (!commitWorkspaceResources({ ...workspaceResourcesRef.current, worlds: nextWorlds })) return
    onAnnounce(isEdit ? `${nextProfile.name} updated.` : `${nextProfile.name} added to ${activeWorkspace.name}.`)
    setWorldEditor(null)
  }

  const deleteWorld = () => {
    if (!deleteWorldId || deleteWorldReferences.length > 0) return
    const nextWorlds = workspaceResourcesRef.current.worlds.filter((world) => world.id !== deleteWorldId)
    if (!commitWorkspaceResources({ ...workspaceResourcesRef.current, worlds: nextWorlds })) return
    onAnnounce('World deleted.')
    setDeleteWorldId(null)
  }

  const importAIModel = ({ name, fileName, fileSize }: { name: string; fileName: string; fileSize: number }) => {
    const importedModel: WorkspaceAIModelRecord = {
      id: nextId('ai-model'),
      workspaceId: activeWorkspace.id,
      origin: 'user-upload',
      name,
      version: '',
      task: 'Object detection',
      inputModality: '',
      compatibility: '',
      status: 'Draft',
      assetReference: fileName,
      note: 'Local preview only; package file was not uploaded or validated.',
      packageFileName: fileName,
      packageFileSize: fileSize
    }
    const nextModels = [...workspaceResourcesRef.current.aiModels, importedModel]
    if (!commitWorkspaceResources({ ...workspaceResourcesRef.current, aiModels: nextModels })) return false
    setAIModelCategory('uploaded')
    onAnnounce('AI model added to Uploaded by you. ZIP was not uploaded or validated in this preview.')
    return true
  }

  const deleteAIModel = () => {
    if (!deleteModelId || !modelToDelete) return
    const nextModels = workspaceResourcesRef.current.aiModels.filter((model) => model.id !== deleteModelId)
    if (!commitWorkspaceResources({ ...workspaceResourcesRef.current, aiModels: nextModels })) return
    onAnnounce('Imported AI model removed from this browser.')
    setDeleteModelId(null)
  }

  const shareMission = () => {
    if (!shareDlg) return
    const saved = commitProjects(
      projectsRef.current.map((p) =>
        p.id !== shareDlg.projectId
          ? p
          : { ...p, missions: p.missions.map((m) => (m.id === shareDlg.missionId ? { ...m, shared: true } : m)) }
      )
    )
    if (!saved) return
    onAnnounce('Mission shared (mock). No invite was sent.')
    setShareDlg(null)
  }

  const closeDiscord = () => {
    setDiscordClosed(true)
    try {
      sessionStorage.setItem('ms-lib-discord-closed', '1')
    } catch {
      /* storage unavailable: card simply stays dismissed for this view */
    }
    onAnnounce('Community card dismissed.')
  }

  const navBtn = (
    item: { id: LibrarySection; label: string; icon: typeof HouseIcon },
    disabled: boolean,
    disabledHint: string
  ) => {
    const Icon = item.icon
    const active = section === item.id && !sharedView
    if (disabled) {
      return (
        <button
          key={item.id}
          type='button'
          data-testid={`ms-lib-nav-${item.id}`}
          disabled
          title={disabledHint}
          className='ms-lib-navitem'
        >
          <Icon aria-hidden='true' weight='regular' />
          <span className='ms-lib-nav-label'>{item.label}</span>
        </button>
      )
    }
    return (
      <button
        key={item.id}
        type='button'
        data-testid={`ms-lib-nav-${item.id}`}
        aria-current={active ? 'page' : undefined}
        className={`ms-lib-navitem${active ? ' is-active' : ''}`}
        onClick={() => goto(item.id)}
      >
        <Icon aria-hidden='true' weight={active ? 'fill' : 'regular'} />
        <span className='ms-lib-nav-label'>{item.label}</span>
      </button>
    )
  }

  const missionContext = (mission: Pick<LibMission, 'worldType' | 'world'>) => (
    <span className='ms-lib-context-row'>
      <span className='ms-lib-context-mode'>{mission.worldType ?? '3D'}</span>
      <span className='ms-lib-context-world'>
        <GlobeHemisphereWestIcon aria-hidden='true' />
        {mission.world ?? 'Blank space'}
      </span>
    </span>
  )

  const missionCard = (pid: string, projectName: string, m: LibMission, testid: string) => {
    const isCurrent = current?.projectId === pid && current?.mission === m.name
    return (
      <article key={m.id} className={`ms-lib-card${isCurrent ? ' is-current' : ''}`} aria-label={m.name}>
        <button
          type='button'
          className='ms-lib-thumb is-mission'
          data-testid={`${testid}-open`}
          aria-label={`Open ${m.name}`}
          onClick={() => openMission(pid, projectName, m.id)}
        >
          <MissionThumbnail />
        </button>
        <span className='ms-lib-card-body'>
          <span className='ms-lib-card-toprow'>
            <button
              type='button'
              className='ms-lib-card-title is-link'
              onClick={() => openMission(pid, projectName, m.id)}
            >
              {m.name} {isCurrent ? <span className='ms-lib-current'>· Current</span> : null}
            </button>
            <span className='ms-lib-card-tools'>
              <Menu>
                <MenuTrigger
                  aria-label={`More actions for ${m.name}`}
                  data-testid={`${testid}-more`}
                  render={<Button variant='ghost' size='icon-sm' className='text-muted-foreground' />}
                >
                  <DotsThreeVerticalIcon aria-hidden='true' />
                </MenuTrigger>
                <MenuPortal>
                  <MenuPositioner side='bottom' align='end' sideOffset={4}>
                    <MenuPopup aria-label={`Actions for ${m.name}`}>
                      <MenuItem onClick={() => openMission(pid, projectName, m.id)}>Open</MenuItem>
                      {!m.viewOnly ? (
                        <MenuItem onClick={() => toggleStar(pid, m.id)}>
                          <StarIcon aria-hidden='true' weight={m.starred ? 'fill' : 'regular'} />
                          {m.starred ? 'Unstar' : 'Star'}
                        </MenuItem>
                      ) : null}
                      {!m.viewOnly ? (
                        <MenuItem
                          onClick={() =>
                            setMissionDlg({ mode: 'rename', projectId: pid, missionId: m.id, initialName: m.name })
                          }
                        >
                          Rename
                        </MenuItem>
                      ) : null}
                      {!m.viewOnly ? (
                        <MenuItem onClick={() => setCloneTarget({ missionId: m.id, name: m.name })}>Clone</MenuItem>
                      ) : null}
                      {!m.viewOnly ? (
                        <MenuItem onClick={() => setShareDlg({ projectId: pid, missionId: m.id, name: m.name })}>
                          Share
                        </MenuItem>
                      ) : null}
                      {!m.viewOnly ? (
                        <MenuItem onClick={() => setDeleteMission({ projectId: pid, missionId: m.id, name: m.name })}>
                          Delete
                        </MenuItem>
                      ) : null}
                    </MenuPopup>
                  </MenuPositioner>
                </MenuPortal>
              </Menu>
            </span>
          </span>
          {m.viewOnly ? (
            <span className='ms-lib-card-badgerow'>
              <Badge>View only</Badge>
            </span>
          ) : null}
          {missionContext(m)}
          <span className='ms-lib-card-edited'>{m.editedAgo}</span>
          {m.shared && !m.viewOnly ? (
            <button
              type='button'
              className='ms-lib-link'
              onClick={() => onOpenSharedAccounts(m.id)}
            >
              View shared accounts
            </button>
          ) : null}
        </span>
      </article>
    )
  }

  const projectCard = (p: LibProject) => (
    <article key={p.id} className='ms-lib-card' aria-label={p.name}>
      <button
        type='button'
        className='ms-lib-thumb is-project'
        data-testid={`ms-lib-project-${p.id}-open`}
        aria-label={`Open ${p.name}`}
        onClick={() => openProject(p.id)}
      >
        <FolderIcon aria-hidden='true' />
      </button>
      <span className='ms-lib-card-body'>
        <span className='ms-lib-card-toprow'>
          <button type='button' className='ms-lib-card-title is-link' onClick={() => openProject(p.id)}>
            {p.name}
          </button>
          <Menu>
            <MenuTrigger aria-label={`More actions for ${p.name}`} render={<Button variant='ghost' size='icon-sm' className='text-muted-foreground' />}>
              <DotsThreeVerticalIcon aria-hidden='true' />
            </MenuTrigger>
            <MenuPortal>
              <MenuPositioner side='bottom' align='end' sideOffset={4}>
                <MenuPopup aria-label={`Actions for ${p.name}`}>
                  <MenuItem onClick={() => openProject(p.id)}>Open</MenuItem>
                  <MenuItem onClick={() => setProjectDlg({ mode: 'rename', projectId: p.id, initialName: p.name })}>
                    Rename
                  </MenuItem>
                  <MenuItem onClick={() => setDeleteProject({ projectId: p.id, name: p.name, missionCount: p.missions.length })}>Delete</MenuItem>
                </MenuPopup>
              </MenuPositioner>
            </MenuPortal>
          </Menu>
        </span>
        <span className='ms-lib-card-edited'>
          {p.missions.length} mission{p.missions.length === 1 ? '' : 's'}
        </span>
      </span>
    </article>
  )

  const templateCard = (t: LibTemplate, testid: string, onOpen: () => void, hideMeta?: boolean) => {
    const tint = `tint-${t.id.charCodeAt(1) % 6}`
    const thumbnail = getTemplateThumbnail(t.id)
    return (
      <article key={t.id} className='ms-lib-card' aria-label={t.title}>
        <button
          type='button'
          className={`ms-lib-thumb is-template is-photo ${tint}`}
          data-testid={`${testid}-open`}
          aria-label={`Open ${t.title}`}
          onClick={onOpen}
        >
          {thumbnail ? <img src={thumbnail} alt='' aria-hidden='true' className='ms-template-thumbnail' /> : <span className='ms-lib-thumb-art' aria-hidden='true' />}
        </button>
        <span className='ms-lib-card-body'>
          <button type='button' className='ms-lib-card-title is-link' onClick={onOpen}>
            {t.title}
          </button>
          <span className='ms-lib-card-desc'>{t.desc}</span>
          {hideMeta ? null : <span className='ms-lib-card-edited'>{t.byline}</span>}
        </span>
      </article>
    )
  }

  /* Figma Home (195:13546) recent-mission card: drone thumbnail, mission
     title, design-type row, edited time. Opens the mission like missionCard
     but without star/menu chrome. */
  const recentCard = (pid: string, projectName: string, m: LibMission, testid: string) => {
    const isCurrent = current?.projectId === pid && current?.mission === m.name
    return (
      <article key={m.id} className={`ms-lib-card${isCurrent ? ' is-current' : ''}`} aria-label={`${projectName} | ${m.name}`}>
        <button
          type='button'
          className='ms-lib-thumb is-drone'
          data-testid={`${testid}-open`}
          aria-label={`Open ${m.name}`}
          onClick={() => openMission(pid, projectName, m.id)}
        >
          <MissionThumbnail />
        </button>
        <span className='ms-lib-card-body'>
          <span className='ms-lib-card-title'>
            {projectName} | {m.name} {isCurrent ? <span className='ms-lib-current'>· Current</span> : null}
          </span>
          <span className='ms-lib-card-meta'>
            {missionContext(m)}
          </span>
          <span className='ms-lib-card-edited'>{m.editedAgo}</span>
        </span>
      </article>
    )
  }

  const sharedProjectCard = (project: (typeof SHARED_PROJECTS)[number]) => (
    <article key={project.id} className='ms-lib-card' aria-label={project.name}>
      <button
        type='button'
        className='ms-lib-thumb is-project'
        data-testid={`ms-lib-shared-project-${project.id}-open`}
        aria-label={`Open shared project ${project.name}`}
        onClick={() => onOpenSharedProject(project.id)}
      >
        <FolderIcon aria-hidden='true' />
      </button>
      <span className='ms-lib-card-body'>
        <span className='ms-lib-card-toprow'>
          <button type='button' className='ms-lib-card-title is-link' onClick={() => onOpenSharedProject(project.id)}>
            {project.name}
          </button>
          <Badge>View only</Badge>
        </span>
        <span className='ms-lib-shared-owner'>
          <span className='ms-lib-avatar' aria-hidden='true'>{project.ownerInitials}</span>
          <span>{project.owner} · {project.workspace}</span>
        </span>
        <span className='ms-lib-card-edited'>{project.missions.length} mission{project.missions.length === 1 ? '' : 's'} · {project.sharedAgo}</span>
        <span className='ms-lib-shared-context'>{project.missions.map((mission) => `${mission.worldType} · ${mission.world}`).join(' / ')}</span>
      </span>
    </article>
  )

  const sharedMissionCard = (mission: (typeof SHARED_PROJECTS)[number]['missions'][number]) => (
    <article key={mission.id} className='ms-lib-card is-readonly' aria-label={mission.name}>
      <span className='ms-lib-thumb is-mission' aria-hidden='true'>
        <MissionThumbnail />
      </span>
      <span className='ms-lib-card-body'>
        <span className='ms-lib-card-toprow'>
          <span className='ms-lib-card-title'>{mission.name}</span>
          <Badge>View only</Badge>
        </span>
        {missionContext(mission)}
        <span className='ms-lib-card-edited'>{mission.editedAgo}</span>
      </span>
    </article>
  )

  const emptyState = (title: string, desc: string) => (
    <div className='ms-lib-empty' role='status'>
      <span className='ms-lib-empty-icon' aria-hidden='true'>
        <PackageIcon />
      </span>
      <p className='ms-lib-empty-title'>{title}</p>
      <p className='ms-hint'>{desc}</p>
    </div>
  )

  const openTemplateDetail = (id: string) => {
    onOpenTemplate(id)
    const t = TEMPLATES.find((item) => item.id === id)
    onAnnounce(`Template ${t?.title ?? ''} opened. Template use is a mock in this slice.`)
  }

  const useTemplate = (t: LibTemplate) => {
    const target = workspaceProjects[0]
    if (!target) {
      onAnnounce('Create a project first (mock).')
      return
    }
    onOpenTemplate(null)
    openCreateWizard(target.id, t.title)
    onAnnounce(`${t.title}. Mission name and project are prefilled; template content is mock.`)
  }

  return (
    <div className='ms-lib'>
      <p className='ms-sr' role='status' aria-live='polite' data-testid='ms-lib-announce' />
      <header className='ms-lib-top'>
        <span className='ms-lib-brand'>
          <img src={skytrackLogo} alt='' width={24} height={24} />
          <span>SkyTrack</span>
        </span>
        <span className='ms-lib-top-actions'>
          {section === 'home' && !activeProject ? (
            <Button size='sm' variant='default' data-testid='ms-lib-create' onClick={() => openCreateWizard()}>
              <PlusIcon aria-hidden='true' /> New Mission
            </Button>
          ) : null}
          <Button
            size='sm'
            variant='outline'
            data-testid='ms-lib-restart'
            title='Mock — no update service in this prototype'
            onClick={() => onAnnounce('Restart to update is a mock in this prototype. No update was checked.')}
          >
            <DownloadIcon aria-hidden='true' /> Restart to update
          </Button>
          <Button
            size='sm'
            variant='ghost'
            data-testid='ms-lib-export'
            aria-label='Export library data as JSON'
            title='Download current projects and missions as JSON (promote into modules/library/database seeds by hand)'
            onClick={() => {
              exportProjects(projects)
              onAnnounce('Library data exported as JSON.')
            }}
          >
            <ArrowSquareOutIcon aria-hidden='true' />
          </Button>
        </span>
      </header>

      <div className='ms-lib-body'>
        <nav className='ms-lib-side' aria-label='Workspace navigation'>
          <div className='ms-lib-navgroup' role='group' aria-label='Main'>
            {NAV_MAIN.map((item) => navBtn(item, false, ''))}
          </div>

          <div className='ms-lib-sidebar-divider' />
          <div className='ms-lib-navgroup' role='group' aria-label='Learning resources'>
            <a
              aria-current={section === 'learn' ? 'page' : undefined}
              className={`ms-lib-navitem${section === 'learn' ? ' is-active' : ''}`}
              data-testid='ms-lib-nav-learn'
              href={LEARN_URL}
              target='_blank'
              rel='noreferrer'
              onClick={() => onAnnounce('Learning opens SkyTrack help in a new tab.')}
            >
              <BookOpenIcon aria-hidden='true' weight={section === 'learn' ? 'fill' : 'regular'} />
              <span className='ms-lib-nav-label'>Learning</span>
              <ArrowSquareOutIcon aria-hidden='true' className='ms-lib-external' />
            </a>
            <button
              type='button'
              data-testid='ms-lib-nav-templates'
              aria-current={section === 'templates' ? 'page' : undefined}
              className={`ms-lib-navitem${section === 'templates' ? ' is-active' : ''}`}
              onClick={() => goto('templates')}
            >
              <SquaresFourIcon aria-hidden='true' weight={section === 'templates' ? 'fill' : 'regular'} />
              <span className='ms-lib-nav-label'>Mission templates</span>
            </button>
          </div>

          <div className='ms-lib-sidebar-divider' />
          <p className='ms-lib-navhead'>Starred</p>
          {starredMissions.length === 0 ? (
            <button
              type='button'
              aria-current={section === 'starred' ? 'page' : undefined}
              className={`ms-lib-navitem ms-lib-nav-empty${section === 'starred' ? ' is-active' : ''}`}
              onClick={() => goto('starred')}
            >
              <FoldersIcon aria-hidden='true' weight={section === 'starred' ? 'fill' : 'regular'} />
              <span className='ms-lib-nav-label'>No projects/missions</span>
            </button>
          ) : navBtn({ id: 'starred', label: 'Starred missions', icon: StarIcon }, false, '')}

          <div className='ms-lib-sidebar-divider' />
          <div className='ms-lib-workspace-head'>
            <div className='ms-lib-workspace-switcher'>
              <Menu>
                <MenuTrigger
                  aria-label={`Switch workspace, currently ${activeWorkspace.name}`}
                  data-testid='ms-lib-workspace-switcher'
                  render={<button type='button' className='ms-lib-workspace-select' />}
                >
                  <span className='ms-lib-workspace-avatar' aria-hidden='true'>{activeWorkspace.name.slice(0, 1)}</span>
                  <span className='ms-lib-workspace-name'>{activeWorkspace.name}</span>
                  <span className='ms-lib-workspace-caret' aria-hidden='true'><CaretDownIcon /></span>
                </MenuTrigger>
                <MenuPortal>
                  <MenuPositioner side='bottom' align='start' sideOffset={4}>
                    <MenuPopup aria-label='Workspaces'>
                      {WORKSPACES.map((workspace) => (
                        <MenuItem key={workspace.id} className='ms-lib-workspace-option' onClick={() => switchWorkspace(workspace.id)}>
                          <span className='ms-lib-workspace-option-name'>{workspace.name}</span>
                          <span className='ms-lib-workspace-option-role'>{workspace.role}</span>
                        </MenuItem>
                      ))}
                    </MenuPopup>
                  </MenuPositioner>
                </MenuPortal>
              </Menu>
              <div className='ms-lib-workspace-role'>
                <span className='ms-lib-admin'>{activeWorkspace.role}</span>
              </div>
            </div>
            <Button
              type='button'
              size='icon-xs'
              variant='ghost'
              className='ms-lib-workspace-settings'
              aria-label='Workspace settings'
              title='Workspace settings are a local prototype control.'
              onClick={() => onAnnounce(`Workspace settings for ${activeWorkspace.name} are a mock.`)}
            >
              <GearIcon aria-hidden='true' />
            </Button>
          </div>
          <div className='ms-lib-navgroup' role='group' aria-label={`${activeWorkspace.name} resources`}>
            {navBtn({ id: 'projects', label: 'Projects', icon: FoldersIcon }, false, '')}
            {navBtn({ id: 'worlds', label: 'Worlds', icon: GlobeHemisphereWestIcon }, false, '')}
            {navBtn({ id: 'drones', label: 'Drones', icon: DroneIcon }, false, '')}
            {navBtn({ id: 'aimodels', label: 'AI models', icon: PackageIcon }, false, '')}
          </div>

          <div className='ms-lib-side-foot'>
            {!discordClosed ? (
              <section className='ms-lib-community' aria-label='Join our community'>
                <div className='ms-lib-community-head'>
                  <h2>Join our community</h2>
                  <button
                    type='button'
                    aria-label='Dismiss community card'
                    className='ms-lib-x'
                    onClick={closeDiscord}
                  >
                    <XIcon aria-hidden='true' />
                  </button>
                </div>
                <p>Get setup help &amp; connect with other drone builders on Discord.</p>
                <Button
                  size='sm'
                  variant='default'
                  data-testid='ms-lib-discord'
                  onClick={() => onAnnounce('Join Discord is a mock in this prototype.')}
                >
                  <UsersIcon aria-hidden='true' /> Join Discord
                </Button>
              </section>
            ) : null}
            <button
              type='button'
              data-testid='ms-lib-nav-logs'
              aria-current={section === 'logs' ? 'page' : undefined}
              className={`ms-lib-navitem${section === 'logs' ? ' is-active' : ''}`}
              onClick={() => goto('logs')}
            >
              <ScrollIcon aria-hidden='true' weight={section === 'logs' ? 'fill' : 'regular'} />
              <span className='ms-lib-nav-label'>Logs</span>
            </button>
            <button
              type='button'
              data-testid='ms-lib-nav-notifications'
              aria-current={section === 'notifications' ? 'page' : undefined}
              className={`ms-lib-navitem${section === 'notifications' ? ' is-active' : ''}`}
              onClick={() => goto('notifications')}
            >
              <BellIcon aria-hidden='true' weight={section === 'notifications' ? 'fill' : 'regular'} />
              <span className='ms-lib-nav-label'>Notifications</span>
            </button>
            <Menu>
              <MenuTrigger
                type='button'
                className='ms-lib-profile'
                aria-label={`${accountProfile.name} account menu`}
                data-testid='ms-lib-account-trigger'
              >
                <span className='ms-lib-profile-avatar' aria-hidden='true'>{getUserInitial(accountProfile.name)}</span>
                <span className='ms-lib-nav-label'>{accountProfile.name}</span>
                <CaretDownIcon aria-hidden='true' />
              </MenuTrigger>
              <MenuPortal>
                <MenuPositioner side='right' align='end' sideOffset={8}>
                  <MenuPopup className='ms-lib-account-popup' aria-label={`${accountProfile.name} account settings`}>
                    <div className='ms-lib-account-summary'>
                      <span className='ms-lib-account-avatar' aria-hidden='true'>
                        {getUserInitial(accountProfile.name)}
                      </span>
                      <span className='ms-lib-account-identity'>
                        <strong>{accountProfile.name}</strong>
                        <span>{accountProfile.email}</span>
                      </span>
                    </div>
                    <MenuItem
                      className='ms-lib-account-item'
                      data-testid='ms-lib-account-profile'
                      onClick={() => setAccountPanel('profile')}
                    >
                      <UserIcon aria-hidden='true' /> Profile
                    </MenuItem>
                    <MenuItem
                      className='ms-lib-account-item'
                      data-testid='ms-lib-account-settings'
                      onClick={() => setAccountPanel('settings')}
                    >
                      <GearIcon aria-hidden='true' /> Account settings
                    </MenuItem>
                    <MenuSubmenuRoot>
                      <MenuSubmenuTrigger className='ms-lib-account-item' data-testid='ms-lib-account-theme'>
                        <MoonIcon aria-hidden='true' /> Theme
                      </MenuSubmenuTrigger>
                      <MenuPortal>
                        <MenuPositioner side='right' align='start' sideOffset={4}>
                          <MenuPopup aria-label='Theme options' data-testid='ms-lib-theme-options'>
                            <MenuItem data-testid='ms-lib-theme-light' onClick={() => updateThemePreference('light')}>
                              <SunIcon aria-hidden='true' /> Light {themePreference === 'light' ? <CheckIcon className='ms-lib-account-theme-check' aria-hidden='true' /> : null}
                            </MenuItem>
                            <MenuItem data-testid='ms-lib-theme-dark' onClick={() => updateThemePreference('dark')}>
                              <MoonIcon aria-hidden='true' /> Dark {themePreference === 'dark' ? <CheckIcon className='ms-lib-account-theme-check' aria-hidden='true' /> : null}
                            </MenuItem>
                            <MenuItem data-testid='ms-lib-theme-system' onClick={() => updateThemePreference('system')}>
                              <DesktopIcon aria-hidden='true' /> System {themePreference === 'system' ? <CheckIcon className='ms-lib-account-theme-check' aria-hidden='true' /> : null}
                            </MenuItem>
                          </MenuPopup>
                        </MenuPositioner>
                      </MenuPortal>
                    </MenuSubmenuRoot>
                    <MenuSeparator className='ms-lib-account-separator' />
                    <MenuItem
                      className='ms-lib-account-item'
                      data-testid='ms-lib-account-notifications'
                      onClick={() => setAccountPanel('notifications')}
                    >
                      <BellIcon aria-hidden='true' /> Notification settings
                    </MenuItem>
                    <MenuSeparator className='ms-lib-account-separator' />
                    <MenuItem
                      className='ms-lib-account-item'
                      data-testid='ms-lib-account-switch'
                      onClick={() => setAccountPanel('switch')}
                    >
                      <UsersIcon aria-hidden='true' /> Switch account
                    </MenuItem>
                    <MenuItem
                      className='ms-lib-account-item'
                      data-testid='ms-lib-account-logout'
                      onClick={() => setAccountPanel('logout')}
                    >
                      <SignOutIcon aria-hidden='true' /> Log out
                    </MenuItem>
                  </MenuPopup>
                </MenuPositioner>
              </MenuPortal>
            </Menu>
          </div>
        </nav>

        <main
          className='ms-lib-main'
          aria-label={
            sharedView ? 'Shared accounts' : activeSharedProject ? 'Shared project detail' : activeProject ? 'Project detail' : section === 'home' ? 'Home' : 'Library'
          }
        >
          {sharedView ? (
            <section aria-labelledby='ms-lib-shared-title'>
              <button type='button' className='ms-lib-back' onClick={() => onOpenSharedAccounts(null)}>
                <ArrowLeftIcon aria-hidden='true' /> Back
              </button>
              <h1 id='ms-lib-shared-title'>Shared accounts</h1>
              <p className='ms-lib-sub'>
                {sharedView.mission} · {sharedView.project}
              </p>
              <ul className='ms-lib-sharelist'>
                <li className='ms-lib-share-row'>
                  <span className='ms-lib-avatar' aria-hidden='true'>GT</span>
                  <span>
                    <span className='ms-lib-card-title'>Gia Tuấn Trinh&apos;s … (you)</span>
                    <span className='ms-lib-card-edited'>Owner · mock — sharing needs backend auth</span>
                  </span>
                </li>
              </ul>
            </section>
          ) : activeSharedProject ? (
            <section aria-labelledby='ms-lib-shared-project-title'>
              <button type='button' className='ms-lib-back' onClick={() => onOpenSharedProject(null)}>
                <ArrowLeftIcon aria-hidden='true' /> Shared with me
              </button>
              <div className='ms-lib-row'>
                <div>
                  <h1 id='ms-lib-shared-project-title'>{activeSharedProject.name}</h1>
                  <p className='ms-lib-sub'>
                    Owned by {activeSharedProject.owner} · {activeSharedProject.workspace} · {activeSharedProject.sharedAgo}
                  </p>
                </div>
                <Badge>View only</Badge>
              </div>
              <div className='ms-lib-grid' aria-label={`Missions in ${activeSharedProject.name}`}>
                {activeSharedProject.missions.map((mission) => sharedMissionCard(mission))}
              </div>
            </section>
          ) : activeProject ? (
            <section aria-labelledby='ms-lib-project-title'>
              <nav className='ms-lib-crumb' aria-label='Breadcrumb'>
                <button type='button' className='ms-lib-crumb-link' onClick={() => goto('home')}>
                  <HouseIcon aria-hidden='true' /> Home
                </button>
                <span aria-hidden='true'>›</span>
                <button type='button' className='ms-lib-crumb-link' onClick={() => onNavigate('projects', null)}>
                  Workspace Projects
                </button>
                <span aria-hidden='true'>›</span>
                <span aria-current='page'>{activeProject.name}</span>
              </nav>
              <div className='ms-lib-row'>
                <div>
                  <h1 id='ms-lib-project-title'>{activeProject.name}</h1>
                  <p className='ms-lib-sub'>
                    {activeProject.missions.length} mission{activeProject.missions.length === 1 ? '' : 's'} · {activeWorkspace.name}
                  </p>
                </div>
                <span className='ms-lib-row-actions'>
                  <Button
                    size='sm'
                    variant='default'
                    data-testid='ms-lib-new-mission'
                    onClick={() => openCreateWizard(activeProject.id)}
                  >
                    <PlusIcon aria-hidden='true' /> New Mission
                  </Button>
                  <Menu>
                    <MenuTrigger aria-label={`More actions for ${activeProject.name}`} render={<Button variant='ghost' size='icon-sm' className='text-muted-foreground' />}>
                      <DotsThreeVerticalIcon aria-hidden='true' />
                    </MenuTrigger>
                    <MenuPortal>
                      <MenuPositioner side='bottom' align='end' sideOffset={4}>
                        <MenuPopup aria-label={`Actions for ${activeProject.name}`}>
                          <MenuItem
                            onClick={() =>
                              setProjectDlg({ mode: 'rename', projectId: activeProject.id, initialName: activeProject.name })
                            }
                          >
                            Rename
                          </MenuItem>
                          <MenuItem onClick={() => setDeleteProject({ projectId: activeProject.id, name: activeProject.name, missionCount: activeProject.missions.length })}>
                            Delete
                          </MenuItem>
                        </MenuPopup>
                      </MenuPositioner>
                    </MenuPortal>
                  </Menu>
                </span>
              </div>
              {activeProject.missions.length === 0 ? (
                <div className='ms-lib-grid'>
                  <button type='button' className='ms-lib-newitem' onClick={() => openCreateWizard(activeProject.id)}>
                    <PlusIcon aria-hidden='true' />
                    New Mission
                  </button>
                </div>
              ) : (
                <div className='ms-lib-grid' aria-label='Missions in this project'>
                  {activeProject.missions.map((m) =>
                    missionCard(activeProject.id, activeProject.name, m, `ms-lib-mission-${activeProject.id}-${m.id}`)
                  )}
                </div>
              )}
            </section>
          ) : section === 'home' ? (
            <>
              <section aria-labelledby='ms-lib-recent-title'>
                <h1 id='ms-lib-recent-title'>Recent missions</h1>
                <div className='ms-lib-grid is-recent' role='list' aria-label='Recent missions'>
                  {homeMissions
                    .slice(0, 5)
                    .map((e) => recentCard(e.projectId, e.project, e.mission, `ms-lib-recent-${e.mission.id}`))}
                </div>
              </section>
              <section aria-labelledby='ms-lib-templates-title'>
                <div className='ms-lib-row'>
                  <h2 id='ms-lib-templates-title'>Mission templates</h2>
                  <button
                    type='button'
                    className='ms-lib-viewall'
                    data-testid='ms-lib-view-all'
                    onClick={() => goto('templates')}
                  >
                    View all <CaretRightIcon aria-hidden='true' />
                  </button>
                </div>
                <div className='ms-lib-grid is-templates' role='list' aria-label='Mission templates preview'>
                  {TEMPLATES.slice(0, 6).map((t) =>
                    templateCard(t, `ms-lib-template-${t.id}`, () => {
                      onNavigate('templates', null)
                      openTemplateDetail(t.id)
                    }, true)
                  )}
                </div>
              </section>
            </>
          ) : section === 'recent' ? (
            <section aria-labelledby='ms-lib-recent-page-title'>
              <h1 id='ms-lib-recent-page-title'>Recent</h1>
              {homeMissions.length === 0 ? (
                emptyState('No recent missions', 'Missions in this Workspace will appear here.')
              ) : (
                <div className='ms-lib-grid is-recent' aria-label='Recent missions'>
                  {homeMissions.map((entry) => recentCard(entry.projectId, entry.project, entry.mission, `ms-lib-recent-page-${entry.mission.id}`))}
                </div>
              )}
            </section>
          ) : section === 'projects' ? (
            <section aria-labelledby='ms-lib-projects-title'>
              <div className='ms-lib-row'>
                <h1 id='ms-lib-projects-title'>Projects</h1>
                <Button size='sm' variant='default' onClick={() => setProjectDlg({ mode: 'create' })}>
                  <PlusIcon aria-hidden='true' /> New Project
                </Button>
              </div>
              <div className='ms-lib-grid' aria-label={`${activeWorkspace.name} Projects`}>
                {workspaceProjects.map((p) => projectCard(p))}
              </div>
            </section>
          ) : section === 'worlds' ? (
            <section aria-labelledby='ms-lib-worlds-title'>
              <div className='ms-lib-row'>
                <div>
                  <h1 id='ms-lib-worlds-title'>Worlds</h1>
                  <p className='ms-lib-sub'>3D reconstruction references and sample terrain for {activeWorkspace.name}.</p>
                </div>
                <Button size='sm' variant='default' onClick={() => setWorldEditor({ mode: 'create', profile: newWorkspaceWorld(nextId('world'), activeWorkspace.id) })}>
                  <PlusIcon aria-hidden='true' /> Add World
                </Button>
              </div>
              <div className='ms-lib-grid is-resource-grid' aria-label={`${activeWorkspace.name} Worlds`}>
                <article className='ms-lib-card ms-lib-resource-card is-readonly'>
                  <span className='ms-lib-resource-icon'><GlobeHemisphereWestIcon aria-hidden='true' /></span>
                  <span className='ms-lib-card-body'>
                    <span className='ms-lib-card-title'>Blank space</span>
                    <span className='ms-lib-card-desc'>2D system World · no terrain source</span>
                    <span className='ms-lib-card-edited'>System · not editable</span>
                  </span>
                </article>
                {workspaceWorlds.map((world) => (
                  <article key={world.id} className='ms-lib-card ms-lib-resource-card ms-lib-managed-resource-card'>
                    <span className='ms-lib-resource-icon'><GlobeHemisphereWestIcon aria-hidden='true' /></span>
                    <span className='ms-lib-card-body'>
                      <span className='ms-lib-card-title'>{world.name}</span>
                      <span className='ms-lib-card-desc'>3D World · {world.location || 'Location not specified'}</span>
                      <span className='ms-lib-card-edited'>{world.status}{world.sourceType === 'mission' && world.sourceMissionLabel ? ` · Source: ${world.sourceMissionLabel}` : world.sourceType === 'flight-reference' && world.sourceFlightReference ? ` · Source: ${world.sourceFlightReference}` : ''}</span>
                      {world.reconstructionReference ? <span className='ms-lib-card-edited'>Reconstruction reference saved</span> : null}
                    </span>
                    <span className='ms-lib-resource-actions'>
                      <Button className='w-full flex-auto' size='sm' variant='outline' onClick={() => setWorldEditor({ mode: 'edit', profile: world })}>Edit</Button>
                      <Menu>
                        <MenuTrigger aria-label={`More actions for ${world.name}`} render={<Button variant='outline' size='icon-sm' className='text-muted-foreground' />}>
                          <DotsThreeVerticalIcon aria-hidden='true' />
                        </MenuTrigger>
                        <MenuPortal>
                          <MenuPositioner side='bottom' align='end' sideOffset={4}>
                            <MenuPopup aria-label={`Actions for ${world.name}`}>
                              <MenuItem onClick={() => setDeleteWorldId(world.id)}>Delete</MenuItem>
                            </MenuPopup>
                          </MenuPositioner>
                        </MenuPortal>
                      </Menu>
                    </span>
                  </article>
                ))}
              </div>
              {workspaceWorlds.length === 0 ? emptyState('No Worlds yet', 'Add a 3D reconstruction record or use a sample fixture.') : null}
            </section>
          ) : section === 'drones' ? (
            <section aria-labelledby='ms-lib-drones-title'>
              <div className='ms-lib-row'>
                <div>
                  <h1 id='ms-lib-drones-title'>{activeWorkspace.name} Drones</h1>
                  <p className='ms-lib-sub'>Reference builds and hardware profiles for this Workspace.</p>
                </div>
                <Button size='sm' variant='default' onClick={() => setDroneEditor({ mode: 'create', profile: newDroneProfile(nextId('drone'), activeWorkspace.id) })}>
                  <PlusIcon aria-hidden='true' /> Add Drone
                </Button>
              </div>
              <div className='ms-lib-grid is-resource-grid' aria-label={`${activeWorkspace.name} Drones`}>
                {workspaceDrones.map((drone) => (
                  <article key={drone.id} className='ms-lib-card ms-lib-resource-card ms-lib-drone-profile-card'>
                    <span className='ms-lib-resource-icon'><DroneIcon aria-hidden='true' /></span>
                    <span className='ms-lib-card-body'>
                      <span className='ms-lib-card-title'>{drone.name}</span>
                      <span className='ms-lib-card-desc'>{drone.firmwareFamily === 'Unspecified' ? 'Flight firmware not specified' : `${drone.firmwareFamily} flight firmware`}</span>
                      <span className='ms-lib-card-edited'>{drone.flightControllerModel || 'Flight controller not specified'}</span>
                      <span className='ms-lib-drone-component-count'>{drone.components.length} hardware components</span>
                    </span>
                    <span className='ms-lib-drone-card-actions'>
                      <Button className='w-full flex-auto' size='sm' variant='outline' onClick={() => setDroneEditor({ mode: 'edit', profile: drone })}>Edit</Button>
                      <Menu>
                        <MenuTrigger aria-label={`More actions for ${drone.name}`} render={<Button variant='outline' size='icon-sm' className='text-muted-foreground' />}>
                          <DotsThreeVerticalIcon aria-hidden='true' />
                        </MenuTrigger>
                        <MenuPortal>
                          <MenuPositioner side='bottom' align='end' sideOffset={4}>
                            <MenuPopup aria-label={`Actions for ${drone.name}`}>
                              <MenuItem onClick={() => setDeleteDroneId(drone.id)}>Delete</MenuItem>
                            </MenuPopup>
                          </MenuPositioner>
                        </MenuPortal>
                      </Menu>
                    </span>
                  </article>
                ))}
              </div>
            </section>
          ) : section === 'starred' ? (
            <section aria-labelledby='ms-lib-starred-title'>
              <h1 id='ms-lib-starred-title'>Starred missions</h1>
              {starredMissions.length === 0 ? (
                emptyState('No starred missions yet', 'Star a mission from a project to keep it close at hand.')
              ) : (
                <div className='ms-lib-grid' aria-label='Starred missions'>
                  {starredMissions.map((e) =>
                    missionCard(e.projectId, e.project, e.mission, `ms-lib-starred-${e.mission.id}`)
                  )}
                </div>
              )}
            </section>
          ) : section === 'shared' ? (
            <section aria-labelledby='ms-lib-sharedme-title'>
              <h1 id='ms-lib-sharedme-title'>Shared with me</h1>
              <p className='ms-lib-sub'>Projects shared by people in other Workspaces.</p>
              <div className='ms-lib-grid' aria-label='Projects shared with me'>
                {SHARED_PROJECTS.map((project) => sharedProjectCard(project))}
              </div>
            </section>
          ) : section === 'templates' ? (
            activeTemplate ? (
              <section aria-labelledby='ms-lib-template-title'>
                <button type='button' className='ms-lib-back' onClick={() => onOpenTemplate(null)}>
                  <ArrowLeftIcon aria-hidden='true' /> Mission templates
                </button>
                <div className='ms-lib-detail'>
                  <span className={`ms-lib-thumb is-template large tint-${activeTemplate.id.charCodeAt(1) % 6}`} aria-hidden='true'>
                    <img src={getTemplateThumbnail(activeTemplate.id)} alt='' className='ms-template-thumbnail' />
                  </span>
                  <div className='ms-lib-detail-body'>
                    <h1 id='ms-lib-template-title'>{activeTemplate.title}</h1>
                    <p className='ms-lib-sub'>
                      {activeTemplate.byline} · full template content arrives with backend templates
                    </p>
                    <p className='ms-lib-desc'>{activeTemplate.desc}</p>
                    <span className='ms-lib-row-actions'>
                      <Button size='sm' variant='default' onClick={() => useTemplate(activeTemplate)}>
                        Use template
                      </Button>
                      <Button size='sm' variant='outline' onClick={() => onOpenTemplate(null)}>
                        Back
                      </Button>
                    </span>
                  </div>
                </div>
              </section>
            ) : (
              <section aria-labelledby='ms-lib-templates-page-title'>
                <h1 id='ms-lib-templates-page-title'>Mission templates</h1>
                <p className='ms-lib-sub'>Learn SkyTrack with Mission templates</p>
                <div className='ms-lib-search'>
                  <FieldRoot name='template-search'>
                    <FieldLabel className='ms-sr'>Search templates</FieldLabel>
                    <FieldControl
                      value={query}
                      onValueChange={(v) => setQuery(typeof v === 'string' ? v : '')}
                      placeholder='Search templates'
                      aria-label='Search templates'
                    />
                  </FieldRoot>
                </div>
                {debouncedQuery.trim() !== '' ? (
                  <p className='ms-lib-sub' role='status'>
                    {filteredTemplates.length} result{filteredTemplates.length === 1 ? '' : 's'} for &ldquo;
                    {debouncedQuery.trim()}&rdquo;
                  </p>
                ) : null}
                {filteredTemplates.length === 0 ? (
                  emptyState('No templates found', `No templates match "${debouncedQuery.trim()}" in this mock list.`)
                ) : (
                  <div className='ms-lib-grid is-templates' aria-label='Mission templates'>
                    {filteredTemplates.map((t) =>
                      templateCard(t, `ms-lib-template-${t.id}`, () => openTemplateDetail(t.id))
                    )}
                  </div>
                )}
              </section>
            )
          ) : section === 'learn' ? (
            <section aria-labelledby='ms-lib-learn-page-title'>
              <h1 id='ms-lib-learn-page-title'>Learn</h1>
              <p className='ms-lib-sub'>Guides from the SkyTrack help center open in a new tab.</p>
              <div className='ms-lib-grid is-templates'>
                <article className='ms-lib-card' aria-label={LEARN_FEATURED.title}>
                  <span className='ms-lib-thumb is-learn tint-3' aria-hidden='true'>
                    <BookOpenIcon />
                  </span>
                  <span className='ms-lib-card-body'>
                    <a className='ms-lib-card-title is-link' href={LEARN_FEATURED.url} target='_blank' rel='noreferrer'>
                      {LEARN_FEATURED.title} <ArrowSquareOutIcon aria-hidden='true' className='ms-lib-inline-icon' />
                    </a>
                    <span className='ms-lib-card-desc'>{LEARN_FEATURED.desc}</span>
                  </span>
                </article>
                <article className='ms-lib-card' aria-label='SkyTrack help center'>
                  <span className='ms-lib-thumb is-learn tint-1' aria-hidden='true'>
                    <BookOpenIcon />
                  </span>
                  <span className='ms-lib-card-body'>
                    <a className='ms-lib-card-title is-link' href={LEARN_URL} target='_blank' rel='noreferrer'>
                      SkyTrack help center <ArrowSquareOutIcon aria-hidden='true' className='ms-lib-inline-icon' />
                    </a>
                    <span className='ms-lib-card-desc'>
                      Browse all builder guides. The full article list is a mock in this slice.
                    </span>
                  </span>
                </article>
              </div>
            </section>
          ) : section === 'aimodels' ? (
            <section aria-labelledby='ms-lib-aimodels-title'>
              <div className='ms-lib-row'>
                <div>
                  <h1 id='ms-lib-aimodels-title'>AI models</h1>
                  <p className='ms-lib-sub'>Import model packages for this Workspace. Models are not run or deployed.</p>
                </div>
                <Button size='sm' variant='default' onClick={() => setImportModelOpen(true)}>
                  <PlusIcon aria-hidden='true' /> Import model
                </Button>
              </div>
              <Tabs className='ms-ai-model-tabs' value={aiModelCategory} onValueChange={(value: unknown) => setAIModelCategory(String(value))}>
                <TabsList variant='standard' aria-label='AI model categories'>
                  <TabsTab variant='standard' value='workspace'>Workspace ({workspaceAIModels.length})</TabsTab>
                  <TabsTab variant='standard' value='uploaded'>Uploaded by you ({uploadedAIModels.length})</TabsTab>
                  <TabsIndicator variant='underline' />
                </TabsList>
                <TabsPanel className='ms-ai-model-panel' value='workspace'>
                  {workspaceAIModels.length === 0 ? emptyState('No Workspace models yet', 'SkyTrack models shared with this Workspace will appear here.') : (
                    <div className='ms-lib-grid is-resource-grid is-ai-models' aria-label={`${activeWorkspace.name} AI models`}>
                      {workspaceAIModels.map((model) => (
                        <article key={model.id} className='ms-lib-card ms-lib-resource-card ms-lib-managed-resource-card'>
                          <span className='ms-lib-resource-icon'><PackageIcon aria-hidden='true' /></span>
                          <span className='ms-lib-card-body'>
                            <span className='ms-lib-card-title'>{model.name}</span>
                            <span className='ms-lib-card-desc'>{model.version ? `Version ${model.version}` : 'Version not specified'}{model.task ? ` · ${model.task}` : ''}</span>
                            <span className='ms-lib-card-edited'>{model.inputModality || 'Input modality not specified'}{model.compatibility ? ` · ${model.compatibility}` : ''}</span>
                            <span className='ms-lib-card-edited'>{model.status}</span>
                          </span>
                        </article>
                      ))}
                    </div>
                  )}
                </TabsPanel>
                <TabsPanel className='ms-ai-model-panel' value='uploaded'>
                  {uploadedAIModels.length === 0 ? emptyState('No uploaded models yet', 'Import a model package to add it to your personal list.') : (
                    <div className='ms-lib-grid is-resource-grid is-ai-models' aria-label='AI models uploaded by you'>
                      {uploadedAIModels.map((model) => (
                        <article key={model.id} className='ms-lib-card ms-lib-resource-card ms-lib-managed-resource-card'>
                          <span className='ms-lib-resource-icon'><PackageIcon aria-hidden='true' /></span>
                          <span className='ms-lib-card-body'>
                            <span className='ms-lib-card-title'>{model.name}</span>
                            <span className='ms-lib-card-desc'>{model.packageFileName || model.assetReference}</span>
                            <span className='ms-lib-card-edited'>{model.packageFileSize ? `${(model.packageFileSize / (1024 * 1024)).toFixed(1)} MB` : 'Package size unavailable'} · {model.status}</span>
                          </span>
                          <span className='ms-lib-resource-actions'>
                            <Menu>
                              <MenuTrigger aria-label={`More actions for ${model.name}`} render={<Button variant='outline' size='icon-sm' className='text-muted-foreground' />}>
                                <DotsThreeVerticalIcon aria-hidden='true' />
                              </MenuTrigger>
                              <MenuPortal>
                                <MenuPositioner side='bottom' align='end' sideOffset={4}>
                                  <MenuPopup aria-label={`Actions for ${model.name}`}>
                                    <MenuItem onClick={() => setDeleteModelId(model.id)}>Remove</MenuItem>
                                  </MenuPopup>
                                </MenuPositioner>
                              </MenuPortal>
                            </Menu>
                          </span>
                        </article>
                      ))}
                    </div>
                  )}
                </TabsPanel>
              </Tabs>
            </section>
          ) : section === 'logs' ? (
            <section aria-labelledby='ms-lib-logs-title'>
              <h1 id='ms-lib-logs-title'>Logs</h1>
              {emptyState('No logs yet', 'Flight and build logs will appear here (mock).')}
            </section>
          ) : section === 'notifications' ? (
            <section aria-labelledby='ms-lib-notifications-title'>
              <h1 id='ms-lib-notifications-title'>Notifications</h1>
              {emptyState('No notifications yet', 'Workspace updates and mission activity will appear here (mock).')}
            </section>
          ) : (
            <section className='ms-placeholder' aria-label={`${section} placeholder`}>
              <h1 className='ms-placeholder-title'>{section}</h1>
              <p className='ms-hint'>This section is not part of the captured app shell. It stays a placeholder in this slice.</p>
              <Button size='sm' variant='outline' onClick={() => goto('home')}>
                Back to Home
              </Button>
            </section>
          )}
        </main>
      </div>

      {/* Mission rename dialog. */}
      <MissionDialog dlg={missionDlg} onClose={() => setMissionDlg(null)} onSubmit={submitMissionDlg} />
      {/* Guided creation (Figma 631:29818): General → World → Drone. */}
      <CreateMissionWizard
        key={`wizard-${wizardKey}`}
        open={wizardOpen}
        projects={workspaceProjects}
        initialProjectId={wizardSeed.projectId || workspaceProjects[0]?.id || ''}
        initialTitle={wizardSeed.title}
        drones={workspaceDrones}
        worlds={selectableWorldsForWorkspace(activeWorkspace.id)}
        onClose={() => setWizardOpen(false)}
        onSubmit={submitWizard}
      />
      {/* New / Update Project — real copy: "Create project to manage your
          missions", "Project title" (120), Cancel + Create/Update. */}
      <ProjectDialog dlg={projectDlg} onClose={() => setProjectDlg(null)} onSubmit={submitProjectDlg} />
      <DroneProfileDialog
        open={droneEditor !== null}
        mode={droneEditor?.mode ?? 'create'}
        profile={droneEditor?.profile ?? null}
        onClose={() => setDroneEditor(null)}
        onSave={saveDroneProfile}
      />
      <WorldProfileDialog
        open={worldEditor !== null}
        mode={worldEditor?.mode ?? 'create'}
        profile={worldEditor?.profile ?? null}
        sourceMissions={sourceMissions}
        onClose={() => setWorldEditor(null)}
        onSave={saveWorldProfile}
      />
      <ImportAIModelDialog
        open={importModelOpen}
        existingNames={workspaceResources.aiModels.filter((model) => model.workspaceId === activeWorkspace.id).map((model) => model.name)}
        onClose={() => setImportModelOpen(false)}
        onImport={importAIModel}
      />
      {/* Share mission — real copy: email (254, "Enter a valid email
          address"), Permission ["View only"], Cancel + Share Mission. */}
      <ShareDialog dlg={shareDlg} onClose={() => setShareDlg(null)} onSubmit={shareMission} />
      {/* Clone target project picker (simplified ProjectSelection). */}
      <Dialog open={cloneTarget !== null} onOpenChange={(v: boolean) => { if (!v) setCloneTarget(null) }}>
        <DialogPortal>
          <DialogBackdrop />
          <DialogPopup aria-label='Clone mission'>
            <DialogHeader>
              <DialogTitle>Clone mission</DialogTitle>
              <DialogDescription>
                {cloneTarget ? (
                  <>Choose a project for the copy of &ldquo;{cloneTarget.name}&rdquo;.</>
                ) : null}
              </DialogDescription>
            </DialogHeader>
            <div className='ms-lib-form'>
              <CloneProjectPicker
                projects={workspaceProjects}
                onPick={cloneMission}
                onNewProject={() => {
                  setCloneTarget(null)
                  setProjectDlg({ mode: 'create' })
                }}
              />
            </div>
            <DialogFooter>
              <DialogClose>Cancel</DialogClose>
            </DialogFooter>
          </DialogPopup>
        </DialogPortal>
      </Dialog>
      {/* Delete Mission — real confirm copy. */}
      <Dialog open={deleteMission !== null} onOpenChange={(v: boolean) => { if (!v) setDeleteMission(null) }}>
        <DialogPortal>
          <DialogBackdrop />
          <DialogPopup aria-label='Delete mission'>
            <DialogHeader>
              <DialogTitle>Delete Mission?</DialogTitle>
              <DialogDescription>
                {deleteMission ? (
                  <>Do you want to delete the &ldquo;{deleteMission.name}&rdquo; mission? This action can&apos;t be reversed.</>
                ) : null}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose>Cancel</DialogClose>
              <Button size='sm' variant='destructive' onClick={confirmDeleteMission}>
                Delete
              </Button>
            </DialogFooter>
          </DialogPopup>
        </DialogPortal>
      </Dialog>
      {/* Delete Project — real confirm copy. */}
      <Dialog open={deleteProject !== null} onOpenChange={(v: boolean) => { if (!v) setDeleteProject(null) }}>
        <DialogPortal>
          <DialogBackdrop />
          <DialogPopup aria-label='Delete project'>
            <DialogHeader>
              <DialogTitle>Delete Project?</DialogTitle>
              <DialogDescription>
                {deleteProject ? (
                  <>
                    The &ldquo;{deleteProject.name}&rdquo; project contains {deleteProject.missionCount} mission{deleteProject.missionCount === 1 ? '' : 's'}.
                    Deleting it will also permanently delete {deleteProject.missionCount} mission{deleteProject.missionCount === 1 ? '' : 's'}. This action can&apos;t be reversed.
                  </>
                ) : null}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose>Cancel</DialogClose>
              <Button size='sm' variant='destructive' onClick={confirmDeleteProject}>
                Delete
              </Button>
            </DialogFooter>
          </DialogPopup>
        </DialogPortal>
      </Dialog>
      <Dialog open={deleteDroneId !== null} onOpenChange={(v: boolean) => { if (!v) setDeleteDroneId(null) }}>
        <DialogPortal>
          <DialogBackdrop />
          <DialogPopup aria-label='Delete drone profile'>
            <DialogHeader>
              <DialogTitle>Delete drone profile?</DialogTitle>
              <DialogDescription>
                {droneToDelete ? `Delete ${droneToDelete.name} from ${activeWorkspace.name}?` : null}
              </DialogDescription>
            </DialogHeader>
            {deleteDroneReferences.length > 0 ? (
              <div className='ms-drone-reference-warning' role='alert'>
                <p>This Drone is selected by {deleteDroneReferences.length} mission{deleteDroneReferences.length === 1 ? '' : 's'}. Change those missions to another Drone before deleting this profile.</p>
                <ul>
                  {deleteDroneReferences.map((reference) => (
                    <li key={`${reference.project}-${reference.mission}`}><strong>{reference.mission}</strong><span>{reference.project}</span></li>
                  ))}
                </ul>
              </div>
            ) : null}
            <DialogFooter>
              <DialogClose>Cancel</DialogClose>
              <Button size='sm' variant='destructive' disabled={deleteDroneReferences.length > 0} onClick={deleteDrone}>Delete Drone</Button>
            </DialogFooter>
          </DialogPopup>
        </DialogPortal>
      </Dialog>
      <Dialog open={deleteWorldId !== null} onOpenChange={(v: boolean) => { if (!v) setDeleteWorldId(null) }}>
        <DialogPortal>
          <DialogBackdrop />
          <DialogPopup aria-label='Delete World'>
            <DialogHeader>
              <DialogTitle>{deleteWorldReferences.length > 0 ? 'World is in use' : 'Delete World?'}</DialogTitle>
              <DialogDescription>
                {worldToDelete ? `${worldToDelete.name} · ${activeWorkspace.name}` : null}
              </DialogDescription>
            </DialogHeader>
            {deleteWorldReferences.length > 0 ? (
              <div className='ms-drone-reference-warning' role='alert'>
                <p>This World is selected by {deleteWorldReferences.length} mission{deleteWorldReferences.length === 1 ? '' : 's'}. Reassign those missions before deleting it, or archive the World.</p>
                <ul>
                  {deleteWorldReferences.map((reference) => (
                    <li key={`${reference.project}-${reference.mission}`}><strong>{reference.mission}</strong><span>{reference.project}</span></li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className='ms-resource-note'>This removes the World record. Any source and reconstruction references stored here will also be removed.</p>
            )}
            <DialogFooter>
              <DialogClose>Cancel</DialogClose>
              <Button size='sm' variant='destructive' disabled={deleteWorldReferences.length > 0} onClick={deleteWorld}>Delete World</Button>
            </DialogFooter>
          </DialogPopup>
        </DialogPortal>
      </Dialog>
      <Dialog open={deleteModelId !== null} onOpenChange={(v: boolean) => { if (!v) setDeleteModelId(null) }}>
        <DialogPortal>
          <DialogBackdrop />
          <DialogPopup aria-label='Remove uploaded AI model'>
            <DialogHeader>
              <DialogTitle>Remove uploaded model?</DialogTitle>
              <DialogDescription>
                {modelToDelete ? `Delete ${modelToDelete.name} from ${activeWorkspace.name}?` : null}
              </DialogDescription>
            </DialogHeader>
            <p className='ms-resource-note'>This removes the model details from this browser. The ZIP file was not stored here.</p>
            <DialogFooter>
              <DialogClose>Cancel</DialogClose>
              <Button size='sm' variant='destructive' onClick={deleteAIModel}>Remove model</Button>
            </DialogFooter>
          </DialogPopup>
        </DialogPortal>
      </Dialog>
      <AccountMenuDialogs
        panel={accountPanel}
        profile={accountProfile}
        notifications={notificationPreferences}
        onClose={() => setAccountPanel(null)}
        onSaveProfile={updateAccountProfile}
        onChangeNotifications={updateNotificationPreferences}
      />
    </div>
  )
}
