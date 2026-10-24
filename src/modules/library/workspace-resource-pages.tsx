import { DroneIcon, GlobeHemisphereWestIcon, PackageIcon, PlusIcon } from '@phosphor-icons/react'
import { Badge } from 'skytrack-ui/badge'
import { Button } from 'skytrack-ui/button'
import { Tabs, TabsIndicator, TabsList, TabsPanel, TabsTab } from 'skytrack-ui/tabs'
import type { WorkspaceDroneProfile } from './database/drone-store'
import type { WorkspaceAIModelRecord, WorkspaceWorldRecord } from './database/workspace-resources-store'
import { LibraryCardFrame, LibraryEmptyState, LibraryPageHeader } from './library-presentation'

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

export function WorldsPage({
  workspaceName,
  worlds,
  onCreate,
  onEdit,
  onDelete
}: {
  workspaceName: string
  worlds: WorkspaceWorldRecord[]
  onCreate: () => void
  onEdit: (world: WorkspaceWorldRecord) => void
  onDelete: (worldId: string) => void
}) {
  return (
    <section aria-labelledby='ms-lib-worlds-title'>
      <LibraryPageHeader
        titleId='ms-lib-worlds-title'
        title='Worlds'
        description={<p className='ms-lib-sub'>3D reconstruction references and sample terrain for {workspaceName}.</p>}
        actions={<Button size='sm' variant='default' onClick={onCreate}><PlusIcon aria-hidden='true' /> Add World</Button>}
      />
      <div className='ms-lib-grid is-resource-grid' aria-label={`${workspaceName} Worlds`}>
        <article className='ms-lib-card ms-lib-resource-card is-readonly'>
          <span className='ms-lib-resource-icon'><GlobeHemisphereWestIcon aria-hidden='true' /></span>
          <span className='ms-lib-card-body'>
            <span className='ms-lib-card-title'>Blank space</span>
            <span className='ms-lib-card-desc'>2D system World · no terrain source</span>
            <span className='ms-lib-card-edited'>System · not editable</span>
          </span>
        </article>
        {worlds.map((world) => (
          <LibraryCardFrame
            key={world.id}
            label={world.name}
            className='ms-lib-resource-card ms-lib-managed-resource-card'
            actions={[
              { id: 'edit', label: 'Edit', group: 'primary', onSelect: () => onEdit(world) },
              { id: 'delete', label: 'Delete', group: 'destructive', destructive: true, onSelect: () => onDelete(world.id) }
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
      {worlds.length === 0 ? <LibraryEmptyState title='No Worlds yet' description='Add a 3D reconstruction record or use a sample fixture.' /> : null}
    </section>
  )
}

export function DronesPage({
  workspaceName,
  drones,
  onCreate,
  onEdit,
  onDelete
}: {
  workspaceName: string
  drones: WorkspaceDroneProfile[]
  onCreate: () => void
  onEdit: (drone: WorkspaceDroneProfile) => void
  onDelete: (droneId: string) => void
}) {
  return (
    <section aria-labelledby='ms-lib-drones-title'>
      <LibraryPageHeader
        titleId='ms-lib-drones-title'
        title='Drones'
        description={<p className='ms-lib-sub'>Reference builds and hardware profiles for {workspaceName}.</p>}
        actions={<Button size='sm' variant='default' onClick={onCreate}><PlusIcon aria-hidden='true' /> Add Drone</Button>}
      />
      <div className='ms-lib-grid is-resource-grid' aria-label='Drones'>
        {drones.map((drone) => (
          <LibraryCardFrame
            key={drone.id}
            label={drone.name}
            className='ms-lib-resource-card ms-lib-drone-profile-card'
            actions={[
              { id: 'edit', label: 'Edit', group: 'primary', onSelect: () => onEdit(drone) },
              { id: 'delete', label: 'Delete', group: 'destructive', destructive: true, onSelect: () => onDelete(drone.id) }
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
  )
}

export function AIModelsPage({
  workspaceName,
  workspaceModels,
  uploadedModels,
  category,
  onCategoryChange,
  onImport,
  onDelete
}: {
  workspaceName: string
  workspaceModels: WorkspaceAIModelRecord[]
  uploadedModels: WorkspaceAIModelRecord[]
  category: string
  onCategoryChange: (category: string) => void
  onImport: () => void
  onDelete: (modelId: string) => void
}) {
  return (
    <section aria-labelledby='ms-lib-aimodels-title'>
      <Tabs className='ms-ai-model-tabs' value={category} onValueChange={(value: unknown) => onCategoryChange(String(value))}>
        <LibraryPageHeader
          titleId='ms-lib-aimodels-title'
          title='AI models'
          description={<p className='ms-lib-sub'>Import model packages for this Workspace. Models are not run or deployed.</p>}
          actions={<div className='ms-ai-model-header-actions'><Button size='sm' variant='default' onClick={onImport}><PlusIcon aria-hidden='true' /> Import model</Button></div>}
          footerVariant='tabs'
          footer={<TabsList variant='standard' aria-label='AI model categories'><TabsTab variant='standard' value='workspace'>Workspace ({workspaceModels.length})</TabsTab><TabsTab variant='standard' value='uploaded'>Uploaded by you ({uploadedModels.length})</TabsTab><TabsIndicator variant='underline' /></TabsList>}
        />
        <TabsPanel className='ms-ai-model-panel' value='workspace'>
          {workspaceModels.length === 0 ? <LibraryEmptyState title='No Workspace models yet' description='SkyTrack models shared with this Workspace will appear here.' /> : (
            <div className='ms-lib-grid is-resource-grid is-ai-models' aria-label={`${workspaceName} AI models`}>
              {workspaceModels.map((model) => (
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
          {uploadedModels.length === 0 ? <LibraryEmptyState title='No uploaded models yet' description='Import a model package to add it to your personal list.' /> : (
            <div className='ms-lib-grid is-resource-grid is-ai-models' aria-label='AI models uploaded by you'>
              {uploadedModels.map((model) => (
                <LibraryCardFrame
                  key={model.id}
                  label={model.name}
                  className='ms-lib-resource-card ms-lib-managed-resource-card'
                  testId={`ms-lib-ai-model-${model.id}`}
                  actions={[{ id: 'remove', label: 'Remove', group: 'destructive', destructive: true, onSelect: () => onDelete(model.id) }]}
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
  )
}
