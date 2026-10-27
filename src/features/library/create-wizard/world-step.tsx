import { GlobeHemisphereWestIcon } from '@phosphor-icons/react'
import { Dropzone } from 'skytrack-ui/dropzone'
import { RadioGroup, RadioRoot } from 'skytrack-ui/radio'
import { Tabs, TabsList, TabsPanel, TabsTab } from 'skytrack-ui/tabs'
import { FieldLabel, FieldRoot } from 'skytrack-ui/field'
import type { WorkspaceWorldRecord } from '../database/workspace-resources-store'

type WorldType = '2D' | '3D'

type WorldStepProps = {
  worldType: WorldType
  onWorldTypeChange: (worldType: WorldType) => void
  worlds: WorkspaceWorldRecord[]
  worldId: string
  onWorldSelect: (worldId: string) => void
  terrainFile: string | null
  onTerrainFileSelect: (fileName: string) => void
}

export function WorldStep ({
  worldType,
  onWorldTypeChange,
  worlds,
  worldId,
  onWorldSelect,
  terrainFile,
  onTerrainFileSelect
}: WorldStepProps) {
  return (
    <TabsPanel value='2'>
      <FieldRoot name={worldType}>
        <FieldLabel id='ms-wizard-worldtype-label'>World type</FieldLabel>
        <Tabs
          value={worldType}
          onValueChange={value => {
            if (value === '2D' || value === '3D') {
              onWorldTypeChange(value)
            }
          }}
          data-testid='ms-wizard-mode-tabs'
          className='flex flex-col gap-4'
        >
          <TabsList
            variant='filled'
            aria-labelledby='ms-wizard-worldtype-label'
            data-testid='ms-wizard-toggle'
          >
            <TabsTab value='2D' variant='filled'>
              2D
            </TabsTab>
            <TabsTab value='3D' variant='filled'>
              3D
            </TabsTab>
          </TabsList>
          <TabsPanel value='2D' />
          <TabsPanel value='3D'>
            <FieldRoot>
              <FieldLabel id='ms-wizard-world-label' className='w-full flex flex-row justify-between gap-3'>
                World list
                <a href='#' className='text-sm leading-none font-medium text-primary hover:text-primary/80'>Import world</a>
              </FieldLabel>
              <RadioGroup
                value={worldId}
                onValueChange={(value: unknown) => onWorldSelect(String(value))}
                aria-labelledby='ms-wizard-world-label'
                className='w-full'
              >
                {worlds.map(world => (
                  <label key={world.id} className='ms-wizard-radio-row'>
                    <span className='ms-wizard-thumb' aria-hidden='true'>
                      <GlobeHemisphereWestIcon
                        aria-hidden='true'
                        className='w-9 h-9 text-muted-foreground'
                      />
                    </span>
                    <span className='ms-wizard-row-text'>
                      {world.name}
                      <span className='ms-wizard-tags'>
                        <span className='ms-wizard-tag'>{world.status}</span>
                      </span>
                    </span>
                    <RadioRoot
                      value={world.id}
                      aria-label={`${world.name} · ${world.status}`}
                    />
                  </label>
                ))}
              </RadioGroup>
              {worlds.length === 0 ? (
                <p className='ms-hint'>
                  Add or register a World in this Workspace before creating a 3D
                  mission.
                </p>
              ) : null}
            </FieldRoot>
          </TabsPanel>
        </Tabs>
      </FieldRoot>
      {worldType === '2D' ? (
        <FieldRoot name={worldType}>
          <FieldLabel id='ms-wizard-terrain-label'>
            Terrain layer (Optional)
          </FieldLabel>
          <Dropzone
            className='w-full'
            data-testid='ms-wizard-filebtn'
            aria-labelledby='ms-wizard-terrain-label'
            hint={terrainFile ?? 'Choose a file or drag it here to upload.'}
            buttonLabel='Choose File'
            multiple={false}
            onFilesSelected={files => {
              const file = files[0]
              if (file) onTerrainFileSelect(file.name)
            }}
          />
          {/* <div
              data-testid='ms-wizard-dropzone'
              className='w-full contents'
            ></div> */}
        </FieldRoot>
      ) : null}
    </TabsPanel>
  )
}
