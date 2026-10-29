import {
  CaretDownIcon,
  CheckIcon,
  DotsSixVerticalIcon,
  PlusIcon,
  SparkleIcon,
  TrashIcon,
  XIcon
} from '@phosphor-icons/react'
import { useState, type DragEvent } from 'react'
import { Badge } from 'skytrack-ui/badge'
import { Button } from 'skytrack-ui/button'
import { FieldLabel, FieldRoot } from 'skytrack-ui/field'
import { SkyTooltip } from '../../../ui/components/sky-tooltip'
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
import { NumberField, NumberFieldInput } from 'skytrack-ui/number-field'
import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger
} from 'skytrack-ui/collapsible'
import type {
  AIWorkflowDroneAction,
  MissionAIWorkflow,
  StudioMission
} from '../../../domain/mission-model'
import { uid } from '../../../domain/mission-model'
import type { AIModelCardModel } from '../../../ui/components/ai-model-card'
import {
  hasSequenceDrag,
  readSequenceDragItem,
  sequenceDropPosition,
  SEQUENCE_LIST_ITEM_CLASS,
  writeSequenceDragItem,
  type SequenceDropPosition
} from './sequence-drag'

type Waypoint = StudioMission['waypoints'][number]

const ACTION_TYPES = [
  { value: 'camera-trigger', label: 'Camera trigger' },
  { value: 'spray', label: 'Spray' }
] as const

const CAMERA_MODES = [
  { value: 'snapshot', label: 'Snapshot' },
  { value: 'recording-on', label: 'Recording on' },
  { value: 'recording-off', label: 'Recording off' }
] as const

const DETECTION_TARGETS = [
  'Person',
  'Vehicle',
  'Car',
  'Truck',
  'Bus',
  'Bicycle',
  'Motorcycle',
  'Animal',
  'Building',
  'Tree',
  'Crop',
  'Road',
  'Water',
  'Other'
].map(value => ({ value, label: value }))

const SPRAY_MODES = [
  { value: 'start', label: 'Start' },
  { value: 'stop', label: 'Stop' }
] as const
const WORKFLOW_BOUNDARY_ROW_CLASS = `${SEQUENCE_LIST_ITEM_CLASS} flex min-w-0 items-center gap-2 border-b border-border bg-(--card) text-xs [list-style:none]`

