import { SkyTooltip } from '../../shared/sky-tooltip'
import { useEffect, useState } from 'react'
import { PlusIcon, TrashIcon, XIcon } from '@phosphor-icons/react'
import { Button } from 'skytrack-ui/button'
import {
  Dialog,
  DialogBackdrop,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPopup,
  DialogPortal,
  DialogTitle
} from 'skytrack-ui/dialog'
import { FieldControl, FieldLabel, FieldRoot } from 'skytrack-ui/field'
import {
  Select,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
  SelectIcon,
  SelectList,
  SelectPopup,
  SelectPortal,
  SelectPositioner,
  SelectTrigger,
  SelectValue
} from 'skytrack-ui/select'
import {
  DRONE_COMPONENT_GROUPS,
  DRONE_COMPONENT_INSTALL_STATES,
  DRONE_DATA_SOURCE_TYPES,
  newDroneHardwareComponent,
  type DroneComponentGroup,
  type DroneComponentInstallState,
  type DroneDataSourceType,
  type DroneFirmwareFamily,
  type DroneHardwareComponent,
  type DroneHardwareSpecification,
  type WorkspaceDroneProfile
} from './database/drone-store'

const FIRMWARE_FAMILIES: DroneFirmwareFamily[] = ['PX4', 'ArduPilot', 'DJI', 'Other', 'Unspecified']

