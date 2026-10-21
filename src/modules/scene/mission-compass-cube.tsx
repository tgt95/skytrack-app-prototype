/* mission-compass-cube.tsx — Mission Studio-local 3D orientation cube.
   Mirrors Planner's cube visual/orientation behavior (see planner/map3d/
   compass-cube.tsx as a read-only reference; no Planner imports here).
   Faces snap to the corresponding camera view; clicks near a visible face's
   edge or corner region snap to the adjacent diagonal/oblique view instead.
   Dragging the cube orbits the camera. All camera work is delegated to the
   host scene through callbacks so this file stays presentational. */

import { useCallback, useEffect, useRef } from 'react'

export interface MissionCubeSnap {
  heading?: number
  pitch?: number
}

export interface MissionCubeSnapDef extends MissionCubeSnap {
  id: string
  label: string
}

interface MissionCompassCubeProps {
  heading: number
  pitch: number
  interactive: boolean
  onSnap: (snap: MissionCubeSnap) => void
  onOrbitBy: (dx: number, dy: number) => void
  onOrbitEnd: () => void
}

const DEG = Math.PI / 180
/** Side-view pitch clamp, mirroring Planner (-10 deg, never through horizon). */
export const MISSION_CUBE_SIDE_PITCH = -10 * DEG
/** Nadir top-view pitch, mirroring Planner (-89.5 deg). */
export const MISSION_CUBE_TOP_PITCH = -89.5 * DEG
/** Oblique edge/corner pitch: halfway between nadir and side clamp. */
export const MISSION_CUBE_OBLIQUE_PITCH = -45 * DEG

const HEADINGS = {
  south: 0,
  southwest: Math.PI / 4,
  west: Math.PI / 2,
  northwest: (3 * Math.PI) / 4,
  north: Math.PI,
  northeast: (5 * Math.PI) / 4,
  east: (3 * Math.PI) / 2,
  southeast: (7 * Math.PI) / 4
} as const

function normHeading(h: number): number {
  let v = h % (2 * Math.PI)
  if (v < 0) v += 2 * Math.PI
  return v
}

const DIAGONAL_KEYS = ['southwest', 'northwest', 'northeast', 'southeast'] as const

function diagonalKeyFor(heading: number): (typeof DIAGONAL_KEYS)[number] {
  const h = normHeading(heading)
  let best: (typeof DIAGONAL_KEYS)[number] = DIAGONAL_KEYS[0]
  let bestDist = Number.POSITIVE_INFINITY
  for (const key of DIAGONAL_KEYS) {
    let d = Math.abs(h - HEADINGS[key])
    if (d > Math.PI) d = 2 * Math.PI - d
    if (d < bestDist) {
      bestDist = d
      best = key
    }
  }
  return best
}

function sideKeyFor(heading: number): 'south' | 'west' | 'north' | 'east' {
  const h = normHeading(heading)
  const entries = [
    ['south', HEADINGS.south],
    ['west', HEADINGS.west],
    ['north', HEADINGS.north],
    ['east', HEADINGS.east]
  ] as const
  let best: 'south' | 'west' | 'north' | 'east' = 'south'
  let bestDist = Number.POSITIVE_INFINITY
  for (const [key, value] of entries) {
    let d = Math.abs(h - value)
    if (d > Math.PI) d = 2 * Math.PI - d
    if (d < bestDist) {
      bestDist = d
      best = key
    }
  }
  return best
}

/** Full snap catalog: 5 faces, 4 diagonal sides, 4 oblique sides, 4 oblique diagonals. */
export const MISSION_CUBE_SNAPS: MissionCubeSnapDef[] = [
  { id: 'top', label: 'Top view', pitch: MISSION_CUBE_TOP_PITCH },
  { id: 'south', label: 'South view', heading: HEADINGS.south, pitch: MISSION_CUBE_SIDE_PITCH },
  { id: 'north', label: 'North view', heading: HEADINGS.north, pitch: MISSION_CUBE_SIDE_PITCH },
  { id: 'west', label: 'West view', heading: HEADINGS.west, pitch: MISSION_CUBE_SIDE_PITCH },
  { id: 'east', label: 'East view', heading: HEADINGS.east, pitch: MISSION_CUBE_SIDE_PITCH },
  { id: 'southwest', label: 'South-west view', heading: HEADINGS.southwest, pitch: MISSION_CUBE_SIDE_PITCH },
  { id: 'northwest', label: 'North-west view', heading: HEADINGS.northwest, pitch: MISSION_CUBE_SIDE_PITCH },
  { id: 'northeast', label: 'North-east view', heading: HEADINGS.northeast, pitch: MISSION_CUBE_SIDE_PITCH },
  { id: 'southeast', label: 'South-east view', heading: HEADINGS.southeast, pitch: MISSION_CUBE_SIDE_PITCH },
  { id: 'top-south', label: 'Oblique south view', heading: HEADINGS.south, pitch: MISSION_CUBE_OBLIQUE_PITCH },
  { id: 'top-north', label: 'Oblique north view', heading: HEADINGS.north, pitch: MISSION_CUBE_OBLIQUE_PITCH },
  { id: 'top-west', label: 'Oblique west view', heading: HEADINGS.west, pitch: MISSION_CUBE_OBLIQUE_PITCH },
  { id: 'top-east', label: 'Oblique east view', heading: HEADINGS.east, pitch: MISSION_CUBE_OBLIQUE_PITCH },
  { id: 'top-southwest', label: 'Oblique south-west view', heading: HEADINGS.southwest, pitch: MISSION_CUBE_OBLIQUE_PITCH },
  { id: 'top-northwest', label: 'Oblique north-west view', heading: HEADINGS.northwest, pitch: MISSION_CUBE_OBLIQUE_PITCH },
  { id: 'top-northeast', label: 'Oblique north-east view', heading: HEADINGS.northeast, pitch: MISSION_CUBE_OBLIQUE_PITCH },
  { id: 'top-southeast', label: 'Oblique south-east view', heading: HEADINGS.southeast, pitch: MISSION_CUBE_OBLIQUE_PITCH }
]