export function AIWorkflowStopRow ({
  workflow,
  waypoints,
  sequenceId,
  waypointId,
  onMoveAction
}: {
  workflow: MissionAIWorkflow
  waypoints: Waypoint[]
  sequenceId: string
  waypointId: string
  onMoveAction: (
    fromWpId: string,
    actionId: string,
    toWpId: string,
    toActionId?: string,
    position?: SequenceDropPosition
  ) => void
}) {
  const [dragging, setDragging] = useState(false)
  const [dropPosition, setDropPosition] = useState<SequenceDropPosition | null>(
    null
  )
  const currentWaypoint = waypoints.find(
    waypoint => waypoint.id === workflow.stopWaypointId
  )

  return (
    <li
      className={[
        `${WORKFLOW_BOUNDARY_ROW_CLASS} min-h-10 pr-[calc(var(--spacing)*2+2rem)]`,
        dragging ? 'border-(--primary) border-dashed' : '',
        dropPosition === 'before'
          ? '[box-shadow:inset_0_0.125rem_0_var(--primary)]'
          : '',
        dropPosition === 'after'
          ? '[box-shadow:inset_0_-0.125rem_0_var(--primary)]'
          : ''
      ]
        .filter(Boolean)
        .join(' ')}
      data-testid={`ms-ai-workflow-stop-${workflow.id}`}
      aria-label={`${workflow.label} stop boundary at waypoint ${
        currentWaypoint?.seq ?? 'not set'
      }`}
      onDragOver={event => {
        if (!hasSequenceDrag(event)) return
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
        setDropPosition(sequenceDropPosition(event))
      }}
      onDragLeave={event => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          setDropPosition(null)
      }}
      onDrop={(event: DragEvent<HTMLLIElement>) => {
        event.preventDefault()
        setDropPosition(null)
        const item = readSequenceDragItem(event)
        if (!item || item.kind !== 'action' || item.routeId !== sequenceId)
          return
        onMoveAction(item.waypointId, item.id, waypointId)
      }}
    >
      <Button
        type='button'
        size='icon-xs'
        variant='ghost'
        className={`flex-[0_0_auto] self-center inline-flex h-8.5 w-5.5 items-center justify-center rounded-(--radius) border border-transparent bg-transparent text-sm text-(--muted-foreground) cursor-grab touch-none hover:bg-(--accent) hover:text-(--foreground) focus-visible:outline-2 focus-visible:outline-(--primary) focus-visible:outline-offset-1 active:cursor-grabbing${
          dragging ? ' text-(--primary) cursor-grabbing' : ''
        }`}
        draggable
        aria-label={`Drag to move ${workflow.label} stop boundary`}
        onDragStart={event => {
          event.stopPropagation()
          writeSequenceDragItem(event, {
            kind: 'ai-workflow-stop',
            id: workflow.id,
            routeId: sequenceId
          })
          setDragging(true)
        }}
        onDragEnd={() => setDragging(false)}
      >
        <DotsSixVerticalIcon aria-hidden='true' />
      </Button>
      <Badge count={<SparkleIcon aria-hidden='true' />} status='outline' />
      <span className='flex-[1_1_auto] min-w-0 truncate font-medium text-foreground'>
        {workflow.label}
      </span>
      <Badge count='STOP' status='outline' />
      <span className='sr-only'>
        Drop a drone action here to add it to waypoint {currentWaypoint?.seq}.
      </span>
    </li>
  )
}