function componentId(): string {
  return `component-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

function specificationId(): string {
  return `spec-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

function optionalNumber(value: string): number | null {
  if (value.trim() === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? Number(parsed.toFixed(6)) : null
}

function TextField({
  label,
  value,
  placeholder,
  onChange,
  type = 'text'
}: {
  label: string
  value: string
  placeholder?: string
  onChange: (value: string) => void
  type?: string
}) {
  return (
    <FieldRoot className='ms-field'>
      <FieldLabel>{label}</FieldLabel>
      <FieldControl type={type} value={value} onValueChange={(next: unknown) => onChange(String(next))} placeholder={placeholder} />
    </FieldRoot>
  )
}

function SelectField<T extends string>({
  label,
  value,
  options,
  formatOption = (option) => option === 'Unspecified' ? 'Not specified' : option,
  onChange
}: {
  label: string
  value: T
  options: readonly T[]
  formatOption?: (value: T) => string
  onChange: (value: T) => void
}) {
  return (
    <FieldRoot className='ms-field'>
      <FieldLabel>{label}</FieldLabel>
      <Select<T>
        items={options.map((option) => ({ value: option, label: formatOption(option) }))}
        value={value}
        onValueChange={(next: unknown) => onChange(String(next) as T)}
      >
        <SelectTrigger><SelectValue /><SelectIcon /></SelectTrigger>
        <SelectPortal>
          <SelectPositioner side='bottom' align='start' sideOffset={4}>
            <SelectPopup><SelectList>
              {options.map((option) => (
                <SelectItem key={option} value={option}>
                  <SelectItemIndicator /><SelectItemText>{formatOption(option)}</SelectItemText>
                </SelectItem>
              ))}
            </SelectList></SelectPopup>
          </SelectPositioner>
        </SelectPortal>
      </Select>
    </FieldRoot>
  )
}

function NumberField({
  label,
  value,
  unit,
  onChange
}: {
  label: string
  value: number | null
  unit: string
  onChange: (value: number | null) => void
}) {
  return (
    <FieldRoot className='ms-field'>
      <FieldLabel>{label}</FieldLabel>
      <FieldControl
        type='number'
        min={0}
        step='any'
        value={value === null ? '' : String(value)}
        onValueChange={(next: unknown) => onChange(optionalNumber(String(next)))}
        placeholder={`Not specified (${unit})`}
      />
    </FieldRoot>
  )
}

export default function DroneProfileDialog({
  open,
  mode,
  profile,
  onClose,
  onSave
}: {
  open: boolean
  mode: 'create' | 'edit'
  profile: WorkspaceDroneProfile | null
  onClose: () => void
  onSave: (profile: WorkspaceDroneProfile) => void
}) {
  const [draft, setDraft] = useState<WorkspaceDroneProfile | null>(profile)

  useEffect(() => setDraft(profile), [profile, open])
  if (!draft) return null

  const patchDraft = (patch: Partial<WorkspaceDroneProfile>) => setDraft((current) => current ? { ...current, ...patch } : current)
  const patchComponent = (id: string, patch: Partial<DroneHardwareComponent>) => {
    setDraft((current) => current ? {
      ...current,
      components: current.components.map((item) => item.id === id ? { ...item, ...patch } : item)
    } : current)
  }
  const addComponent = () => {
    setDraft((current) => current ? {
      ...current,
      components: [...current.components, newDroneHardwareComponent(componentId())]
    } : current)
  }
  const removeComponent = (id: string) => {
    setDraft((current) => current ? { ...current, components: current.components.filter((item) => item.id !== id) } : current)
  }
  const patchSpecification = (componentId: string, id: string, patch: Partial<DroneHardwareSpecification>) => {
    setDraft((current) => current ? {
      ...current,
      components: current.components.map((item) => item.id === componentId ? {
        ...item,
        specifications: item.specifications.map((specification) => specification.id === id ? { ...specification, ...patch } : specification)
      } : item)
    } : current)
  }
  const addSpecification = (componentId: string) => {
    setDraft((current) => current ? {
      ...current,
      components: current.components.map((item) => item.id === componentId ? {
        ...item,
        specifications: [...item.specifications, { id: specificationId(), label: '', value: '' }]
      } : item)
    } : current)
  }
  const removeSpecification = (componentId: string, id: string) => {
    setDraft((current) => current ? {
      ...current,
      components: current.components.map((item) => item.id === componentId ? {
        ...item,
        specifications: item.specifications.filter((specification) => specification.id !== id)
      } : item)
    } : current)
  }

  return (
    <Dialog open={open} onOpenChange={(value: boolean) => { if (!value) onClose() }}>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup className='ms-drone-dialog sm:max-w-[920px]' aria-label={mode === 'create' ? 'Add drone' : `Edit ${profile?.name ?? draft.name}`}>
          <DialogHeader>
            <DialogTitle>{mode === 'create' ? 'Add drone' : `Edit ${profile?.name ?? draft.name}`}</DialogTitle>
            <DialogDescription>
              Manage this Workspace’s reference profile. Values are descriptive; compatibility is not checked and no flight hardware is connected.
            </DialogDescription>
          </DialogHeader>
          <div className='ms-drone-dialog-body'>
            <section className='ms-drone-form-section' aria-labelledby='ms-drone-platform-title'>
              <div className='ms-drone-section-heading'>
                <h2 id='ms-drone-platform-title'>Platform</h2>
                <p>Leave details blank when they have not been confirmed.</p>
              </div>
              <div className='ms-drone-form-grid'>
                <FieldRoot className='ms-field'>
                  <FieldLabel>Drone name</FieldLabel>
                  <FieldControl value={draft.name} onValueChange={(value: unknown) => patchDraft({ name: String(value) })} placeholder='e.g. Mini-Pro' />
                </FieldRoot>
                <TextField label='Primary use case' value={draft.missionUseCase} onChange={(missionUseCase) => patchDraft({ missionUseCase })} placeholder='e.g. Mapping, inspection, long endurance' />
                <FieldRoot className='ms-field'>
                  <FieldLabel>Flight firmware</FieldLabel>
                  <Select<DroneFirmwareFamily>
                    items={FIRMWARE_FAMILIES.map((value) => ({ value, label: value === 'Unspecified' ? 'Not specified' : value }))}
                    value={draft.firmwareFamily}
                    onValueChange={(value: unknown) => patchDraft({ firmwareFamily: String(value) as DroneFirmwareFamily })}
                  >
                    <SelectTrigger><SelectValue /><SelectIcon /></SelectTrigger>
                    <SelectPortal>
                      <SelectPositioner side='bottom' align='start' sideOffset={4}>
                        <SelectPopup><SelectList>
                          {FIRMWARE_FAMILIES.map((value) => (
                            <SelectItem key={value} value={value}>
                              <SelectItemIndicator /><SelectItemText>{value === 'Unspecified' ? 'Not specified' : value}</SelectItemText>
                            </SelectItem>
                          ))}
                        </SelectList></SelectPopup>
                      </SelectPositioner>
                    </SelectPortal>
                  </Select>
                </FieldRoot>
                <FieldRoot className='ms-field'>
                  <FieldLabel>Flight controller</FieldLabel>
                  <FieldControl value={draft.flightControllerModel} onValueChange={(value: unknown) => patchDraft({ flightControllerModel: String(value) })} placeholder='Not specified' />
                </FieldRoot>
                <FieldRoot className='ms-field'>
                  <FieldLabel>Firmware version</FieldLabel>
                  <FieldControl value={draft.firmwareVersion} onValueChange={(value: unknown) => patchDraft({ firmwareVersion: String(value) })} placeholder='Not specified' />
                </FieldRoot>
                <FieldRoot className='ms-field ms-drone-form-wide'>
                  <FieldLabel>Airframe</FieldLabel>
                  <FieldControl value={draft.airframe} onValueChange={(value: unknown) => patchDraft({ airframe: String(value) })} placeholder='Not specified' />
                </FieldRoot>
                <FieldRoot className='ms-field ms-drone-form-wide'>
                  <FieldLabel>Reference build note</FieldLabel>
                  <FieldControl value={draft.referenceBuildNote} onValueChange={(value: unknown) => patchDraft({ referenceBuildNote: String(value) })} placeholder='Optional note' />
                </FieldRoot>
              </div>
            </section>

            <section className='ms-drone-form-section' aria-labelledby='ms-drone-fit-title'>
              <div className='ms-drone-section-heading'>
                <h2 id='ms-drone-fit-title'>Frame &amp; fit</h2>
                <p>Record dimensions for reference. The profile does not validate component compatibility.</p>
              </div>
              <div className='ms-drone-form-grid'>
                <NumberField label='Frame size' value={draft.frameSizeMm} unit='mm' onChange={(frameSizeMm) => patchDraft({ frameSizeMm })} />
                <NumberField label='Maximum propeller diameter' value={draft.maxPropDiameterIn} unit='in' onChange={(maxPropDiameterIn) => patchDraft({ maxPropDiameterIn })} />
                <TextField label='Motor mount pattern' value={draft.motorMountPatternMm} onChange={(motorMountPatternMm) => patchDraft({ motorMountPatternMm })} placeholder='e.g. 12 × 12 mm' />
                <TextField label='Flight controller / stack mount' value={draft.stackMountPatternMm} onChange={(stackMountPatternMm) => patchDraft({ stackMountPatternMm })} placeholder='e.g. 20 × 20 mm' />
                <NumberField label='Frame weight' value={draft.frameWeightG} unit='g' onChange={(frameWeightG) => patchDraft({ frameWeightG })} />
              </div>
            </section>

            <section className='ms-drone-form-section' aria-labelledby='ms-drone-performance-title'>
              <div className='ms-drone-section-heading'>
                <h2 id='ms-drone-performance-title'>Performance &amp; payload</h2>
                <p>Optional descriptive values. Leave unknown values blank.</p>
              </div>
              <div className='ms-drone-form-grid'>
                <NumberField label='Maximum flight time' value={draft.maxFlightTimeMin} unit='min' onChange={(maxFlightTimeMin) => patchDraft({ maxFlightTimeMin })} />
                <NumberField label='Maximum speed' value={draft.maxSpeedMps} unit='m/s' onChange={(maxSpeedMps) => patchDraft({ maxSpeedMps })} />
                <NumberField label='Maximum takeoff weight' value={draft.maxTakeoffWeightKg} unit='kg' onChange={(maxTakeoffWeightKg) => patchDraft({ maxTakeoffWeightKg })} />
                <NumberField label='Maximum payload' value={draft.maxPayloadKg} unit='kg' onChange={(maxPayloadKg) => patchDraft({ maxPayloadKg })} />
              </div>
            </section>

            <section className='ms-drone-form-section' aria-labelledby='ms-drone-profile-source-title'>
              <div className='ms-drone-section-heading'>
                <h2 id='ms-drone-profile-source-title'>Profile source</h2>
                <p>Track the source for platform and performance values. Use component sources for component-specific facts.</p>
              </div>
              <div className='ms-drone-form-grid'>
                <SelectField<DroneDataSourceType> label='Data source status' value={draft.profileSourceType} options={DRONE_DATA_SOURCE_TYPES} onChange={(profileSourceType) => patchDraft({ profileSourceType })} />
                <TextField label='Source label' value={draft.profileSourceLabel} onChange={(profileSourceLabel) => patchDraft({ profileSourceLabel })} placeholder='e.g. Owner-provided drone profile' />
                <TextField label='Source date' value={draft.profileSourceDate} onChange={(profileSourceDate) => patchDraft({ profileSourceDate })} type='date' />
                <TextField label='Source URL' value={draft.profileSourceUrl} onChange={(profileSourceUrl) => patchDraft({ profileSourceUrl })} placeholder='https://' type='url' />
              </div>
            </section>

            <section className='ms-drone-form-section' aria-labelledby='ms-drone-hardware-title'>
              <div className='ms-drone-section-heading ms-drone-components-heading'>
                <div>
                  <h2 id='ms-drone-hardware-title'>Hardware components</h2>
                  <p>Track subsystem, part identity, specifications, installation state, and source. Unknown details stay blank.</p>
                </div>
                <Button size='sm' variant='outline' onClick={addComponent}><PlusIcon aria-hidden='true' /> Add component</Button>
              </div>
              {draft.components.length === 0 ? (
                <p className='ms-drone-empty-components'>No hardware components added.</p>
              ) : (
                <div className='ms-drone-component-list'>
                  {draft.components.map((item, index) => (
                    <div className='ms-drone-component-row' key={item.id}>
                      <span className='ms-drone-component-index' aria-hidden='true'>{String(index + 1).padStart(2, '0')}</span>
                      <FieldRoot className='ms-field ms-drone-group-field'>
                        <FieldLabel>Group</FieldLabel>
                        <Select<DroneComponentGroup>
                          items={DRONE_COMPONENT_GROUPS.map((value) => ({ value, label: value }))}
                          value={item.group}
                          onValueChange={(value: unknown) => patchComponent(item.id, { group: String(value) as DroneComponentGroup })}
                        >
                          <SelectTrigger><SelectValue /><SelectIcon /></SelectTrigger>
                          <SelectPortal>
                            <SelectPositioner side='bottom' align='start' sideOffset={4}>
                              <SelectPopup><SelectList>
                                {DRONE_COMPONENT_GROUPS.map((value) => (
                                  <SelectItem key={value} value={value}>
                                    <SelectItemIndicator /><SelectItemText>{value}</SelectItemText>
                                  </SelectItem>
                                ))}
                              </SelectList></SelectPopup>
                            </SelectPositioner>
                          </SelectPortal>
                        </Select>
                      </FieldRoot>
                      <FieldRoot className='ms-field'>
                        <FieldLabel>Component name</FieldLabel>
                        <FieldControl value={item.name} onValueChange={(value: unknown) => patchComponent(item.id, { name: String(value) })} placeholder='e.g. Pixhawk 6C Mini' />
                      </FieldRoot>
                      <FieldRoot className='ms-field ms-drone-purpose-field'>
                        <FieldLabel>Role / note</FieldLabel>
                        <FieldControl value={item.purpose} onValueChange={(value: unknown) => patchComponent(item.id, { purpose: String(value) })} placeholder='Optional' />
                      </FieldRoot>
                      <SkyTooltip><Button type='button' variant='ghost' size='icon-sm' className='ms-drone-remove-component' aria-label={`Remove component ${item.name || index + 1}`} onClick={() => removeComponent(item.id)}>
                        <TrashIcon aria-hidden='true' />
                      </Button></SkyTooltip>
                      <details className='ms-drone-component-details'>
                        <summary>Specifications &amp; source</summary>
                        <div className='ms-drone-component-detail-body'>
                          <div className='ms-drone-form-grid'>
                            <TextField label='Manufacturer' value={item.manufacturer} onChange={(manufacturer) => patchComponent(item.id, { manufacturer })} placeholder='Not specified' />
                            <TextField label='Model' value={item.model} onChange={(model) => patchComponent(item.id, { model })} placeholder='Not specified' />
                            <TextField label='Part number' value={item.partNumber} onChange={(partNumber) => patchComponent(item.id, { partNumber })} placeholder='Optional' />
                            <TextField label='Revision' value={item.revision} onChange={(revision) => patchComponent(item.id, { revision })} placeholder='Optional' />
                            <SelectField<DroneComponentInstallState> label='Install state' value={item.installState} options={DRONE_COMPONENT_INSTALL_STATES} onChange={(installState) => patchComponent(item.id, { installState })} />
                            <SelectField<DroneDataSourceType> label='Data source status' value={item.sourceType} options={DRONE_DATA_SOURCE_TYPES} onChange={(sourceType) => patchComponent(item.id, { sourceType })} />
                            <TextField label='Source label' value={item.sourceLabel} onChange={(sourceLabel) => patchComponent(item.id, { sourceLabel })} placeholder='e.g. Owner-provided build list' />
                            <TextField label='Source date' value={item.sourceDate} onChange={(sourceDate) => patchComponent(item.id, { sourceDate })} type='date' />
                            <TextField label='Source URL' value={item.sourceUrl} onChange={(sourceUrl) => patchComponent(item.id, { sourceUrl })} placeholder='https://' type='url' />
                          </div>
                          <div className='ms-drone-specifications-heading'>
                            <div>
                              <h3>Key specifications</h3>
                              <p>Examples: battery chemistry, cell count, capacity, voltage, connector; motor size and KV; ESC current and firmware; propeller diameter, pitch, and blade count.</p>
                            </div>
                            <Button type='button' size='sm' variant='outline' onClick={() => addSpecification(item.id)}><PlusIcon aria-hidden='true' /> Add specification</Button>
                          </div>
                          {item.specifications.length === 0 ? (
                            <p className='ms-drone-empty-components'>No specifications added.</p>
                          ) : (
                            <div className='ms-drone-specification-list'>
                              {item.specifications.map((specification) => (
                                <div className='ms-drone-specification-row' key={specification.id}>
                                  <TextField label='Specification' value={specification.label} onChange={(label) => patchSpecification(item.id, specification.id, { label })} placeholder='e.g. Capacity' />
                                  <TextField label='Value' value={specification.value} onChange={(value) => patchSpecification(item.id, specification.id, { value })} placeholder='e.g. 5300 mAh' />
                                  <SkyTooltip><Button type='button' variant='ghost' size='icon-sm' aria-label={`Remove specification ${specification.label || 'row'}`} onClick={() => removeSpecification(item.id, specification.id)}><TrashIcon aria-hidden='true' /></Button></SkyTooltip>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </details>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
          <DialogFooter>
            <Button variant='secondary' onClick={onClose}><XIcon aria-hidden='true' /> Cancel</Button>
            <Button variant='default' disabled={!draft.name.trim()} onClick={() => onSave({ ...draft, name: draft.name.trim() })}>Save drone</Button>
          </DialogFooter>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  )
}