export function resolveMissionSnap(id: string): MissionCubeSnap | null {
  const found = MISSION_CUBE_SNAPS.find((s) => s.id === id)
  if (!found) return null
  const snap: MissionCubeSnap = {}
  if (found.heading !== undefined) snap.heading = found.heading
  if (found.pitch !== undefined) snap.pitch = found.pitch
  return snap
}

type CubeFace = 'TOP' | 'NORTH' | 'SOUTH' | 'EAST' | 'WEST'

const FACE_SNAP_ID: Record<CubeFace, string> = {
  TOP: 'top',
  SOUTH: 'south',
  NORTH: 'north',
  WEST: 'west',
  EAST: 'east'
}

const FACE_HEADING: Record<Exclude<CubeFace, 'TOP'>, number> = {
  SOUTH: HEADINGS.south,
  NORTH: HEADINGS.north,
  WEST: HEADINGS.west,
  EAST: HEADINGS.east
}

const CUBE_SIZE = 56
const HALF_SIZE = CUBE_SIZE / 2
/** Normalized face-coordinate band for edge/corner regions (outer ~1/3). */
const REGION_BAND = 0.33

export function MissionCompassCube({ heading, pitch, interactive, onSnap, onOrbitBy, onOrbitEnd }: MissionCompassCubeProps) {
  const pointerDownRef = useRef<{ x: number; y: number } | null>(null)
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null)
  const dragThresholdPassedRef = useRef(false)
  const activePointerIdRef = useRef<number | null>(null)
  const lastDragEndAtRef = useRef(0)
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const interactiveRef = useRef(interactive)
  interactiveRef.current = interactive
  const orbitRef = useRef({ onOrbitBy, onOrbitEnd })
  orbitRef.current = { onOrbitBy, onOrbitEnd }
  const snapRef = useRef(onSnap)
  snapRef.current = onSnap
  const headingRef = useRef(heading)
  headingRef.current = heading

  const endDrag = useCallback((wasDrag: boolean) => {
    if (activePointerIdRef.current !== null && viewportRef.current) {
      try {
        if (viewportRef.current.hasPointerCapture(activePointerIdRef.current)) {
          viewportRef.current.releasePointerCapture(activePointerIdRef.current)
        }
      } catch {
        /* ignore */
      }
    }
    activePointerIdRef.current = null
    pointerDownRef.current = null
    lastPointerRef.current = null
    if (dragThresholdPassedRef.current || wasDrag) {
      orbitRef.current.onOrbitEnd()
      dragThresholdPassedRef.current = false
      lastDragEndAtRef.current = performance.now()
    } else {
      dragThresholdPassedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!interactiveRef.current) endDrag(false)
  }, [interactive, endDrag])

  useEffect(() => {
    const onBlur = () => endDrag(false)
    const onKey = (e: KeyboardEvent) => {
      // Cancel only an active cube drag; never steal keys from waypoint editing.
      if (e.key === 'Escape' && activePointerIdRef.current !== null) endDrag(false)
    }
    window.addEventListener('blur', onBlur)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('keydown', onKey)
      endDrag(false)
    }
  }, [endDrag])

  const fireSnap = useCallback((face: CubeFace, u: number, v: number) => {
    if (!interactiveRef.current) return
    if (dragThresholdPassedRef.current) return
    // Ignore the click that terminates a drag (pointerup precedes click).
    if (performance.now() - lastDragEndAtRef.current < 350) return
    const snap = resolveRegionSnap(face, u, v, headingRef.current)
    if (snap) snapRef.current(snap)
  }, [])

  const handleFaceClick = useCallback(
    (face: CubeFace) => (e: React.MouseEvent<HTMLButtonElement>) => {
      const rect = e.currentTarget.getBoundingClientRect()
      const u = rect.width > 0 ? ((e.clientX - rect.left) / rect.width) * 2 - 1 : 0
      const v = rect.height > 0 ? ((e.clientY - rect.top) / rect.height) * 2 - 1 : 0
      fireSnap(face, u, v)
    },
    [fireSnap]
  )

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!interactiveRef.current || e.button !== 0 || !e.isPrimary) return
    if (activePointerIdRef.current !== null) return
    activePointerIdRef.current = e.pointerId
    pointerDownRef.current = { x: e.clientX, y: e.clientY }
    lastPointerRef.current = { x: e.clientX, y: e.clientY }
    dragThresholdPassedRef.current = false
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!interactiveRef.current) {
      if (activePointerIdRef.current !== null) endDrag(false)
      return
    }
    if (activePointerIdRef.current !== e.pointerId || !lastPointerRef.current || !pointerDownRef.current) return
    const totalDx = e.clientX - pointerDownRef.current.x
    const totalDy = e.clientY - pointerDownRef.current.y
    if (!dragThresholdPassedRef.current) {
      if (totalDx * totalDx + totalDy * totalDy < 16) return
      dragThresholdPassedRef.current = true
      try {
        viewportRef.current?.setPointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }
    }
    const dx = e.clientX - lastPointerRef.current.x
    const dy = e.clientY - lastPointerRef.current.y
    lastPointerRef.current = { x: e.clientX, y: e.clientY }
    orbitRef.current.onOrbitBy(dx, dy)
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current === e.pointerId) endDrag(false)
  }

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current === e.pointerId) endDrag(false)
  }

  const handleLostPointerCapture = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current === e.pointerId) endDrag(false)
  }

  const headingDeg = (heading * 180) / Math.PI
  const pitchDeg = (pitch * 180) / Math.PI

  // CSS 3D transform, mirroring Planner: nadir pitch (-90) shows TOP;
  // near-horizontal pitch (-10) tilts the south face toward the camera.
  const rx = 90 + pitchDeg
  const rz = -headingDeg

  const rxRad = (rx * Math.PI) / 180
  const rzRad = (rz * Math.PI) / 180
  const topVisible = Math.cos(rxRad) > 0.05
  const southVisible = Math.sin(rxRad) * Math.cos(rzRad) > 0.05
  const northVisible = -Math.sin(rxRad) * Math.cos(rzRad) > 0.05
  const eastVisible = Math.sin(rxRad) * Math.sin(rzRad) > 0.05
  const westVisible = -Math.sin(rxRad) * Math.sin(rzRad) > 0.05

  const faceState = (face: CubeFace): { visible: boolean; transform: string; testid: string; aria: string } => {
    switch (face) {
      case 'TOP':
        return { visible: topVisible, transform: `translateZ(${HALF_SIZE}px)`, testid: 'ms-cube-face-top', aria: 'Top view' }
      case 'SOUTH':
        return { visible: southVisible, transform: `rotateX(-90deg) translateZ(${HALF_SIZE}px)`, testid: 'ms-cube-face-south', aria: 'South view' }
      case 'NORTH':
        return { visible: northVisible, transform: `rotateX(90deg) translateZ(${HALF_SIZE}px)`, testid: 'ms-cube-face-north', aria: 'North view' }
      case 'WEST':
        return { visible: westVisible, transform: `rotateY(-90deg) translateZ(${HALF_SIZE}px)`, testid: 'ms-cube-face-west', aria: 'West view' }
      case 'EAST':
        return { visible: eastVisible, transform: `rotateY(90deg) translateZ(${HALF_SIZE}px)`, testid: 'ms-cube-face-east', aria: 'East view' }
    }
  }

  const faces: { face: CubeFace; label: string }[] = [
    { face: 'TOP', label: 'TOP' },
    { face: 'SOUTH', label: 'SOUTH' },
    { face: 'NORTH', label: 'NORTH' },
    { face: 'WEST', label: 'WEST' },
    { face: 'EAST', label: 'EAST' }
  ]

  return (
    <div
      className={`ms-compass-cube${interactive ? '' : ' is-disabled'}`}
      aria-label='3D orientation cube'
      data-testid='ms-cube'
    >
      <div
        ref={viewportRef}
        className='ms-cube-viewport'
        style={{ width: `${CUBE_SIZE + 24}px`, height: `${CUBE_SIZE + 24}px` }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onLostPointerCapture={handleLostPointerCapture}
      >
        <div
          className='ms-cube'
          style={{ width: `${CUBE_SIZE}px`, height: `${CUBE_SIZE}px`, transform: `rotateX(${rx}deg) rotateZ(${rz}deg)` }}
        >
          {faces.map(({ face, label }) => {
            const st = faceState(face)
            const shown = interactive && st.visible
            return (
              <button
                key={face}
                type='button'
                className={`ms-cube-face ms-cube-face-${face.toLowerCase()}`}
                style={{
                  transform: st.transform,
                  pointerEvents: shown ? 'auto' : 'none',
                  visibility: st.visible ? 'visible' : 'hidden'
                }}
                onClick={handleFaceClick(face)}
                aria-label={`${st.aria} — edges and corners snap to diagonal views`}
                data-testid={st.testid}
                tabIndex={shown ? 0 : -1}
              >
                {label}
              </button>
            )
          })}
          <div
            className='ms-cube-face ms-cube-face-bottom'
            style={{ transform: `rotateX(180deg) translateZ(${HALF_SIZE}px)` }}
            aria-hidden='true'
          />
        </div>
      </div>
      {/* Keyboard access to every snap target, including edge/corner views
          that pointer users reach via face regions. Revealed on focus only,
          so waypoint editing focus order is otherwise untouched. */}
      <div className='ms-cube-kb' aria-label='Keyboard view controls'>
        {MISSION_CUBE_SNAPS.map((snap) => (
          <button
            key={snap.id}
            type='button'
            disabled={!interactive}
            data-testid={`ms-cube-kb-${snap.id}`}
            tabIndex={interactive ? 0 : -1}
            className='ms-cube-kb-btn'
            onClick={() => {
              if (interactive) snapRef.current({ heading: snap.heading, pitch: snap.pitch })
            }}
          >
            {snap.label}
          </button>
        ))}
      </div>
    </div>
  )
}

