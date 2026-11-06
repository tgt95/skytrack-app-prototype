import { useState } from 'react'
import {
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogFooter,
  DialogHeader,
  DialogPopup,
  DialogPortal,
  DialogTitle
} from 'skytrack-ui/dialog'
import { FieldLabel, FieldRoot, FieldDescription } from 'skytrack-ui/field'
import { Dropzone } from 'skytrack-ui/dropzone'
import {
  Select,
  SelectIcon,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
  SelectList,
  SelectPopup,
  SelectPortal,
  SelectPositioner,
  SelectTrigger,
  SelectValue
} from 'skytrack-ui/select'
import { Tabs, TabsList, TabsPanel, TabsTab } from 'skytrack-ui/tabs'
import type { StudioMission } from '@/domain/mission-model'

interface MissionWorldPickerDialogProps {
  restoreDialogFocus: () => HTMLElement | null
  mission: Pick<StudioMission, 'world' | 'worldId' | 'worldType'>
  worldOptions: {
    id: string
    name: string
    glbAssetId?: string
    glbFileName?: string
  }[]
  selectOptions: { value: string; label: string }[]
  worldPickerOpen: boolean
  onWorldPickerOpenChange: (open: boolean) => void
  onSelectWorld: (worldId: string) => void
  onSelectWorldType: (worldType: '2D' | '3D') => void
  onImportWorld: (file: File) => Promise<void>
}

export function MissionWorldPickerDialog ({
  restoreDialogFocus,
  mission,
  worldOptions,
  selectOptions,
  worldPickerOpen,
  onWorldPickerOpenChange,
  onSelectWorld,
  onSelectWorldType,
  onImportWorld
}: MissionWorldPickerDialogProps) {
  const [isImporting, setIsImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const selectedWorld =
    worldOptions.find(world => world.id === mission.worldId) ??
    worldOptions.find(world => world.name === mission.world)
  const importWorldFiles = async (files: File[]) => {
    if (files.length > 1) {
      setImportError('Import one .glb file at a time.')
      return
    }
    const file = files[0]
    if (!file) return
    setImportError(null)
    setIsImporting(true)
    try {
      await onImportWorld(file)
    } catch (error) {
      setImportError(
        error instanceof Error
          ? error.message
          : 'This GLB could not be imported. Choose another file and try again.'
      )
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <Dialog open={worldPickerOpen} onOpenChange={onWorldPickerOpenChange}>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup
          aria-label={
            mission.worldType === '2D'
              ? 'Choose mission type'
              : 'Choose mission type and world'
          }
          finalFocus={restoreDialogFocus}
          data-testid='ms-world-picker'
        >
          <DialogHeader>
            <DialogTitle className='heading'>Choose world</DialogTitle>
          </DialogHeader>
          <FieldRoot>
            <FieldLabel>World type</FieldLabel>
            <Tabs
              value={mission.worldType ?? '3D'}
              onValueChange={value => {
                if (value === '2D' || value === '3D') onSelectWorldType(value)
              }}
              className='max-w-none'
              data-testid='ms-world-type-tabs'
            >
              <TabsList
                variant='filled'
                className=' w-full'
                aria-label='Mission type'
              >
                <TabsTab
                  value='2D'
                  variant='filled'
                  className='ms-world-type-tab flex-[1_1_0] justify-center'
                >
                  2D
                </TabsTab>
                <TabsTab
                  value='3D'
                  variant='filled'
                  className='ms-world-type-tab flex-[1_1_0] justify-center'
                >
                  3D
                </TabsTab>
              </TabsList>
              <TabsPanel value='2D' className='ms-world-type-panel w-full [border:0] rounded-none bg-transparent p-0 text-inherit'>
                <span className='text-sm text-muted-foreground'>
                  2D photogrammetry missions use reconnaissance planning
                </span>
                <span className='ms-sr absolute w-px h-px overflow-hidden [clip:rect(0_0_0_0)] whitespace-nowrap'>
                  2D photogrammetry does not require selecting a World.
                </span>
              </TabsPanel>
              <TabsPanel
                value='3D'
                className='ms-world-type-panel w-full [border:0] rounded-none bg-transparent p-0 text-inherit flex flex-col gap-4'
              >
                <p className='m-0 text-sm text-muted-foreground'>
                  Import a GLB to replace this mission’s 3D World. Its origin
                  anchors to the mission location. Routes and mission geometry
                  stay in place. The file and card preview stay in this browser.
                </p>
                <FieldRoot className='ms-field flex flex-col gap-1'>
                  <FieldLabel>World</FieldLabel>
                  <Select<string>
                    items={selectOptions}
                    value={selectedWorld?.id ?? ''}
                    onValueChange={(value: unknown) =>
                      onSelectWorld(String(value))
                    }
                  >
                    <SelectTrigger data-testid='ms-world-picker-select'>
                      <SelectValue />
                      <SelectIcon />
                    </SelectTrigger>
                    <SelectPortal>
                      <SelectPositioner
                        side='bottom'
                        align='start'
                        sideOffset={4}
                      >
                        <SelectPopup>
                          <SelectList>
                            {worldOptions.map(world => (
                              <SelectItem key={world.id} value={world.id}>
                                <SelectItemIndicator />
                                <SelectItemText>{world.name}</SelectItemText>
                              </SelectItem>
                            ))}
                          </SelectList>
                        </SelectPopup>
                      </SelectPositioner>
                    </SelectPortal>
                  </Select>
                  <FieldDescription>
                    {selectedWorld?.glbAssetId ? (
                      <>
                        GLB model:{' '}
                        {selectedWorld.glbFileName ?? selectedWorld.name}
                      </>
                    ) : null}
                  </FieldDescription>
                </FieldRoot>
                <FieldRoot className='ms-field flex flex-col gap-1'>
                  <FieldLabel>Import 3D World</FieldLabel>
                  <Dropzone
                    accept='.glb,model/gltf-binary'
                    multiple={false}
                    disabled={isImporting}
                    buttonLabel={
                      isImporting ? 'Importing GLB…' : 'Choose GLB file'
                    }
                    hint='Drop one .glb file here. We validate the model and make a mission-card preview.'
                    onFilesSelected={importWorldFiles}
                    data-testid='ms-world-glb-dropzone'
                  />
                </FieldRoot>
                {importError ? (
                  <p
                    role='alert'
                    className='m-0 text-sm text-destructive'
                    data-testid='ms-world-glb-error'
                  >
                    {importError}
                  </p>
                ) : null}
              </TabsPanel>
            </Tabs>
          </FieldRoot>
          <DialogFooter className="flex-row flex-wrap items-center justify-end">
            <DialogClose className='w-auto flex-[0_0_auto]'>Done</DialogClose>
          </DialogFooter>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  )
}
