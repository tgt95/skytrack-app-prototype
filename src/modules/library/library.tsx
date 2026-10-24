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

import { useEffect, useState } from 'react'

import { seedTemplates, type LibTemplate } from './database/store'
import {
  newDroneProfile,
  type WorkspaceDroneProfile
} from './database/drone-store'
import {
  newWorkspaceWorld,
  selectableWorldsForWorkspace,
  type WorkspaceWorldRecord
} from './database/workspace-resources-store'
import {
  getSharedProject,
  getWorkspace,
  readActiveWorkspaceId,
  saveActiveWorkspaceId,
  SHARED_PROJECTS
} from './workspace-data'
import LibraryDialogsHost from './library-dialogs-host'
import LibraryAnnounceRegion from './library-announce-region'
import LibrarySidebar from './library-sidebar'
import LibraryTopbar from './library-topbar'
import LibraryMainContent from './library-main-content'
import { useWorkspaceResources } from './use-workspace-resources'
import { useLibraryProjects } from './use-library-projects'
import { useLibraryAccountSettings } from './use-library-account-settings'
import { useLibraryCardRenderers } from './library-card-renderers'
import { templateSearchAnnouncement, useTemplateSearch } from './use-template-search'
import type { LibraryEntry, LibrarySection } from './library-types'

export type { LibraryEntry, LibrarySection } from './library-types'

/* Seeds live in `modules/library/database/*.json` (see `modules/library/database/store.ts`); the
   pixel-observed notes moved there with the data. */
const TEMPLATES: LibTemplate[] = seedTemplates()

let localId = 100
function nextId(prefix: string): string {
  localId += 1
  return `${prefix}-local-${Date.now().toString(36)}-${localId}`
}

