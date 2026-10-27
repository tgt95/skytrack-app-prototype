/* Sequence action affordances and rows. Waypoint ordering lives in the
   parent route/Design owner; this file only renders and raises callbacks. */

import {
  CameraIcon,
  DotsSixVerticalIcon,
  PlusIcon,
  ScanIcon,
  TrashIcon
} from '@phosphor-icons/react'
import { useState, type DragEvent } from 'react'
import { Badge } from 'skytrack-ui/badge'
import { Button } from 'skytrack-ui/button'
import {
  Menu,
  MenuItem,
  MenuPopup,
  MenuPortal,
  MenuPositioner,
  MenuTrigger
} from 'skytrack-ui/menu'
import { NumberField, NumberFieldInput } from 'skytrack-ui/number-field'
import {
  Tooltip,
  TooltipArrow,
  TooltipPopup,
  TooltipPortal,
  TooltipPositioner,
  TooltipProvider,
  TooltipTrigger
} from 'skytrack-ui/tooltip'
import type { CameraActionKind } from '../../../domain/mission-model'
import { SkyTooltip } from '../../../ui/components/sky-tooltip'
import {
  hasSequenceDrag,
  readSequenceDragItem,
  SEQUENCE_LIST_ITEM_BASE_CLASS,
  SEQUENCE_LIST_ITEM_CLASS,
  sequenceDropPosition,
  writeSequenceDragItem,
  type SequenceDropPosition
} from './sequence-drag'

export const ACTION_OPTIONS: { value: CameraActionKind; label: string }[] = [
  { value: 'photo', label: 'Photo capture' },
  { value: 'video-start', label: 'Camera Start recording' },
  { value: 'video-stop', label: 'Camera Stop recording' },
  { value: 'lidar-scan', label: 'LiDAR scan' }
]

export function ActionInsertAffordance (props: {
  wpId: string
  actionIndex: number
  wpSeq: number
  onInsertAction: (
    wpId: string,
    actionIndex: number,
    kind: CameraActionKind
  ) => void
}) {
  const { wpId, actionIndex, wpSeq, onInsertAction } = props
  return (
    <li
      className={`group/insert-action-zone ${SEQUENCE_LIST_ITEM_BASE_CLASS} relative h-0 py-1.75 px-0 -my-1.75 mx-0 flex items-center justify-start z-2 [list-style:none] overflow-visible`}
      data-testid={`ms-insert-action-${wpId}-${actionIndex}`}
    >
      <div
        className='absolute top-[50%] left-0 right-0 h-0.5 transform-[translateY(-50%)] bg-(--primary) opacity-[0] pointer-events-none [transition:opacity_120ms_ease] group-hover/insert-action-zone:opacity-[0.75] group-focus-within/insert-action-zone:opacity-[0.75]'
        aria-hidden='true'
        data-testid='ms-insert-action-line'
      />
      <Menu>
        <SkyTooltip>
          <MenuTrigger
            className='absolute top-0 left-3 z-3 w-4 h-4 p-0 transform-[translate(0,-25%)] rounded-(--radius) bg-(--card) text-(--primary) border-[1.5px] border-(--primary) inline-flex items-center justify-center opacity-[0] cursor-pointer [transition:opacity_120ms_ease,transform_120ms_ease] group-hover/insert-action-zone:opacity-[1] group-hover/insert-action-zone:transform-[scale(1.08)] group-focus-within/insert-action-zone:opacity-[1] group-focus-within/insert-action-zone:transform-[scale(1.08)]'
            aria-label={`Insert drone action at waypoint ${wpSeq} position ${
              actionIndex + 1
            }`}
          >
            <PlusIcon aria-hidden='true' className='w-3 h-3' />
          </MenuTrigger>
        </SkyTooltip>
        <MenuPortal>
          <MenuPositioner side='bottom' align='center' sideOffset={4}>
            <MenuPopup className='min-w-52.5'>
              {ACTION_OPTIONS.map(option => (
                <MenuItem
                  key={option.value}
                  onClick={() =>
                    onInsertAction(wpId, actionIndex, option.value)
                  }
                >
                  <span
                    className=' mr-1.5 text-[0.8125rem]'
                    data-testid='ms-action-tag-mini'
                  >
                    {option.value === 'lidar-scan' ? (
                      <ScanIcon
                        aria-hidden='true'
                        className='w-3.5 h-3.5 [vertical-align:-2px]'
                      />
                    ) : (
                      <CameraIcon
                        aria-hidden='true'
                        className='w-3.5 h-3.5 [vertical-align:-2px]'
                      />
                    )}
                  </span>
                  <span>{option.label}</span>
                </MenuItem>
              ))}
            </MenuPopup>
          </MenuPositioner>
        </MenuPortal>
      </Menu>
    </li>
  )
}