/**
 * Resolve a click at normalized face coordinates (u,v in [-1,1], +v downward)
 * to a face, edge, or corner snap. Center band snaps to the face view;
 * edge bands snap to the adjacent side/oblique view; corner bands snap to
 * the diagonal/oblique-diagonal view.
 */
function resolveRegionSnap(face: CubeFace, u: number, v: number, headingRad = 0): MissionCubeSnap | null {
  const au0 = Math.abs(u)
  const av0 = Math.abs(v)
  const faceSnap = resolveMissionSnap(FACE_SNAP_ID[face])
  if (!faceSnap) return null
  if (Math.max(au0, av0) < REGION_BAND) return faceSnap

  if (face === 'TOP') {
    // Heading-relative mapping: the cube visual rotates in-plane by
    // rz = -heading, so a screen vector (u,v) corresponds to the
    // face-local vector Rot(+heading) * (u,v). Map the face-local
    // region to world sides; at heading 0 this reduces to the fixed
    // screen-up = north mapping.
    const ch = Math.cos(headingRad)
    const sh = Math.sin(headingRad)
    const uf = u * ch - v * sh
    const vf = u * sh + v * ch
    const au = Math.abs(uf)
    const av = Math.abs(vf)
    const horizontal = au >= av
    if (Math.min(au, av) >= REGION_BAND) {
      const diag = cornerDiagonal(uf < 0, vf < 0)
      return resolveMissionSnap(`top-${diag}`)
    }
    if (horizontal) return resolveMissionSnap(uf < 0 ? 'top-west' : 'top-east')
    return resolveMissionSnap(vf < 0 ? 'top-north' : 'top-south')
  }

  const baseHeading = FACE_HEADING[face]
  const isSide = au0 >= av0
  const isCorner = Math.min(au0, av0) >= REGION_BAND
  if (isCorner) {
    const upper = v < 0
    const sideward = u < 0 ? normHeading(baseHeading - Math.PI / 4) : normHeading(baseHeading + Math.PI / 4)
    if (upper) {
      const diag = diagonalKeyFor(sideward)
      return { heading: HEADINGS[diag], pitch: MISSION_CUBE_OBLIQUE_PITCH }
    }
    const diag = diagonalKeyFor(sideward)
    return { heading: HEADINGS[diag], pitch: MISSION_CUBE_SIDE_PITCH }
  }
  if (isSide) {
    const sideward = u < 0 ? normHeading(baseHeading - Math.PI / 4) : normHeading(baseHeading + Math.PI / 4)
    const diag = diagonalKeyFor(sideward)
    return { heading: HEADINGS[diag], pitch: MISSION_CUBE_SIDE_PITCH }
  }
  if (v < 0) {
    const side = sideKeyFor(baseHeading)
    return resolveMissionSnap(`top-${side}`)
  }
  return faceSnap
}

/** Screen-corner (left, up) flags to a diagonal key for the TOP face. */
function cornerDiagonal(left: boolean, up: boolean): string {
  if (up && left) return 'northwest'
  if (up && !left) return 'northeast'
  if (!up && left) return 'southwest'
  return 'southeast'
}

export default MissionCompassCube
