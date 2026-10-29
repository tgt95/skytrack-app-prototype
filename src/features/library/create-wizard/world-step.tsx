import { useRef } from 'react'
import { GlobeHemisphereWestIcon } from '@phosphor-icons/react'
import { Button } from 'skytrack-ui/button'
import {
  Attachment,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from 'skytrack-ui/attachment'
import { Dropzone } from 'skytrack-ui/dropzone'
import { RadioGroup, RadioRoot } from 'skytrack-ui/radio'
import { Tabs, TabsList, TabsPanel, TabsTab } from 'skytrack-ui/tabs'
import { FieldDescription, FieldLabel, FieldRoot } from 'skytrack-ui/field'
import type { WorkspaceWorldRecord } from '../database/workspace-resources-store'

type WorldType = '2D' | '3D'

type WorldStepProps = {
  worldType: WorldType
  onWorldTypeChange: (worldType: WorldType) => void
  worlds: WorkspaceWorldRecord[]
  worldId: string
  onWorldSelect: (worldId: string) => void
  onImportWorld: (file: File) => void
  importingWorld: boolean
  worldImportError: string | null
  worldImportMessage: string | null
  terrainFile: string | null
  onTerrainFileSelect: (fileName: string) => void
}

export function WorldStep ({
  worldType,
  onWorldTypeChange,
  worlds,
  worldId,
  onWorldSelect,
  onImportWorld,
  importingWorld,
  worldImportError,
  worldImportMessage,
  terrainFile,
  onTerrainFileSelect
}: WorldStepProps) {
  const worldFileInputRef = useRef<HTMLInputElement>(null)

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
              <div className='flex w-full flex-row items-center justify-between gap-3'>
                <FieldLabel id='ms-wizard-world-label'>World list</FieldLabel>
                <Button
                  type='button'
                  size='sm'
                  variant='link'
                  disabled={importingWorld}
                  onClick={() => worldFileInputRef.current?.click()}
                >
                  {importingWorld ? 'Importing…' : 'Import world'}
                </Button>
                <input
                  ref={worldFileInputRef}
                  type='file'
                  accept='.glb,model/gltf-binary'
                  className='sr-only'
                  tabIndex={-1}
                  aria-label='Choose a 3D World GLB file'
                  data-testid='ms-wizard-world-file-input'
                  onChange={event => {
                    const file = event.currentTarget.files?.[0]
                    if (file) onImportWorld(file)
                    event.currentTarget.value = ''
                  }}
                />
              </div>
              <RadioGroup
                value={worldId}
                onValueChange={(value: unknown) => onWorldSelect(String(value))}
                aria-labelledby='ms-wizard-world-label'
                className='w-full'
              >
                {worlds.map(world => (
                  <label key={world.id} className='block w-full cursor-pointer'>
                    <Attachment
                      data-selected={world.id === worldId}
                      className='w-full gap-2.5 px-3 py-2.5 transition-colors hover:border-primary/60 data-[selected=true]:border-primary has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring'
                    >
                      <AttachmentMedia>
                        <GlobeHemisphereWestIcon
                          aria-hidden='true'
                          className='size-5 text-muted-foreground'
                        />
                      </AttachmentMedia>
                      <AttachmentContent className='gap-1'>
                        <AttachmentTitle>{world.name}</AttachmentTitle>
                        <AttachmentDescription className='w-fit rounded-(--radius-sm) bg-muted px-2 py-0.5 font-semibold'>
                          {world.status}
                        </AttachmentDescription>
                      </AttachmentContent>
                      <RadioRoot
                        value={world.id}
                        aria-label={`${world.name} · ${world.status}`}
                      />
                    </Attachment>
                  </label>
                ))}
              </RadioGroup>
              {worlds.length === 0 ? (
                <FieldDescription>
                  Import a .glb file to add a 3D World. Imported files stay in
                  this browser.
                </FieldDescription>
              ) : (
                <FieldDescription>
                  Select a World or import a .glb file. Imported models stay in
                  this browser and replace the 3D World in the mission.
                </FieldDescription>
              )}
              {importingWorld ? (
                <FieldDescription role='status'>
                  Importing the GLB and creating its local preview…
                </FieldDescription>
              ) : null}
              {worldImportMessage ? (
                <FieldDescription role='status'>
                  {worldImportMessage}
                </FieldDescription>
              ) : null}
              {worldImportError ? (
                <FieldDescription role='alert'>
                  {worldImportError}
                </FieldDescription>
              ) : null}
            </FieldRoot>
          </TabsPanel>
        </Tabs>
      </FieldRoot>
      {worldType === '2D' ? (
        <FieldRoot name={worldType} data-testid='ms-wizard-dropzone'>
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
        </FieldRoot>
      ) : null}
    </TabsPanel>
  )
}