export function SequenceActionBadge ({ kind }: { kind: CameraActionKind }) {
  const isLidar = kind === 'lidar-scan'
  const description = {
    photo: 'Captures a photo.',
    'video-start': 'Starts camera recording.',
    'video-stop': 'Stops camera recording.',
    'lidar-scan': 'Scans the area with LiDAR.'
  }[kind]

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={<span className='inline-flex' tabIndex={0} />}
        >
          <Badge
            count={
              isLidar ? (
                <ScanIcon aria-hidden='true' />
              ) : (
                <CameraIcon aria-hidden='true' />
              )
            }
            status='outline'
          />
        </TooltipTrigger>
        <TooltipPortal>
          <TooltipPositioner side='left' sideOffset={8}>
            <TooltipPopup>
              <TooltipArrow />
              {description}
            </TooltipPopup>
          </TooltipPositioner>
        </TooltipPortal>
      </Tooltip>
    </TooltipProvider>
  )
}

export function SequenceActionRow (props: {
  action: {
    id: string
    kind: CameraActionKind
    label: string
    gimbalPitchDeg?: number
  }
  wpId: string
  wpSeq: number
  sequenceId: string
  index: number
  isLastSequenceRow: boolean
  inheritedPitch: number
  onMoveAction: (
    fromWpId: string,
    actionId: string,
    toWpId: string,
    toActionId?: string,
    position?: SequenceDropPosition
  ) => void
  onReorderWaypoint: (id: string, toIndex: number) => void
  onDeleteAction: (wpId: string, actionId: string) => void
  onSetPitch: (wpId: string, actionId: string, pitch: number) => void
}) {
  const {
    action,
    wpId,
    wpSeq,
    sequenceId,
    index,
    isLastSequenceRow,
    inheritedPitch,
    onMoveAction,
    onReorderWaypoint,
    onDeleteAction,
    onSetPitch
  } = props
  const [dropPosition, setDropPosition] = useState<SequenceDropPosition | null>(
    null
  )
  const [dragging, setDragging] = useState(false)

  const handleDrop = (event: DragEvent<HTMLLIElement>) => {
    event.preventDefault()
    setDropPosition(null)
    const item = readSequenceDragItem(event)
    if (!item || item.routeId !== sequenceId) return
    const position = sequenceDropPosition(event)
    if (item.kind === 'waypoint') {
      onReorderWaypoint(item.id, index + (position === 'after' ? 1 : 0))
    } else {
      onMoveAction(item.waypointId, item.id, wpId, action.id, position)
    }
  }

  return (
    <li
      className={[
        `${SEQUENCE_LIST_ITEM_CLASS} flex items-center gap-2 bg-(--card) text-xs [list-style:none] border-b border-border`,
        dragging ? 'border-(--primary) border-dashed' : '',
        dropPosition === 'before'
          ? '[box-shadow:inset_0_0.125rem_0_var(--primary)]'
          : '',
        dropPosition === 'after'
          ? '[box-shadow:inset_0_-0.125rem_0_var(--primary)]'
          : '',
        isLastSequenceRow ? 'border-b-0' : ''
      ]
        .filter(Boolean)
        .join(' ')}
      data-testid={`ms-action-row-${action.id}`}
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
      onDrop={handleDrop}
    >
      <SkyTooltip>
        <Button
          type='button'
          variant='ghost'
          size='icon-xs'
          className={`flex-[0_0_auto] self-center inline-flex items-center justify-center w-5.5 h-8.5 text-sm border border-transparent rounded-(--radius) bg-transparent text-(--muted-foreground) cursor-grab touch-none hover:bg-(--accent) hover:text-(--foreground) focus-visible:outline-2 focus-visible:outline-(--primary) focus-visible:outline-offset-1${
            dragging ? ' text-(--primary) cursor-grabbing' : ''
          }`}
          draggable
          aria-label={`Drag to reorder ${action.label} at waypoint ${wpSeq}`}
          data-testid={`ms-action-handle-${action.id}`}
          onDragStart={event => {
            event.stopPropagation()
            writeSequenceDragItem(event, {
              kind: 'action',
              id: action.id,
              waypointId: wpId,
      routeId: sequenceId
            })
            setDragging(true)
          }}
          onDragEnd={() => {
            setDragging(false)
            setDropPosition(null)
          }}
        >
          <DotsSixVerticalIcon aria-hidden='true' />
        </Button>
      </SkyTooltip>
      <SequenceActionBadge kind={action.kind} />
      <span className='flex-[1_1_auto] text-(--foreground) font-medium'>
        {action.label}
      </span>
      {action.kind === 'photo' ? (
        <label className='flex items-center gap-1 whitespace-nowrap'>
          <span className='text-(--muted-foreground)'>Pitch</span>
          <NumberField
            value={action.gimbalPitchDeg ?? inheritedPitch}
            min={-90}
            max={0}
            step={1}
            onValueChange={value => {
              if (typeof value === 'number' && Number.isFinite(value))
                onSetPitch(wpId, action.id, value)
            }}
          >
            <NumberFieldInput
              className='text-right'
              aria-label={`Gimbal pitch at waypoint ${wpSeq}`}
            />
          </NumberField>
          <span>°</span>
        </label>
      ) : null}
      <SkyTooltip>
        <Button
          size='icon-sm'
          variant='ghost'
          aria-label={`Remove ${action.label} from waypoint ${wpSeq}`}
          onClick={() => onDeleteAction(wpId, action.id)}
        >
          <TrashIcon aria-hidden='true' />
        </Button>
      </SkyTooltip>
    </li>
  )
}