export default function StudioLibrary({
  announce,
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
  announce: string
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
  const [aiModelCategory, setAIModelCategory] = useState('workspace')
  const [runEnvironment, setRunEnvironment] = useState<'local' | 'cloud'>('local')
  const {
    accountProfile,
    notificationPreferences,
    accountPanel,
    setAccountPanel,
    themePreference,
    updateAccountProfile,
    updateNotificationPreferences,
    updateThemePreference
  } = useLibraryAccountSettings(onAnnounce)
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(readActiveWorkspaceId)
  const activeWorkspace = getWorkspace(activeWorkspaceId)
  const canUseCloudSIM = activeWorkspace.role === 'Admin'
  useEffect(() => {
    if (!canUseCloudSIM) setRunEnvironment('local')
  }, [activeWorkspace.id, canUseCloudSIM])
  const {
    projects, workspaceProjects, homeMissions, starredMissions,
    missionDlg, setMissionDlg, projectDlg, setProjectDlg, shareDlg, setShareDlg,
    deleteMission, setDeleteMission, deleteProject, setDeleteProject, cloneTarget, setCloneTarget,
    wizardOpen, setWizardOpen, wizardKey, wizardSeed, openCreateWizard, openProject, openMission,
    toggleStar, submitMissionDlg, submitProjectDlg, confirmDeleteMission, confirmDeleteProject,
    cloneMission, submitWizard, shareMission
  } = useLibraryProjects({
    activeWorkspaceId: activeWorkspace.id,
    projectId,
    onNavigate,
    onOpenMission,
    onAnnounce
  })
  const { query, setQuery, debouncedQuery, filteredTemplates } = useTemplateSearch(TEMPLATES)
  useEffect(() => {
    const searchTerm = debouncedQuery.trim()
    if (section !== 'templates' || !searchTerm) return
    onAnnounce(templateSearchAnnouncement(filteredTemplates.length, searchTerm))
  }, [debouncedQuery, filteredTemplates.length, onAnnounce, section])
  const [droneEditor, setDroneEditor] = useState<{ mode: 'create' | 'edit'; profile: WorkspaceDroneProfile } | null>(null)
  const [deleteDroneId, setDeleteDroneId] = useState<string | null>(null)
  const [worldEditor, setWorldEditor] = useState<{ mode: 'create' | 'edit'; profile: WorkspaceWorldRecord } | null>(null)
  const [deleteWorldId, setDeleteWorldId] = useState<string | null>(null)
  const [importModelOpen, setImportModelOpen] = useState(false)
  const [deleteModelId, setDeleteModelId] = useState<string | null>(null)
  const {
    workspaceDrones,
    workspaceWorlds,
    workspaceAIModels,
    uploadedAIModels,
    sourceMissions,
    droneToDelete,
    deleteDroneReferences,
    worldToDelete,
    deleteWorldReferences,
    modelToDelete,
    existingAIModelNames,
    saveDroneProfile: persistDroneProfile,
    deleteDroneProfile,
    saveWorldProfile: persistWorldProfile,
    deleteWorldProfile,
    importAIModel: persistAIModel,
    deleteAIModel: persistAIModelRemoval
  } = useWorkspaceResources({
    workspaceId: activeWorkspace.id,
    workspaceName: activeWorkspace.name,
    projects,
    deleteDroneId,
    deleteWorldId,
    deleteModelId,
    createId: nextId,
    onAnnounce
  })

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
  const goto = (next: LibrarySection) => {
    onNavigate(next, null)
    onAnnounce(`${next === 'home' ? 'Home' : next}. Local preview.`)
  }

  const switchWorkspace = (id: string) => {
    const nextWorkspace = getWorkspace(id)
    setActiveWorkspaceId(nextWorkspace.id)
    saveActiveWorkspaceId(nextWorkspace.id)
    onNavigate('projects', null)
    onAnnounce(`${nextWorkspace.name} selected. Workspace resources updated.`)
  }

  const saveDroneProfile = (profile: WorkspaceDroneProfile) => {
    if (!droneEditor) return
    if (persistDroneProfile(profile, droneEditor.mode, droneEditor.profile.name)) setDroneEditor(null)
  }

  const deleteDrone = () => {
    if (!deleteDroneId || deleteDroneReferences.length > 0) return
    if (deleteDroneProfile(deleteDroneId)) setDeleteDroneId(null)
  }

  const saveWorldProfile = (profile: WorkspaceWorldRecord) => {
    if (!worldEditor) return
    if (persistWorldProfile(profile, worldEditor.mode)) setWorldEditor(null)
  }

  const deleteWorld = () => {
    if (!deleteWorldId || deleteWorldReferences.length > 0) return
    if (deleteWorldProfile(deleteWorldId)) setDeleteWorldId(null)
  }

  const importAIModel = ({ name, fileName, fileSize }: { name: string; fileName: string; fileSize: number }) => {
    const saved = persistAIModel({ name, fileName, fileSize })
    if (saved) setAIModelCategory('uploaded')
    return saved
  }

  const deleteAIModel = () => {
    if (!deleteModelId || !modelToDelete) return
    if (persistAIModelRemoval(deleteModelId)) setDeleteModelId(null)
  }

  const { missionCard, projectCard, templateCard, recentCard, sharedProjectCard, sharedMissionCard } = useLibraryCardRenderers({
    current,
    openMission,
    openProject,
    toggleStar,
    setMissionDlg,
    setProjectDlg,
    setShareDlg,
    setDeleteMission,
    setDeleteProject,
    setCloneTarget,
    onOpenSharedAccounts,
    onOpenSharedProject
  })

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

  const dialogProps = {
    missionDlg, setMissionDlg, submitMissionDlg,
    wizardOpen, setWizardOpen, wizardKey, workspaceProjects, wizardSeed, workspaceDrones,
    worlds: selectableWorldsForWorkspace(activeWorkspace.id), submitWizard,
    projectDlg, setProjectDlg, submitProjectDlg, droneEditor, setDroneEditor,
    saveDroneProfile, worldEditor, setWorldEditor, sourceMissions, saveWorldProfile,
    importModelOpen, setImportModelOpen, existingAIModelNames, importAIModel,
    shareDlg, setShareDlg, shareMission, cloneTarget, setCloneTarget, cloneMission,
    deleteMission, setDeleteMission, confirmDeleteMission, deleteProject, setDeleteProject,
    confirmDeleteProject, deleteDroneId, setDeleteDroneId, activeWorkspace,
    droneToDelete, deleteDroneReferences, deleteDrone, deleteWorldId, setDeleteWorldId,
    worldToDelete, deleteWorldReferences, deleteWorld, deleteModelId, setDeleteModelId,
    modelToDelete, deleteAIModel, accountPanel, setAccountPanel, accountProfile,
    notificationPreferences, updateAccountProfile, updateNotificationPreferences, onAnnounce, onLogout
  }

  return (
    <div className='ms-lib'>

      <LibraryAnnounceRegion announce={announce} />
      <LibraryTopbar runEnvironment={runEnvironment} canUseCloudSIM={canUseCloudSIM} onEnvironmentChange={setRunEnvironment} onAnnounce={onAnnounce} />

      <div className='ms-lib-body'>
        <LibrarySidebar
          section={section}
          hasStarredMissions={starredMissions.length > 0}
          isSharedAccountsDetail={sharedView !== null}
          activeWorkspace={activeWorkspace}
          accountProfile={accountProfile}
          themePreference={themePreference}
          onNavigateSection={goto}
          onSwitchWorkspace={switchWorkspace}
          onAnnounce={onAnnounce}
          onOpenAccountPanel={setAccountPanel}
          onUpdateThemePreference={updateThemePreference}
        />

        <LibraryMainContent
          section={section}
          sharedView={sharedView}
          activeSharedProject={activeSharedProject}
          activeProject={activeProject}
          workspaceName={activeWorkspace.name}
          workspaceProjects={workspaceProjects}
          workspaceWorlds={workspaceWorlds}
          workspaceDrones={workspaceDrones}
          workspaceAIModels={workspaceAIModels}
          uploadedAIModels={uploadedAIModels}
          sharedProjects={SHARED_PROJECTS}
          category={aiModelCategory}
          onCategoryChange={setAIModelCategory}
          homeMissions={homeMissions}
          starredMissions={starredMissions}
          templates={TEMPLATES}
          activeTemplate={activeTemplate}
          filteredTemplates={filteredTemplates}
          query={query}
          debouncedQuery={debouncedQuery}
          onQueryChange={setQuery}
          renderMissionCard={(pid, name, mission, key) => missionCard(pid, name, mission, key)}
          renderRecent={(entry, testId) => recentCard(entry.projectId, entry.project, entry.mission, testId)}
          renderProjectCard={projectCard}
          renderTemplate={templateCard}
          renderSharedProject={sharedProjectCard}
          renderSharedMission={sharedMissionCard}
          onNavigate={onNavigate}
          onCreateMission={openCreateWizard}
          onCreateProject={() => setProjectDlg({ mode: 'create' })}
          onRenameProject={(project) => setProjectDlg({ mode: 'rename', projectId: project.id, initialName: project.name })}
          onDeleteProject={(project) => setDeleteProject({ projectId: project.id, name: project.name, missionCount: project.missions.length })}
          onOpenSharedAccounts={onOpenSharedAccounts}
          onOpenSharedProject={onOpenSharedProject}
          onOpenTemplate={onOpenTemplate}
          onOpenTemplateDetail={openTemplateDetail}
          onUseTemplate={useTemplate}
          onCreateWorld={() => setWorldEditor({ mode: 'create', profile: newWorkspaceWorld(nextId('world'), activeWorkspace.id) })}
          onEditWorld={(world) => setWorldEditor({ mode: 'edit', profile: world })}
          onDeleteWorld={setDeleteWorldId}
          onCreateDrone={() => setDroneEditor({ mode: 'create', profile: newDroneProfile(nextId('drone'), activeWorkspace.id) })}
          onEditDrone={(drone) => setDroneEditor({ mode: 'edit', profile: drone })}
          onDeleteDrone={setDeleteDroneId}
          onImportAIModel={() => setImportModelOpen(true)}
          onDeleteAIModel={setDeleteModelId}
          onGoHome={() => goto('home')}
        />
      </div>

      <LibraryDialogsHost {...dialogProps} />
    </div>
  )
}
