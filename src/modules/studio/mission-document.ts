/* mission-document.ts — canonical mission document + design history for the
   Mission Studio shell. Owns the document/history transitions that used to be
   scattered across the React shell (src/index.tsx): commit / undo / redo /
   load / markSaved, plus the saved baseline snapshot that drives the dirty
   marker.

   Scope rules:
   - One canonical StudioMission source of truth: `document.mission`.
   - Only document/history transitions live here. Transient UI state
     (selection, draft points, tool, panel preview base, announcements,
     simulation) stays in the shell; actions carry no side effects.
   - Snapshot strings come from the domain `snapshotOf` at the shell
     callsites, exactly as before; this module never parses them.
   - Pure reducer: same input → same next document, no React, no I/O, no
     module-level state, no new dependency or persistence/schema change. */

import {
  emptyMission,
  snapshotOf,
  type StudioMission
} from '../../domain/mission-model'

/** Undo/redo stack depth cap. Oldest entries drop beyond it. */
const HISTORY_CAP = 50

export interface StudioMissionDocument {
  /** Canonical design source of truth. */
  mission: StudioMission
  /** Snapshot string of the last saved mission; '' until the pristine baseline is captured. */
  savedSnap: string
  /** Undo stack of snapshots, oldest first, at most HISTORY_CAP entries. */
  past: string[]
  /** Redo stack of snapshots, newest first, at most HISTORY_CAP entries. */
  future: string[]
}

/** Initial document: a fresh empty mission, nothing saved, no history. */
export function emptyStudioMissionDocument(): StudioMissionDocument {
  return { mission: emptyMission(), savedSnap: '', past: [], future: [] }
}

export type StudioMissionDocumentAction =
  /** New committed edit: exactly one undo entry (snapshot of the pre-edit
      mission) and the redo stack cleared. `from` defaults to the snapshot of
      the current document mission; the panel-preview commit passes the
      pre-preview base explicitly so history records the designed state,
      never the transient preview. */
  | { type: 'commit'; next: StudioMission; from?: string }
  /** Replace the displayed mission without touching history. Preview-restore
      transitions only (panel preview set/cancel and the panel commit
      no-change reset): undo/redo and the saved marker stay as they are. */
  | { type: 'set'; next: StudioMission }
  /** Open a record: the restored mission is canonical, the saved baseline is
      its own snapshot and both history stacks reset. */
  | { type: 'load'; restored: StudioMission }
  /** Step one committed edit back. `restored` is the mission parsed from the
      popped snapshot at the callsite; when parsing failed, undefined keeps
      the current mission while the stacks still advance, exactly as before. */
  | { type: 'undo'; restored?: StudioMission }
  /** Step one committed edit forward, symmetric to `undo`. */
  | { type: 'redo'; restored?: StudioMission }
  /** Record a completed save: the saved baseline becomes this mission's
      snapshot. History is untouched, so undo still walks back to pre-save
      designs and the dirty marker clears on the current mission. */
  | { type: 'markSaved'; saved: StudioMission }
  /** Capture the pristine baseline once, only before anything is saved. */
  | { type: 'initSavedSnapshot' }

/** One mission document + undo/redo transition per action, with the exact
    stack shapes the shell used before extraction:
    - commit pushes `from` behind a cap of HISTORY_CAP - 1 kept entries,
    - undo pushes the pre-undo snapshot at the head of the redo stack under
      HISTORY_CAP, redo mirrors it onto the undo stack. */
export function studioMissionReducer(
  state: StudioMissionDocument,
  action: StudioMissionDocumentAction
): StudioMissionDocument {
  switch (action.type) {
    case 'commit': {
      const from = action.from ?? snapshotOf(state.mission)
      if (snapshotOf(action.next) === from) return state
      return {
        mission: action.next,
        savedSnap: state.savedSnap,
        past: [...state.past.slice(-(HISTORY_CAP - 1)), from],
        future: []
      }
    }
    case 'set':
      return { ...state, mission: action.next }
    case 'load':
      return {
        mission: action.restored,
        savedSnap: snapshotOf(action.restored),
        past: [],
        future: []
      }
    case 'undo': {
      const prev = state.past[state.past.length - 1]
      if (prev === undefined) return state
      return {
        mission: action.restored ?? state.mission,
        savedSnap: state.savedSnap,
        past: state.past.slice(0, -1),
        future: [snapshotOf(state.mission), ...state.future].slice(0, HISTORY_CAP)
      }
    }
    case 'redo': {
      const next = state.future[0]
      if (next === undefined) return state
      return {
        mission: action.restored ?? state.mission,
        savedSnap: state.savedSnap,
        past: [...state.past.slice(-(HISTORY_CAP - 1)), snapshotOf(state.mission)],
        future: state.future.slice(1)
      }
    }
    case 'markSaved':
      return {
        ...state,
        mission: action.saved,
        savedSnap: snapshotOf(action.saved)
      }
    case 'initSavedSnapshot':
      return state.savedSnap === ''
        ? { ...state, savedSnap: snapshotOf(state.mission) }
        : state
  }
}

/** Dirty marker: true only once a saved baseline exists and the mission
    drifted from it. */
export function isMissionDocumentDirty(state: StudioMissionDocument): boolean {
  return state.savedSnap !== '' && snapshotOf(state.mission) !== state.savedSnap
}
