/* library.tsx — route-local Home / Projects / Project-detail shell for Mission Studio.
   Source evidence (all FACT unless noted):
   - App bundle routes: /home, /projects, /projects/:id, /starred-missions,
     /shared-with-me, /templates, /template/:templateId,
     /mission/:missionId, /shared-accounts/:missionId
     (renderer asset index-DPH7FYaV.js in /tmp/skytrack-asar-inspect.4JSf7T).
   - Sidebar: Home; group "Projects": Projects, Starred Missions
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
   - Projects: project-detail breadcrumb Projects › project name; Projects
     page title + primary "+ New Project" (entry projects_header);
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

import { SkyTooltip } from '../../shared/sky-tooltip'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  ArrowLeftIcon,
  ArrowSquareOutIcon,
  BellIcon,
  BookOpenIcon,
  CaretDownIcon,
  CaretRightIcon,
  CheckIcon,
  CloudIcon,
  ClockIcon,
  DesktopIcon,
  DotsThreeIcon,
  DotsThreeVerticalIcon,
  DroneIcon,
  DownloadIcon,
  DiscordLogoIcon,
  FoldersIcon,
  FolderIcon,
  FolderOpenIcon,
  GearIcon,
  GlobeHemisphereWestIcon,
  HouseIcon,
  MoonIcon,
  NotepadIcon,
  PackageIcon,
  PlusIcon,
  SignOutIcon,
  ShareNetworkIcon,
  SquaresFourIcon,
  StarIcon,
  SunIcon,
  UserIcon,
  UsersIcon
} from '@phosphor-icons/react'
import { Badge } from 'skytrack-ui/badge'
import { Button } from 'skytrack-ui/button'
import { Separator } from 'skytrack-ui/separator'
import { Tabs, TabsIndicator, TabsList, TabsPanel, TabsTab } from 'skytrack-ui/tabs'
import {
  Tooltip,
  TooltipArrow,
  TooltipPopup,
  TooltipPortal,
  TooltipPositioner,
  TooltipProvider,
  TooltipTrigger
} from 'skytrack-ui/tooltip'
import {
  ContextMenu,
  ContextMenuItem,
  ContextMenuPopup,
  ContextMenuPortal,
  ContextMenuPositioner,
  ContextMenuSeparator,
  ContextMenuTrigger
} from 'skytrack-ui/context-menu'
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
  ToastClose,
  ToastContent,
  ToastPortal,
  ToastProvider,
  ToastRoot,
  ToastTitle,
  ToastViewport,
  createToastManager,
  useToastManager
} from 'skytrack-ui/toast'
import {
  Menu,
  MenuItem,
  MenuPopup,
  MenuPortal,
  MenuPositioner,
  MenuRadioGroup,
  MenuRadioItem,
  MenuRadioItemIndicator,
  MenuSeparator,
  MenuSubmenuRoot,
  MenuSubmenuTrigger,
  MenuTrigger
} from 'skytrack-ui/menu'
import skytrackLogoFull from '../../assets/skytrack-logo-full.svg?raw'
import MissionThumbnail from './mission-thumbnail'
import { getTemplateThumbnail } from './template-thumbnails'
import {
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

const runEnvironmentToastManager = createToastManager()

function RunEnvironmentToastList() {
  const { toasts } = useToastManager()
  return toasts.map((toast) => (
    <ToastRoot key={toast.id} toast={toast}>
      <ToastContent>
        <div className='min-w-0 flex-1'>
          <ToastTitle />
        </div>
        <ToastClose size='icon' variant='ghost' aria-label='Dismiss toast' />
      </ToastContent>
    </ToastRoot>
  ))
}

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

type LibraryCardAction = {
  id: string
  label: string
  onSelect: () => void
  group: 'primary' | 'common' | 'destructive'
  destructive?: boolean
}

function renderLibraryCardActions(actions: LibraryCardAction[], contextMenu = false) {
  return actions.flatMap((action, index) => {
    const previousAction = actions[index - 1]
    const separator = previousAction && previousAction.group !== action.group
      ? contextMenu
        ? <ContextMenuSeparator key={`separator-${action.id}`} />
        : <MenuSeparator key={`separator-${action.id}`} />
      : null
    const item = contextMenu ? (
      <ContextMenuItem key={action.id} variant={action.destructive ? 'destructive' : 'default'} onClick={action.onSelect}>
        {action.label}
      </ContextMenuItem>
    ) : (
      <MenuItem key={action.id} variant={action.destructive ? 'destructive' : 'default'} onClick={action.onSelect}>
        {action.label}
      </MenuItem>
    )
    return separator ? [separator, item] : [item]
  })
}

function LibraryCardFrame({
  label,
  className,
  children,
  actions,
  testId,
  starred,
  onToggleStar,
  onOpen
}: {
  label: string
  className?: string
  children: ReactNode
  actions: LibraryCardAction[]
  testId?: string
  starred?: boolean
  onToggleStar?: () => void
  onOpen?: () => void
}) {
  const cardClassName = ['ms-lib-card', className].filter(Boolean).join(' ')
  const handleCardClick = (event: React.MouseEvent<HTMLElement>) => {
    if (!onOpen) return
    const target = event.target as Element
    if (target.closest('button, a, input, textarea, select, [role="button"]')) return
    onOpen()
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger render={<article className={cardClassName} aria-label={label} onClick={handleCardClick} />}>
        <span className='ms-lib-card-overlay-actions' onClick={(event) => event.stopPropagation()}>
          {onToggleStar ? (
            <SkyTooltip><Button
              type='button'
              variant='outline'
              size='icon-sm'
              data-testid={testId ? `${testId}-star` : undefined}
              aria-label={`${starred ? 'Unstar' : 'Star'} ${label}`}
              aria-pressed={starred}
              onClick={onToggleStar}
            >
              <StarIcon aria-hidden='true' weight={starred ? 'fill' : 'regular'} />
            </Button></SkyTooltip>
          ) : null}
          {actions.length > 0 ? (
            <Menu>
              <SkyTooltip><MenuTrigger
                aria-label={`More actions for ${label}`}
                data-testid={testId ? `${testId}-more` : undefined}
                render={<Button type='button' variant='outline' size='icon-sm' />}
              >
                <DotsThreeIcon aria-hidden='true' />
              </MenuTrigger></SkyTooltip>
              <MenuPortal>
                <MenuPositioner side='bottom' align='end' sideOffset={4}>
                  <MenuPopup aria-label={`Actions for ${label}`}>
                    {renderLibraryCardActions(actions)}
                  </MenuPopup>
                </MenuPositioner>
              </MenuPortal>
            </Menu>
          ) : null}
        </span>
        {children}
      </ContextMenuTrigger>
      {actions.length > 0 ? (
        <ContextMenuPortal>
          <ContextMenuPositioner>
            <ContextMenuPopup aria-label={`Actions for ${label}`}>
              {renderLibraryCardActions(actions, true)}
            </ContextMenuPopup>
          </ContextMenuPositioner>
        </ContextMenuPortal>
      ) : null}
    </ContextMenu>
  )
}

function LibraryEmptyState({
  title,
  description,
  icon
}: {
  title: ReactNode
  description: ReactNode
  icon?: ReactNode
}) {
  return (
    <div className='ms-lib-empty' role='status'>
      <span className='ms-lib-empty-icon' aria-hidden='true'>
        {icon ?? <FolderOpenIcon />}
      </span>
      <p className='ms-lib-empty-title'>{title}</p>
      <p className='ms-hint text-base'>{description}</p>
    </div>
  )
}

function LibraryPageHeader({
  titleId,
  title,
  description,
  context,
  actions,
  footer,
  footerVariant,
  variant
}: {
  titleId: string
  title: ReactNode
  description?: ReactNode
  context?: ReactNode
  actions?: ReactNode
  footer?: ReactNode
  footerVariant?: 'tabs'
  variant?: 'default' | 'plain'
}) {
  const className = [
    'ms-lib-page-header',
    footerVariant === 'tabs' ? 'has-tabs' : '',
    variant === 'plain' ? 'is-plain' : ''
  ].filter(Boolean).join(' ')

  return (
    <header className={className}>
      {context ? <div className='ms-lib-page-header-context'>{context}</div> : null}
      <div className='ms-lib-page-header-row'>
        <div className='ms-lib-page-header-copy'>
          <h1 id={titleId}>{title}</h1>
          {description ? <div className='ms-lib-page-header-description'>{description}</div> : null}
        </div>
        {actions ? <div className='ms-lib-page-header-actions'>{actions}</div> : null}
      </div>
      {footer ? <div className='ms-lib-page-header-footer'>{footer}</div> : null}
    </header>
  )
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

function worldSourceSummary(world: WorkspaceWorldRecord): string {
  if (world.sourceType === 'mission') {
    if (world.sourceMissionLabel) return `Source 2D mission · ${world.sourceMissionLabel}`
    return world.sourceMissionId ? 'Source 2D mission linked' : 'No source 2D mission selected'
  }
  if (world.sourceType === 'flight-reference') {
    return world.sourceFlightReference
      ? `User-entered flight reference · ${world.sourceFlightReference}`
      : 'No flight reference entered'
  }
  return world.status === 'Sample' ? 'Sample terrain · no flight source' : 'No source mission or flight reference'
}

function worldReconstructionSummary(world: WorkspaceWorldRecord): string {
  if (world.reconstructionReference.trim()) return '3D reconstruction reference saved'
  return world.status === 'Sample' ? 'Sample terrain fixture' : 'No 3D reconstruction reference'
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
  onAnnounce,
  onLogout
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
  onLogout: () => void
}) {
  const [projects, setProjects] = useState<LibProject[]>(loadProjects)
  const [droneProfiles, setDroneProfiles] = useState<WorkspaceDroneProfile[]>(loadDroneProfiles)
  const [workspaceResources, setWorkspaceResources] = useState<WorkspaceResourceState>(loadWorkspaceResources)
  const [aiModelCategory, setAIModelCategory] = useState('workspace')
  const [runEnvironment, setRunEnvironment] = useState<'local' | 'cloud'>('local')
  const [accountProfile, setAccountProfile] = useState<AccountProfile>(readAccountProfile)
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>(readNotificationPreferences)
  const [accountPanel, setAccountPanel] = useState<AccountMenuPanel | null>(null)
  const [themePreference, setThemePreference] = useState<ThemePreference>(readThemePreference)
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(readActiveWorkspaceId)
  const activeWorkspace = getWorkspace(activeWorkspaceId)
  const canUseCloudSIM = activeWorkspace.role === 'Admin'
  useEffect(() => {
    if (!canUseCloudSIM) setRunEnvironment('local')
  }, [activeWorkspace.id, canUseCloudSIM])
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
      <Badge count={mission.worldType ?? '3D'} status='outline' />
      <Badge
        count={(
          <span className='inline-flex items-center gap-1'>
            <GlobeHemisphereWestIcon aria-hidden='true' className='size-3.5 shrink-0' />
            {mission.world ?? 'Blank space'}
          </span>
        )}
        status='outline'
        className='text-muted-foreground'
      />
    </span>
  )

  const missionActions = (pid: string, projectName: string, m: LibMission): LibraryCardAction[] => {
    const actions: LibraryCardAction[] = [
      { id: 'open', label: 'Open', group: 'primary', onSelect: () => openMission(pid, projectName, m.id) }
    ]
    if (!m.viewOnly) {
      actions.push(
        {
          id: 'star',
          label: m.starred ? 'Unstar' : 'Star',
          group: 'common',
          onSelect: () => toggleStar(pid, m.id)
        },
        {
          id: 'rename',
          label: 'Rename',
          group: 'common',
          onSelect: () => setMissionDlg({ mode: 'rename', projectId: pid, missionId: m.id, initialName: m.name })
        },
        { id: 'clone', label: 'Clone', group: 'common', onSelect: () => setCloneTarget({ missionId: m.id, name: m.name }) },
        {
          id: 'share',
          label: 'Share',
          group: 'common',
          onSelect: () => setShareDlg({ projectId: pid, missionId: m.id, name: m.name })
        },
        {
          id: 'delete',
          label: 'Delete',
          group: 'destructive',
          destructive: true,
          onSelect: () => setDeleteMission({ projectId: pid, missionId: m.id, name: m.name })
        }
      )
    }
    return actions
  }

  const missionCard = (pid: string, projectName: string, m: LibMission, testid: string) => {
    const isCurrent = current?.projectId === pid && current?.mission === m.name
    return (
      <LibraryCardFrame
        key={m.id}
        label={m.name}
        className={isCurrent ? 'is-current' : undefined}
        testId={testid}
        actions={missionActions(pid, projectName, m)}
        starred={m.starred}
        onToggleStar={m.viewOnly ? undefined : () => toggleStar(pid, m.id)}
        onOpen={() => openMission(pid, projectName, m.id)}
      >
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
            <span className='ms-lib-card-title'>
              {m.name} {isCurrent ? <span className='ms-lib-current'>· Current</span> : null}
            </span>
          </span>
          {m.viewOnly ? (
            <span className='ms-lib-card-badgerow'>
              <Badge count='View only' />
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
      </LibraryCardFrame>
    )
  }

  const projectCard = (p: LibProject) => (
    <LibraryCardFrame
      key={p.id}
      label={p.name}
      testId={`ms-lib-project-${p.id}`}
      actions={[
        { id: 'open', label: 'Open', group: 'primary', onSelect: () => openProject(p.id) },
        { id: 'rename', label: 'Rename', group: 'common', onSelect: () => setProjectDlg({ mode: 'rename', projectId: p.id, initialName: p.name }) },
        {
          id: 'delete',
          label: 'Delete',
          group: 'destructive',
          destructive: true,
          onSelect: () => setDeleteProject({ projectId: p.id, name: p.name, missionCount: p.missions.length })
        }
      ]}
      onOpen={() => openProject(p.id)}
    >
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
          <span className='ms-lib-card-title'>
            {p.name}
          </span>
        </span>
        <span className='ms-lib-card-edited'>
          {p.missions.length} mission{p.missions.length === 1 ? '' : 's'}
        </span>
      </span>
    </LibraryCardFrame>
  )

  const templateCard = (t: LibTemplate, testid: string, onOpen: () => void, hideMeta?: boolean) => {
    const tint = `tint-${t.id.charCodeAt(1) % 6}`
    const thumbnail = getTemplateThumbnail(t.id)
    return (
      <LibraryCardFrame
        key={t.id}
        label={t.title}
        testId={testid}
        actions={[{ id: 'open', label: 'Open', group: 'primary', onSelect: onOpen }]}
        onOpen={onOpen}
      >
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
          <span className='ms-lib-card-title'>
            {t.title}
          </span>
          <span className='ms-lib-card-desc'>{t.desc}</span>
          {hideMeta ? null : <span className='ms-lib-card-edited'>{t.byline}</span>}
        </span>
      </LibraryCardFrame>
    )
  }

  /* Figma Home (195:13546) recent-mission card: drone thumbnail, mission
     title, design-type row, edited time. */
  const recentCard = (pid: string, projectName: string, m: LibMission, testid: string) => {
    const isCurrent = current?.projectId === pid && current?.mission === m.name
    return (
      <LibraryCardFrame
        key={m.id}
        label={`${projectName} | ${m.name}`}
        className={isCurrent ? 'is-current' : undefined}
        testId={testid}
        actions={missionActions(pid, projectName, m)}
        starred={m.starred}
        onToggleStar={m.viewOnly ? undefined : () => toggleStar(pid, m.id)}
        onOpen={() => openMission(pid, projectName, m.id)}
      >
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
      </LibraryCardFrame>
    )
  }

  const sharedProjectCard = (project: (typeof SHARED_PROJECTS)[number]) => (
    <LibraryCardFrame
      key={project.id}
      label={project.name}
      testId={`ms-lib-shared-project-${project.id}`}
      actions={[{ id: 'open', label: 'Open', group: 'primary', onSelect: () => onOpenSharedProject(project.id) }]}
      onOpen={() => onOpenSharedProject(project.id)}
    >
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
          <span className='ms-lib-card-title'>
            {project.name}
          </span>
          <Badge count='View only' />
        </span>
        <span className='ms-lib-shared-owner'>
          <span className='ms-lib-avatar' aria-hidden='true'>{project.ownerInitials}</span>
          <span>{project.owner} · {project.workspace}</span>
        </span>
        <span className='ms-lib-card-edited'>{project.missions.length} mission{project.missions.length === 1 ? '' : 's'} · {project.sharedAgo}</span>
        <span className='ms-lib-shared-context'>{project.missions.map((mission) => `${mission.worldType} · ${mission.world}`).join(' / ')}</span>
      </span>
    </LibraryCardFrame>
  )

  const sharedMissionCard = (mission: (typeof SHARED_PROJECTS)[number]['missions'][number]) => (
    <article key={mission.id} className='ms-lib-card is-readonly' aria-label={mission.name}>
      <span className='ms-lib-thumb is-mission' aria-hidden='true'>
        <MissionThumbnail />
      </span>
      <span className='ms-lib-card-body'>
        <span className='ms-lib-card-toprow'>
          <span className='ms-lib-card-title'>{mission.name}</span>
          <Badge count='View only' />
        </span>
        {missionContext(mission)}
        <span className='ms-lib-card-edited'>{mission.editedAgo}</span>
      </span>
    </article>
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
      <ToastProvider toastManager={runEnvironmentToastManager}>
        <ToastPortal>
          <ToastViewport className='fixed bottom-4 left-4 right-auto mx-0 flex max-w-sm flex-col-reverse'>
            <RunEnvironmentToastList />
          </ToastViewport>
        </ToastPortal>
      </ToastProvider>
      <p className='ms-sr' role='status' aria-live='polite' data-testid='ms-lib-announce' />
      <header className='ms-lib-top'>
        <span
          className='ms-lib-brand'
          role='img'
          aria-label='SkyTrack'
          dangerouslySetInnerHTML={{ __html: skytrackLogoFull }}
        />
        <span className='ms-lib-top-actions'>
          {/* {section === 'home' && !activeProject ? (
            <Button size='sm' variant='default' data-testid='ms-lib-create' onClick={() => openCreateWizard()}>
              <PlusIcon aria-hidden='true' /> New Mission
            </Button>
          ) : null} */}

          {/* <Button
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
          </Button> */}

          <div className='ms-run-environment'>
            <span className='ms-run-environment-label'>Environment:</span>
            <TooltipProvider>
              <Tabs
                className='w-fit'
                value={runEnvironment}
                onValueChange={(value: unknown) => {
                  const next = value === 'local' ? 'local' : value === 'cloud' && canUseCloudSIM ? 'cloud' : null
                  if (!next || next === runEnvironment) return
                  setRunEnvironment(next)
                  runEnvironmentToastManager.add({
                    title: `Switched to ${next === 'local' ? 'Local Docker' : 'Cloud'}`
                  })
                }}
              >
                <TabsList variant='filled' aria-label='Running environment'>
                  <Tooltip>
                    <TooltipTrigger render={<span className='inline-flex' />}>
                      <TabsTab value='local' size='sm' aria-label='Local Docker'>
                        <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16' fill='none' aria-hidden='true'>
                          <circle cx='8' cy='8' r='7' fill='#1794D4' />
                          <path d='M9 3.5H8V4.5H9V3.5Z' fill='white' />
                          <path d='M5 5H6V6H5V5Z' fill='white' />
                          <path d='M3.00077 8.4707C3.08622 9.92135 3.95013 12 6.99999 12C10.4 12 11.9167 9.50001 12.25 8.25001C12.6667 8.25001 13.6 8.00001 14 7.00001C13.75 6.75 12.75 6.75 12.25 7.00001C12.25 6.60001 12 5.75 11.5 5.5C11.1667 5.83333 10.65 6.7 11.25 7.5C11 7.99999 10.3334 8 10 8H3.47145C3.20671 8 2.98521 8.20642 3.00077 8.4707Z' fill='white' />
                          <path d='M4.5 6.5H3.5V7.5H4.5V6.5Z' fill='white' />
                          <path d='M5 6.5H6V7.5H5V6.5Z' fill='white' />
                          <path d='M7.5 6.5H6.5V7.5H7.5V6.5Z' fill='white' />
                          <path d='M8 6.5H9V7.5H8V6.5Z' fill='white' />
                          <path d='M10.5 6.5H9.5V7.5H10.5V6.5Z' fill='white' />
                          <path d='M7.5 5H6.5V6H7.5V5Z' fill='white' />
                          <path d='M8 5H9V6H8V5Z' fill='white' />
                        </svg>
                      </TabsTab>
                    </TooltipTrigger>
                    <TooltipPortal>
                      <TooltipPositioner side='bottom' sideOffset={8}>
                        <TooltipPopup>
                          <TooltipArrow />
                          Uses your computer’s local CPU and memory. Requires Docker to be running.
                        </TooltipPopup>
                      </TooltipPositioner>
                    </TooltipPortal>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger render={<span className='inline-flex' tabIndex={canUseCloudSIM ? undefined : 0} aria-label={!canUseCloudSIM ? 'Cloud SIM access required' : undefined} />}>
                      <TabsTab value='cloud' size='sm' aria-label='Cloud' disabled={!canUseCloudSIM}>
                        <CloudIcon aria-hidden='true' size={16} />
                      </TabsTab>
                    </TooltipTrigger>
                    <TooltipPortal>
                      <TooltipPositioner side='bottom' sideOffset={8}>
                        <TooltipPopup>
                          <TooltipArrow />
                          {!canUseCloudSIM ? 'Cloud SIM access required. ' : ''}
                          Runs remotely via cloud infrastructure. Requires an active internet connection.
                        </TooltipPopup>
                      </TooltipPositioner>
                    </TooltipPortal>
                  </Tooltip>
                  <TabsIndicator variant='pill' />
                </TabsList>
              </Tabs>
            </TooltipProvider>
          </div>

          <Separator orientation='vertical' className='mx-1.5 h-auto self-stretch' />

          <Button
            size='sm'
            variant='outline'
            data-testid='ms-lib-restart'
            title='Mock — no update service in this prototype'
            onClick={() => onAnnounce('Restart to update is a mock in this prototype. No update was checked.')}
          >
            <DownloadIcon aria-hidden='true' /> Restart to update
          </Button>



          <Tooltip>
            <TooltipTrigger render={<span className='inline-flex' />}>
              <Button
                size='icon-sm'
                variant='outline'
                data-testid='ms-lib-restart'
                title='Mock — no update service in this prototype'
                onClick={() => onAnnounce('Join Discord is a mock in this prototype.')}
              >
                <DiscordLogoIcon weight='fill' aria-hidden='true' fill='#5865F2' />
              </Button>
            </TooltipTrigger>
            <TooltipPortal>
              <TooltipPositioner side='bottom' sideOffset={8}>
                <TooltipPopup>
                  <TooltipArrow />
                  Join Discord
                </TooltipPopup>
              </TooltipPositioner>
            </TooltipPortal>
          </Tooltip>

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
                    <MenuPopup aria-label='Workspaces' className='w-72'>
                      <MenuRadioGroup
                        value={activeWorkspace.id}
                        onValueChange={(value: string | null) => {
                          if (value) switchWorkspace(value)
                        }}
                      >
                        {WORKSPACES.map((workspace) => (
                          <MenuRadioItem key={workspace.id} value={workspace.id} inset>
                            <MenuRadioItemIndicator>
                              <CheckIcon aria-hidden='true' weight='bold' className='size-3.5' />
                            </MenuRadioItemIndicator>
                            <span>{workspace.name}</span>
                            <span className='ml-auto text-xs text-muted-foreground'>{workspace.role}</span>
                          </MenuRadioItem>
                        ))}
                      </MenuRadioGroup>
                    </MenuPopup>
                  </MenuPositioner>
                </MenuPortal>
              </Menu>
              <div className='ms-lib-workspace-role'>
                <Badge count={activeWorkspace.role} status='default' />
              </div>
            </div>
            <SkyTooltip><Button
              type='button'
              size='icon-xs'
              variant='ghost'
              className='ms-lib-workspace-settings'
              aria-label='Workspace settings'
              title='Workspace settings are a local prototype control.'
              onClick={() => onAnnounce(`Workspace settings for ${activeWorkspace.name} are a mock.`)}
            >
              <GearIcon aria-hidden='true' />
            </Button></SkyTooltip>
          </div>
          <div className='ms-lib-navgroup' role='group' aria-label={`${activeWorkspace.name} resources`}>
            {navBtn({ id: 'projects', label: 'Projects', icon: FoldersIcon }, false, '')}
            {navBtn({ id: 'worlds', label: 'Worlds', icon: GlobeHemisphereWestIcon }, false, '')}
            {navBtn({ id: 'drones', label: 'Drones', icon: DroneIcon }, false, '')}
            {navBtn({ id: 'aimodels', label: 'AI models', icon: PackageIcon }, false, '')}
          </div>

          <div className='ms-lib-side-foot'>
            {/* {!discordClosed ? (
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
            ) : null} */}
            <button
              type='button'
              data-testid='ms-lib-nav-logs'
              aria-current={section === 'logs' ? 'page' : undefined}
              className={`ms-lib-navitem${section === 'logs' ? ' is-active' : ''}`}
              onClick={() => goto('logs')}
            >
              <NotepadIcon aria-hidden='true' weight={section === 'logs' ? 'fill' : 'regular'} />
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
                <MenuPositioner side='right' align='end' sideOffset={-2}>
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
                    <MenuSeparator className='ms-lib-account-separator' />
                    <MenuItem
                      data-testid='ms-lib-account-profile'
                      onClick={() => setAccountPanel('profile')}
                    >
                      <UserIcon aria-hidden='true' /> Profile
                    </MenuItem>
                    <MenuItem
                      data-testid='ms-lib-account-settings'
                      onClick={() => setAccountPanel('settings')}
                    >
                      <GearIcon aria-hidden='true' /> Account settings
                    </MenuItem>
                    <MenuSubmenuRoot>
                      <MenuSubmenuTrigger data-testid='ms-lib-account-theme'>
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
                      data-testid='ms-lib-account-notifications'
                      onClick={() => setAccountPanel('notifications')}
                    >
                      <BellIcon aria-hidden='true' /> Notification settings
                    </MenuItem>
                    <MenuSeparator className='ms-lib-account-separator' />
                    <MenuItem
                      data-testid='ms-lib-account-switch'
                      onClick={() => setAccountPanel('switch')}
                    >
                      <UsersIcon aria-hidden='true' /> Switch account
                    </MenuItem>
                    <MenuItem
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
          data-section={section}
          aria-label={
            sharedView ? 'Shared accounts' : activeSharedProject ? 'Shared project detail' : activeProject ? 'Project detail' : section === 'home' ? 'Home' : 'Library'
          }
        >
          {sharedView ? (
            <section aria-labelledby='ms-lib-shared-title'>
              <LibraryPageHeader
                titleId='ms-lib-shared-title'
                title='Shared accounts'
                description={<p className='ms-lib-sub'>{sharedView.mission} · {sharedView.project}</p>}
                context={<button type='button' className='ms-lib-back' onClick={() => onOpenSharedAccounts(null)}><ArrowLeftIcon aria-hidden='true' /> Back</button>}
              />
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
              <LibraryPageHeader
                titleId='ms-lib-shared-project-title'
                title={activeSharedProject.name}
                description={<p className='ms-lib-sub'>Owned by {activeSharedProject.owner} · {activeSharedProject.workspace} · {activeSharedProject.sharedAgo}</p>}
                context={<button type='button' className='ms-lib-back' onClick={() => onOpenSharedProject(null)}><ArrowLeftIcon aria-hidden='true' /> Shared with me</button>}
                actions={<Badge count='View only' />}
              />
              <div className='ms-lib-grid' aria-label={`Missions in ${activeSharedProject.name}`}>
                {activeSharedProject.missions.map((mission) => sharedMissionCard(mission))}
              </div>
            </section>
          ) : activeProject ? (
            <section aria-labelledby='ms-lib-project-title'>
              <LibraryPageHeader
                titleId='ms-lib-project-title'
                title={activeProject.name}
                // description={<p className='ms-lib-sub'>{activeProject.missions.length} mission{activeProject.missions.length === 1 ? '' : 's'} · {activeWorkspace.name}</p>}
                context={<nav className='ms-lib-crumb' aria-label='Breadcrumb'><button type='button' className='ms-lib-crumb-link' onClick={() => onNavigate('projects', null)}>Projects</button><span aria-hidden='true'>›</span><span aria-current='page'>{activeProject.name}</span></nav>}
                actions={<span className='ms-lib-row-actions'>
                  <Button
                    size='sm'
                    variant='default'
                    data-testid='ms-lib-new-mission'
                    onClick={() => openCreateWizard(activeProject.id)}
                  >
                    <PlusIcon aria-hidden='true' /> New Mission
                  </Button>
                  <Menu>
                    <SkyTooltip><MenuTrigger aria-label={`More actions for ${activeProject.name}`} render={<Button variant='outline' size='icon-sm' className='text-muted-foreground' />}>
                      <DotsThreeVerticalIcon aria-hidden='true' />
                    </MenuTrigger></SkyTooltip>
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
                </span>}
              />
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
            <section aria-labelledby='ms-lib-home-title'>
              <LibraryPageHeader titleId='ms-lib-home-title' variant='plain' title='Welcome to SkyTrack' />
              <section aria-labelledby='ms-lib-recent-title' className='mb-8'>
                <div className='ms-section-header'>
                  <h2 id='ms-lib-recent-title'>Recent missions</h2>
                </div>
                <div className='ms-lib-grid is-recent' role='list' aria-label='Recent missions'>
                  {homeMissions
                    .slice(0, 5)
                    .map((e) => recentCard(e.projectId, e.project, e.mission, `ms-lib-recent-${e.mission.id}`))}
                </div>
              </section>
              <section aria-labelledby='ms-lib-templates-title'>
                <div className='ms-section-header'>
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
            </section>
          ) : section === 'recent' ? (
            <section aria-labelledby='ms-lib-recent-page-title'>
              <LibraryPageHeader titleId='ms-lib-recent-page-title' title='Recent' />
              {homeMissions.length === 0 ? (
                <LibraryEmptyState title='No recent missions' description='Missions in this Workspace will appear here.' />
              ) : (
                <div className='ms-lib-grid is-recent' aria-label='Recent missions'>
                  {homeMissions.map((entry) => recentCard(entry.projectId, entry.project, entry.mission, `ms-lib-recent-page-${entry.mission.id}`))}
                </div>
              )}
            </section>
          ) : section === 'projects' ? (
            <section aria-labelledby='ms-lib-projects-title'>
              <LibraryPageHeader
                titleId='ms-lib-projects-title'
                title='Projects'
                actions={<Button size='sm' variant='default' onClick={() => setProjectDlg({ mode: 'create' })}><PlusIcon aria-hidden='true' /> New Project</Button>}
              />
              <div className='ms-lib-grid' aria-label={`${activeWorkspace.name} Projects`}>
                {workspaceProjects.map((p) => projectCard(p))}
              </div>
            </section>
          ) : section === 'worlds' ? (
            <section aria-labelledby='ms-lib-worlds-title'>
              <LibraryPageHeader
                titleId='ms-lib-worlds-title'
                title='Worlds'
                description={<p className='ms-lib-sub'>3D reconstruction references and sample terrain for {activeWorkspace.name}.</p>}
                actions={<Button size='sm' variant='default' onClick={() => setWorldEditor({ mode: 'create', profile: newWorkspaceWorld(nextId('world'), activeWorkspace.id) })}><PlusIcon aria-hidden='true' /> Add World</Button>}
              />
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
                  <LibraryCardFrame
                    key={world.id}
                    label={world.name}
                    className='ms-lib-resource-card ms-lib-managed-resource-card'
                    actions={[
                      { id: 'edit', label: 'Edit', group: 'primary', onSelect: () => setWorldEditor({ mode: 'edit', profile: world }) },
                      { id: 'delete', label: 'Delete', group: 'destructive', destructive: true, onSelect: () => setDeleteWorldId(world.id) }
                    ]}
                  >
                    <span className='ms-lib-resource-icon'><GlobeHemisphereWestIcon aria-hidden='true' /></span>
                    <span className='ms-lib-card-body'>
                      <span className='ms-lib-card-title'>{world.name}</span>
                      <span className='ms-lib-card-desc'>3D World · {world.location || 'Location not specified'}</span>
                      <Badge count={world.status} status='secondary' size='sm' className='self-start' />
                      <span className='ms-lib-card-edited'>{worldSourceSummary(world)}</span>
                      <span className='ms-lib-card-edited'>{worldReconstructionSummary(world)}</span>
                    </span>
                  </LibraryCardFrame>
                ))}
              </div>
              {workspaceWorlds.length === 0 ? <LibraryEmptyState title='No Worlds yet' description='Add a 3D reconstruction record or use a sample fixture.' /> : null}
            </section>
          ) : section === 'drones' ? (
            <section aria-labelledby='ms-lib-drones-title'>
              <LibraryPageHeader
                titleId='ms-lib-drones-title'
                title='Drones'
                description={<p className='ms-lib-sub'>Reference builds and hardware profiles for this Workspace.</p>}
                actions={<Button size='sm' variant='default' onClick={() => setDroneEditor({ mode: 'create', profile: newDroneProfile(nextId('drone'), activeWorkspace.id) })}><PlusIcon aria-hidden='true' /> Add Drone</Button>}
              />
              <div className='ms-lib-grid is-resource-grid' aria-label='Drones'>
                {workspaceDrones.map((drone) => (
                  <LibraryCardFrame
                    key={drone.id}
                    label={drone.name}
                    className='ms-lib-resource-card ms-lib-drone-profile-card'
                    actions={[
                      { id: 'edit', label: 'Edit', group: 'primary', onSelect: () => setDroneEditor({ mode: 'edit', profile: drone }) },
                      { id: 'delete', label: 'Delete', group: 'destructive', destructive: true, onSelect: () => setDeleteDroneId(drone.id) }
                    ]}
                  >
                    <span className='ms-lib-resource-icon'><DroneIcon aria-hidden='true' /></span>
                    <span className='ms-lib-card-body'>
                      <span className='ms-lib-card-title'>{drone.name}</span>
                      <span className='ms-lib-card-desc'>{drone.firmwareFamily === 'Unspecified' ? 'Flight firmware not specified' : `${drone.firmwareFamily} flight firmware`}</span>
                      <span className='ms-lib-card-edited'>{drone.flightControllerModel || 'Flight controller not specified'}</span>
                      <span className='ms-lib-drone-component-count'>{drone.components.length} hardware components</span>
                    </span>
                  </LibraryCardFrame>
                ))}
              </div>
            </section>
          ) : section === 'starred' ? (
            <section aria-labelledby='ms-lib-starred-title'>
              <LibraryPageHeader titleId='ms-lib-starred-title' title='Starred missions' />
              {starredMissions.length === 0 ? (
                <LibraryEmptyState title='No starred missions yet' description='Star a mission from a project to keep it close at hand.' />
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
              <LibraryPageHeader titleId='ms-lib-sharedme-title' title='Shared with me' description={<p className='ms-lib-sub'>Projects shared by people in other Workspaces.</p>} />
              <div className='ms-lib-grid' aria-label='Projects shared with me'>
                {SHARED_PROJECTS.map((project) => sharedProjectCard(project))}
              </div>
            </section>
          ) : section === 'templates' ? (
            activeTemplate ? (
              <section aria-labelledby='ms-lib-template-title'>
                <LibraryPageHeader
                  titleId='ms-lib-template-title'
                  title={activeTemplate.title}
                  description={<p className='ms-lib-sub'>{activeTemplate.byline} · full template content arrives with backend templates</p>}
                  context={<button type='button' className='ms-lib-back' onClick={() => onOpenTemplate(null)}><ArrowLeftIcon aria-hidden='true' /> Mission templates</button>}
                  actions={<Button size='sm' variant='default' onClick={() => useTemplate(activeTemplate)}>Use template</Button>}
                />
                <div className='ms-lib-detail'>
                  <span className={`ms-lib-thumb is-template large tint-${activeTemplate.id.charCodeAt(1) % 6}`} aria-hidden='true'>
                    <img src={getTemplateThumbnail(activeTemplate.id)} alt='' className='ms-template-thumbnail' />
                  </span>
                  <div className='ms-lib-detail-body'>
                    <p className='ms-lib-desc'>{activeTemplate.desc}</p>
                  </div>
                </div>
              </section>
            ) : (
              <section aria-labelledby='ms-lib-templates-page-title'>
                <LibraryPageHeader
                  titleId='ms-lib-templates-page-title'
                  title='Mission templates'
                  description={<p className='ms-lib-sub'>Learn SkyTrack with Mission templates</p>}
                  footer={<div className='ms-lib-search'><FieldRoot name='template-search'><FieldLabel className='ms-sr'>Search templates</FieldLabel><FieldControl value={query} onValueChange={(v) => setQuery(typeof v === 'string' ? v : '')} placeholder='Search templates' aria-label='Search templates' /></FieldRoot></div>}
                />
                {debouncedQuery.trim() !== '' ? (
                  <p className='ms-lib-sub' role='status'>
                    {filteredTemplates.length} result{filteredTemplates.length === 1 ? '' : 's'} for &ldquo;
                    {debouncedQuery.trim()}&rdquo;
                  </p>
                ) : null}
                {filteredTemplates.length === 0 ? (
                  <LibraryEmptyState title='No templates found' description={`No templates match "${debouncedQuery.trim()}" in this mock list.`} />
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
              <LibraryPageHeader titleId='ms-lib-learn-page-title' title='Learn' description={<p className='ms-lib-sub'>Guides from the SkyTrack help center open in a new tab.</p>} />
              <div className='ms-lib-grid is-templates'>
                <LibraryCardFrame
                  label={LEARN_FEATURED.title}
                  actions={[{
                    id: 'open',
                    label: 'Open',
                    group: 'primary',
                    onSelect: () => window.open(LEARN_FEATURED.url, '_blank', 'noopener,noreferrer')
                  }]}
                >
                  <span className='ms-lib-thumb is-learn tint-3' aria-hidden='true'>
                    <BookOpenIcon />
                  </span>
                  <span className='ms-lib-card-body'>
                    <a className='ms-lib-card-title is-link' href={LEARN_FEATURED.url} target='_blank' rel='noreferrer'>
                      {LEARN_FEATURED.title} <ArrowSquareOutIcon aria-hidden='true' className='ms-lib-inline-icon' />
                    </a>
                    <span className='ms-lib-card-desc'>{LEARN_FEATURED.desc}</span>
                  </span>
                </LibraryCardFrame>
                <LibraryCardFrame
                  label='SkyTrack help center'
                  actions={[{
                    id: 'open',
                    label: 'Open',
                    group: 'primary',
                    onSelect: () => window.open(LEARN_URL, '_blank', 'noopener,noreferrer')
                  }]}
                >
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
                </LibraryCardFrame>
              </div>
            </section>
          ) : section === 'aimodels' ? (
            <section aria-labelledby='ms-lib-aimodels-title'>
              <Tabs className='ms-ai-model-tabs' value={aiModelCategory} onValueChange={(value: unknown) => setAIModelCategory(String(value))}>
                <LibraryPageHeader
                  titleId='ms-lib-aimodels-title'
                  title='AI models'
                  description={<p className='ms-lib-sub'>Import model packages for this Workspace. Models are not run or deployed.</p>}
                  actions={(
                    <div className='ms-ai-model-header-actions'>
                      <Button size='sm' variant='default' onClick={() => setImportModelOpen(true)}><PlusIcon aria-hidden='true' /> Import model</Button>
                    </div>
                  )}
                  footerVariant='tabs'
                  footer={<TabsList variant='standard' aria-label='AI model categories'><TabsTab variant='standard' value='workspace'>Workspace ({workspaceAIModels.length})</TabsTab><TabsTab variant='standard' value='uploaded'>Uploaded by you ({uploadedAIModels.length})</TabsTab><TabsIndicator variant='underline' /></TabsList>}
                />
                <TabsPanel className='ms-ai-model-panel' value='workspace'>
                  {workspaceAIModels.length === 0 ? <LibraryEmptyState title='No Workspace models yet' description='SkyTrack models shared with this Workspace will appear here.' /> : (
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
                  {uploadedAIModels.length === 0 ? <LibraryEmptyState title='No uploaded models yet' description='Import a model package to add it to your personal list.' /> : (
                    <div className='ms-lib-grid is-resource-grid is-ai-models' aria-label='AI models uploaded by you'>
                      {uploadedAIModels.map((model) => (
                        <LibraryCardFrame
                          key={model.id}
                          label={model.name}
                          className='ms-lib-resource-card ms-lib-managed-resource-card'
                          testId={`ms-lib-ai-model-${model.id}`}
                          actions={[
                            { id: 'remove', label: 'Remove', group: 'destructive', destructive: true, onSelect: () => setDeleteModelId(model.id) }
                          ]}
                        >
                          <span className='ms-lib-resource-icon'><PackageIcon aria-hidden='true' /></span>
                          <span className='ms-lib-card-body'>
                            <span className='ms-lib-card-title'>{model.name}</span>
                            <span className='ms-lib-card-desc'>{model.packageFileName || model.assetReference}</span>
                            <span className='ms-lib-card-edited'>{model.packageFileSize ? `${(model.packageFileSize / (1024 * 1024)).toFixed(1)} MB` : 'Package size unavailable'} · {model.status}</span>
                          </span>
                        </LibraryCardFrame>
                      ))}
                    </div>
                  )}
                </TabsPanel>
              </Tabs>
            </section>
          ) : section === 'logs' ? (
            <section aria-labelledby='ms-lib-logs-title'>
              <LibraryPageHeader titleId='ms-lib-logs-title' title='Logs' />
              <LibraryEmptyState title='No logs yet' description='Flight and build logs will appear here (mock).' />
            </section>
          ) : section === 'notifications' ? (
            <section aria-labelledby='ms-lib-notifications-title'>
              <LibraryPageHeader titleId='ms-lib-notifications-title' title='Notifications' />
              <LibraryEmptyState title='No notifications yet' description='Workspace updates and mission activity will appear here (mock).' />
            </section>
          ) : (
            <section className='ms-placeholder' aria-label={`${section} placeholder`}>
              <LibraryPageHeader titleId='ms-lib-placeholder-title' title={section} />
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
        onLogout={onLogout}
      />
    </div>
  )
}
