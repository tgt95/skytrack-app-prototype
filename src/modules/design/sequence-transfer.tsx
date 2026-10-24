import { Badge } from 'skytrack-ui/badge'
import { Select, SelectIcon, SelectItem, SelectItemIndicator, SelectItemText, SelectList, SelectPopup, SelectPortal, SelectPositioner, SelectTrigger, SelectValue } from 'skytrack-ui/select'
import type { DerivedTransfer } from '../../domain/transfer-planner'
import type { StudioMission } from '../../domain/mission-model'

export function TransferRow({ transfer, as = 'div' }: { transfer?: DerivedTransfer; as?: 'div' | 'li' }) {
  if (!transfer) return null
  const Tag = as
  return (
    <Tag
      className='ms-seq-row ms-seq-trans'
      role='note'
      data-testid={`ms-trans-${transfer.id}`}
      aria-label={`Generated transfer from ${transfer.fromLabel} to ${transfer.toLabel}, ${transfer.distanceM.toFixed(1)} meters`}
    >
      <Badge count='TRANS' status='secondary' size='sm' />
      <span className='ms-seq-marker-label'>Go to the next {transfer.toType}</span>
      <span className='ms-seq-dist'>{transfer.distanceM.toFixed(1)} m{transfer.hasDetour ? ' · detour' : ''}</span>
      {transfer.errorMessage ? <span className='ms-issue is-warning'>{transfer.errorMessage}</span> : null}
    </Tag>
  )
}

export function EndMissionControl({ mission, onUpdateMission }: {
  mission: StudioMission
  onUpdateMission: (next: StudioMission, label?: string) => void
}) {
  return (
    <div className='ms-seq-row ms-end'>
      <Badge count='END' status='outline' size='sm' className='ms-seq-static-accent' />
      <Select<string>
        items={[
          { value: 'home', label: 'Drone - Return to home' },
          { value: 'stay', label: 'Stay at last waypoint' }
        ]}
        value={mission.returnHomeOnEnd ? 'home' : 'stay'}
        onValueChange={(value: unknown) => {
          const home = String(value) !== 'stay'
          if (home === mission.returnHomeOnEnd) return
          onUpdateMission(
            { ...mission, returnHomeOnEnd: home },
            home ? 'Drone returns home on end.' : 'Drone stays at last waypoint on end.'
          )
        }}
      >
        <SelectTrigger aria-label='End of mission behavior' data-testid='ms-end-select' className='ms-end-select'>
          <SelectValue />
          <SelectIcon />
        </SelectTrigger>
        <SelectPortal>
          <SelectPositioner side='bottom' align='end' sideOffset={4}>
            <SelectPopup>
              <SelectList>
                <SelectItem value='home'><SelectItemIndicator /><SelectItemText>Drone - Return to home</SelectItemText></SelectItem>
                <SelectItem value='stay'><SelectItemIndicator /><SelectItemText>Stay at last waypoint</SelectItemText></SelectItem>
              </SelectList>
            </SelectPopup>
          </SelectPositioner>
        </SelectPortal>
      </Select>
    </div>
  )
}
