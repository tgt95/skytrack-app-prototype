import { ArrowLeftIcon } from '@phosphor-icons/react'
import { Button } from 'skytrack-ui/button'
import { type ReconFlightSettings, type Waypoint, getMockReconGsdCmPerPx } from '../../domain/mission-model'
import { SkyTooltip } from '../../shared/sky-tooltip'
import { ReconnaissanceSettingsForm } from './reconnaissance-settings-form'

type ReconTarget = { kind: 'route' | 'area'; id: string }

export function ReconSettingsPage({
  codeView,
  target,
  value,
  onChange,
  onBack,
  onCancel,
  onSave
}: {
  codeView: boolean
  target: ReconTarget
  value: ReconFlightSettings
  onChange: (settings: ReconFlightSettings) => void
  onBack: () => void
  onCancel: () => void
  onSave: () => void
}) {
  return (
    <div className={`ms-inspector${codeView ? ' ms-inspector-code' : ''}`} data-testid='ms-design-panel'>
      <section aria-label='Reconnaissance flight settings'>
        <div className='flex items-center gap-1 mb-1'>
          <SkyTooltip><Button size='icon-sm' variant='ghost' aria-label='Back to design' onClick={onBack}>
            <ArrowLeftIcon aria-hidden='true' />
          </Button></SkyTooltip>
          <span className='ms-route-name'>{target.kind === 'area' ? 'Area reconnaissance settings' : 'Route reconnaissance settings'}</span>
        </div>
        <p className='ms-hint'>Configure this prototype capture plan. Terrain and camera metrics are estimates.</p>
        <ReconnaissanceSettingsForm
          value={value}
          onChange={onChange}
          showFlightPattern={target.kind === 'area'}
          altitudeReference={target.kind === 'area' ? 'AGL' : undefined}
        />
        <div className='ms-btnrow mt-8'>
          <Button size='sm' variant='outline' onClick={onCancel}>Cancel</Button>
          <Button size='sm' variant='default' onClick={onSave}>Save settings</Button>
        </div>
      </section>
      <p className='ms-foot-note'>Prototype mock — edits stay local, nothing is uploaded or flown.</p>
    </div>
  )
}

export function ReconCaptureSummary({
  waypoints,
  settings,
  pathLength,
  altitudeAgl = false
}: {
  waypoints: Waypoint[]
  settings: ReconFlightSettings
  pathLength: number
  altitudeAgl?: boolean
}) {
  const captureCount = waypoints.reduce((sum, waypoint) => sum + waypoint.actions.filter((action) => action.kind === 'photo').length, 0)
  const minutes = Math.max(0, (pathLength / Math.max(0.5, settings.flightSpeedMS) + captureCount) / 60)
  const batteryPct = Math.min(99, Math.round(minutes / 27 * 100))
  const gsd = getMockReconGsdCmPerPx(settings.altitudeM)
  const pitches = Array.from(new Set(waypoints.flatMap((waypoint) => waypoint.actions
    .filter((action) => action.kind === 'photo')
    .map((action) => action.gimbalPitchDeg ?? settings.gimbalPitchDeg))))
  const pitchSummary = pitches.length > 1 ? 'Mixed' : `${(pitches[0] ?? settings.gimbalPitchDeg).toFixed(0)}°`
  const estimateNote = `* Payload (17.3 mm sensor, 12.3 mm focal length, 5280 px) and fixed 27-minute battery. This segment estimate excludes Home launch, transfers, and return; Preview includes the full route at mock mission speed.${altitudeAgl ? ' Area AGL uses flat z=0; terrain is omitted.' : ''} Planning estimates only.`

  return (
    <div className='ms-recon-summary' aria-label='Capture summary'>
      <div><span>GSD estimate*</span><strong>{gsd.toFixed(1)} cm/px</strong></div>
      <div><span>{altitudeAgl ? 'Altitude AGL' : 'Altitude'}</span><strong>{settings.altitudeM} m</strong></div>
      <div><span>Front / Side overlap</span><strong>{settings.frontOverlapPct}% / {settings.sideOverlapPct}%</strong></div>
      <div><span>Gimbal pitch</span><strong>{pitchSummary}</strong></div>
      <div><span>Segment estimate</span><strong>{Math.ceil(minutes)} min</strong></div>
      <div><span>Battery segment*</span><strong>Spend {batteryPct}%</strong></div>
      <small>{estimateNote}</small>
    </div>
  )
}