export function AIWorkflowCard ({
  workflow,
  waypoints,
  models,
  sequenceId,
  onChange,
  onImportModel,
  onDeleteModel,
  onDelete
}: {
  workflow: MissionAIWorkflow
  waypoints: Waypoint[]
  models: AIModelCardModel[]
  sequenceId: string
  onChange: (next: MissionAIWorkflow) => void
  onImportModel: () => void
  onDeleteModel: (modelId: string) => boolean
  onDelete: () => void
}) {
  const [confirmModelDeleteId, setConfirmModelDeleteId] = useState<
    string | null
  >(null)
  const [draggingStart, setDraggingStart] = useState(false)
  const update = (patch: Partial<MissionAIWorkflow>) =>
    onChange({ ...workflow, ...patch })

  const renderBranch = (
    branch: 'if' | 'else',
    actions: AIWorkflowDroneAction[]
  ) => {
    const field = branch === 'if' ? 'ifActions' : 'elseActions'
    const replaceAction = (
      actionId: string,
      patch: Partial<AIWorkflowDroneAction>
    ) =>
      update({
        [field]: actions.map(action =>
          action.id === actionId ? { ...action, ...patch } : action
        )
      })
    const removeAction = (actionId: string) =>
      update({ [field]: actions.filter(action => action.id !== actionId) })
    const addAction = () =>
      update({
        [field]: [
          ...actions,
          { id: uid('ai-action'), kind: 'camera-trigger', mode: 'snapshot' }
        ]
      })

    return (
      <section
        className='flex min-w-0 flex-col border-t border-border'
        aria-label={`${branch.toUpperCase()} drone actions`}
      >
        <div className='flex items-center gap-2 px-3 py-2'>
          <Badge count={branch.toUpperCase()} status='outline' />
          <span className='text-sm text-muted-foreground'>
            {branch === 'if' ? 'Target detected' : 'Target not detected'}
          </span>
        </div>
        <ol className='m-0 flex list-none flex-col gap-0 px-3 pb-2'>
          {actions.map(action => {
            const options =
              action.kind === 'camera-trigger' ? CAMERA_MODES : SPRAY_MODES
            return (
              <li
                key={action.id}
                className='flex min-w-0 items-center gap-2 border-t border-border py-2'
              >
                <div className='flex min-w-0 items-center gap-2 border-t border-border py-2'>
                  <Select
                    items={[...ACTION_TYPES]}
                    value={action.kind}
                    onValueChange={(value: unknown) => {
                      if (value !== 'camera-trigger' && value !== 'spray')
                        return
                      replaceAction(action.id, {
                        kind: value,
                        mode: value === 'spray' ? 'start' : 'snapshot'
                      })
                    }}
                  >
                    <SelectTrigger
                      aria-label='Drone action type'
                      className='min-w-0 flex-1'
                    >
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
                            {ACTION_TYPES.map(item => (
                              <SelectItem key={item.value} value={item.value}>
                                <SelectItemIndicator />
                                <SelectItemText>{item.label}</SelectItemText>
                              </SelectItem>
                            ))}
                          </SelectList>
                        </SelectPopup>
                      </SelectPositioner>
                    </SelectPortal>
                  </Select>
                  <Select
                    items={[...options]}
                    value={action.mode}
                    onValueChange={(value: unknown) => {
                      if (options.some(option => option.value === value))
                        replaceAction(action.id, {
                          mode: value as AIWorkflowDroneAction['mode']
                        })
                    }}
                  >
                    <SelectTrigger
                      aria-label='Drone action mode'
                      className='min-w-0 flex-1'
                    >
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
                            {options.map(item => (
                              <SelectItem key={item.value} value={item.value}>
                                <SelectItemIndicator />
                                <SelectItemText>{item.label}</SelectItemText>
                              </SelectItem>
                            ))}
                          </SelectList>
                        </SelectPopup>
                      </SelectPositioner>
                    </SelectPortal>
                  </Select>
                </div>
                <Button
                  size='icon-sm'
                  variant='ghost'
                  aria-label='Remove drone action'
                  onClick={() => removeAction(action.id)}
                >
                  <TrashIcon aria-hidden='true' />
                </Button>
              </li>
            )
          })}
        </ol>
        <Button
          className='w-full justify-center border-t border-border'
          variant='ghost'
          onClick={addAction}
        >
          <PlusIcon aria-hidden='true' /> Action
        </Button>
      </section>
    )
  }

  const selectedModel = models.find(model => model.id === workflow.modelId)
  const detectionTargets = DETECTION_TARGETS.some(
    target => target.value === workflow.objectClass
  )
    ? DETECTION_TARGETS
    : [
        { value: workflow.objectClass, label: workflow.objectClass },
        ...DETECTION_TARGETS
      ]
  const startIndex = waypoints.findIndex(
    waypoint => waypoint.id === workflow.startWaypointId
  )
  const currentStopIndex = waypoints.findIndex(
    waypoint => waypoint.id === workflow.stopWaypointId
  )

  return (
    <li className='list-none' data-testid={`ms-ai-workflow-${workflow.id}`}>
      <div className={`${WORKFLOW_BOUNDARY_ROW_CLASS} items-start py-0`}>
        <Collapsible defaultOpen className='min-w-0 flex-1'>
          <CollapsibleTrigger
            className='group flex w-full min-w-0 cursor-pointer items-center gap-2 rounded-none border-0 bg-transparent text-left text-xs text-foreground hover:bg-transparent focus-visible:outline-2 focus-visible:outline-(--primary) focus-visible:outline-offset-1'
            aria-label={`${workflow.label} Start workflow details`}
            data-testid={`ms-ai-workflow-toggle-${workflow.id}`}
          >
            <Button
              type='button'
              variant='ghost'
              size='icon-xs'
              className={`flex-[0_0_auto] self-center inline-flex h-8.5 w-5.5 items-center justify-center rounded-(--radius) border border-transparent bg-transparent text-sm text-(--muted-foreground) opacity-100 cursor-grab touch-none hover:bg-(--accent) hover:text-(--foreground) focus-visible:outline-2 focus-visible:outline-(--primary) focus-visible:outline-offset-1 active:cursor-grabbing${
                draggingStart ? ' text-(--primary) cursor-grabbing' : ''
              }`}
              draggable
              aria-label={`Drag to move ${workflow.label} start boundary`}
              data-testid={`ms-ai-workflow-start-handle-${workflow.id}`}
              onDragStart={event => {
                event.stopPropagation()
                writeSequenceDragItem(event, {
                  kind: 'ai-workflow-start',
                  id: workflow.id,
                  routeId: sequenceId
                })
                setDraggingStart(true)
              }}
              onDragEnd={() => setDraggingStart(false)}
            >
              <DotsSixVerticalIcon
                aria-hidden='true'
                className='size-4 shrink-0'
              />
            </Button>
            <SkyTooltip side='left'>
              <Badge
                aria-label='AI workflow'
                count={<SparkleIcon aria-hidden='true' />}
                status='outline'
              />
            </SkyTooltip>
            <div className='flex-[1_1_auto] flex flex-row items-center gap-1 min-w-0 truncate font-medium text-foreground'>
              {workflow.label}
              <CaretDownIcon
                aria-hidden='true'
                className='shrink-0 transition-transform duration-150 group-data-panel-open:rotate-180'
              />
            </div>
            <Badge count='START' status='outline' />
            <Button
              type='button'
              size='icon-sm'
              variant='ghost'
              aria-label={`Delete ${workflow.label}`}
              data-testid={`ms-ai-workflow-delete-${workflow.id}`}
              onClick={event => {
                event.stopPropagation()
                onDelete()
              }}
            >
              <TrashIcon aria-hidden='true' />
            </Button>
          </CollapsibleTrigger>
          <CollapsiblePanel className='min-w-0 relative flex flex-col gap-3 p-3 bg-muted/80 border-t border-border'>
            <span
              className='pointer-events-none absolute bottom-5 left-1/2 top-5 w-px -translate-x-1/2 bg-border'
              aria-hidden='true'
              data-testid='ms-ai-workflow-connector'
            />

            <section
              className='relative rounded-(--radius) border border-border bg-(--card) shadow-xs flex min-w-0 flex-col'
              aria-label='AI detection settings'
            >
              <h4 className='m-0 p-3 text-sm font-semibold border-b border-border'>
                Detection starts
              </h4>
              <div className='flex flex-col p-3'>
                <FieldRoot name={`ai-model-${workflow.id}`}>
                  <div className='flex flex-row items-center justify-between gap-3 w-full'>
                    <FieldLabel className='min-w-0'>AI model</FieldLabel>
                    <Button
                      className='shrink-0 p-0! h-auto!'
                      size='sm'
                      variant='link'
                      onClick={onImportModel}
                    >
                      Import model
                    </Button>
                  </div>
                  <Select
                    items={models.map(model => ({
                      value: model.id,
                      label: model.name
                    }))}
                    value={workflow.modelId ?? ''}
                    onValueChange={(value: unknown) => {
                      if (typeof value === 'string')
                        update({ modelId: value || null })
                    }}
                  >
                    <SelectTrigger aria-label='AI model' className='w-full'>
                      <SelectValue placeholder='Choose AI model' />
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
                            {models.map(model => (
                              <SelectItem key={model.id} value={model.id}>
                                <SelectItemIndicator />
                                <SelectItemText>
                                  {model.name}
                                  {model.origin === 'skytrack'
                                    ? ' · SkyTrack'
                                    : model.origin === 'user-upload'
                                    ? ' · You'
                                    : ''}
                                </SelectItemText>
                              </SelectItem>
                            ))}
                          </SelectList>
                        </SelectPopup>
                      </SelectPositioner>
                    </SelectPortal>
                  </Select>
                </FieldRoot>
                {selectedModel?.origin === 'user-upload' ? (
                  <div className='mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground'>
                    {confirmModelDeleteId === selectedModel.id ? (
                      <>
                        <span>
                          Remove {selectedModel.name} from this browser?
                        </span>
                        <span className='flex shrink-0 gap-1'>
                          <Button
                            size='icon-xs'
                            variant='ghost'
                            aria-label='Cancel model removal'
                            onClick={() => setConfirmModelDeleteId(null)}
                          >
                            <XIcon />
                          </Button>
                          <Button
                            size='icon-xs'
                            variant='destructive'
                            aria-label={`Confirm removal of ${selectedModel.name}`}
                            onClick={() => {
                              if (onDeleteModel(selectedModel.id))
                                setConfirmModelDeleteId(null)
                            }}
                          >
                            <CheckIcon />
                          </Button>
                        </span>
                      </>
                    ) : (
                      <>
                        <span>Uploaded by you</span>
                        <Button
                          size='sm'
                          variant='ghost'
                          onClick={() =>
                            setConfirmModelDeleteId(selectedModel.id)
                          }
                        >
                          <TrashIcon aria-hidden='true' /> Remove model
                        </Button>
                      </>
                    )}
                  </div>
                ) : selectedModel ? (
                  <p className='mb-0 mt-2 text-xs text-muted-foreground'>
                    SkyTrack and Workspace models are managed by their owners.
                  </p>
                ) : null}
                <div className='mt-3 grid grid-cols-[minmax(0,1fr)_7rem] gap-3'>
                  <FieldRoot name={`object-class-${workflow.id}`}>
                    <FieldLabel>What to detect</FieldLabel>
                    <Select
                      items={detectionTargets}
                      value={workflow.objectClass}
                      onValueChange={(value: unknown) => {
                        if (typeof value === 'string')
                          update({ objectClass: value })
                      }}
                    >
                      <SelectTrigger
                        size='default'
                        aria-label='What to detect'
                        className='w-full'
                      >
                        <SelectValue placeholder='Choose object to detect' />
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
                              {detectionTargets.map(target => (
                                <SelectItem
                                  key={target.value}
                                  value={target.value}
                                >
                                  <SelectItemIndicator />
                                  <SelectItemText>
                                    {target.label}
                                  </SelectItemText>
                                </SelectItem>
                              ))}
                            </SelectList>
                          </SelectPopup>
                        </SelectPositioner>
                      </SelectPortal>
                    </Select>
                  </FieldRoot>
                  <FieldRoot name={`confidence-score-${workflow.id}`}>
                    <FieldLabel>Confidence score</FieldLabel>
                    <NumberField
                      value={workflow.confidenceScore}
                      min={0}
                      max={1}
                      step={0.05}
                      onValueChange={value => {
                        if (typeof value === 'number' && Number.isFinite(value))
                          update({
                            confidenceScore: Math.max(0, Math.min(1, value))
                          })
                      }}
                    >
                      <NumberFieldInput className='w-full' />
                    </NumberField>
                  </FieldRoot>
                </div>
              </div>
            </section>

            <section
              className='relative rounded-(--radius) border border-border bg-(--card) shadow-xs'
              aria-label='Drone actions'
            >
              <h4 className='m-0 px-3 py-3 text-sm font-semibold'>
                Drone actions
              </h4>
              {renderBranch('if', workflow.ifActions)}
              {renderBranch('else', workflow.elseActions)}
            </section>

            <footer className='relative rounded-(--radius) border border-border bg-(--card) p-3 shadow-xs'>
              <div className='flex items-start gap-2'>
                <span className='mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full text-(--success)'>
                  <CheckIcon aria-hidden='true' />
                </span>
                <div className='min-w-0'>
                  <p className='m-0 text-sm font-medium'>
                    All resolved or no detection
                  </p>
                  <p className='mb-0 mt-1 text-xs text-muted-foreground'>
                    The drone exits the AI flow and resumes your planned
                    mission.
                  </p>
                </div>
              </div>
            </footer>
          </CollapsiblePanel>
        </Collapsible>
      </div>

      <div className='sr-only'>
        {`Workflow runs from waypoint ${
          waypoints[startIndex]?.seq ?? 'not set'
        } through waypoint ${waypoints[currentStopIndex]?.seq ?? 'not set'}.`}
      </div>
    </li>
  )
}
