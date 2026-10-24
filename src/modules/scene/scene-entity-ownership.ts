/* scene-entity-ownership.ts — which scene layer owns which Cesium entity.

   Every entity the Mission Studio scene creates belongs to exactly one
   layer, and exactly one synchroniser owns each layer:

   | layer     | owner                                  | entity IDs                        |
   | --------- | -------------------------------------- | --------------------------------- |
   | committed | committed mission sync effect          | ms-home-*, ms-grid-*, ms-wp-*, …   |
   | draft     | draft overlay sync                     | ms-draw-plane, ms-pending-*       |
   | capture   | photo frustum / footprint sync         | ms-photo-*, ms-camera-footprint-* |
   | preview   | preview capture scan (render loop)     | ms-preview-scan-*                 |
   | guide     | waypoint ground-height hover guide     | ms-waypoint-ground-*              |
   | search    | search result pin sync                 | ms-search-result                  |

   A synchroniser may only add, update or remove entities of its own
   layer. A full-scene `entities.removeAll()` — or any other cross-layer
   wipe — lets one layer delete another layer's entities while that
   layer's own synchroniser never re-runs, so the deleted overlay stays
   gone until an unrelated input happens to fire it. `removeAll()` is
   therefore replaced by `removeSceneEntitiesInLayer()` everywhere.

   Membership is derived from the entity ID alone: a pure function with no
   registry state. A Viewer recreation therefore cannot leave stale group
   membership behind — a new Viewer starts empty and every layer rebuilds
   itself from the current snapshot.

   The ID prefixes below are the public picking contract (see
   `agents/reference/architecture.md`); they must not change. The list is
   EXHAUSTIVE on purpose: an ID that no rule claims belongs to no layer and
   is therefore never removed by a layer synchroniser. A new entity family
   must be classified here first, otherwise the committed synchroniser
   cannot adopt it by accident. */

export type SceneEntityLayer =
  | 'committed'
  | 'draft'
  | 'capture'
  | 'preview'
  | 'guide'
  | 'search'

export const SCENE_ENTITY_LAYERS: readonly SceneEntityLayer[] = [
  'committed',
  'draft',
  'capture',
  'preview',
  'guide',
  'search'
]

interface LayerRule {
  readonly layer: SceneEntityLayer
  readonly exact?: readonly string[]
  readonly prefix?: readonly string[]
}

/* The complete ownership table. Order matters only for overlapping
   prefixes; the families below are disjoint. */
const LAYER_RULES: readonly LayerRule[] = [
  /* `ms-search-result` mirrors SEARCH_RESULT_ENTITY_ID in
     mission-scene-helpers.ts. That constant is not exported and the
     helpers module is outside the W01 write scope, so the literal is
     repeated here and kept in sync by the W01 ownership check. */
  { layer: 'search', exact: ['ms-search-result'] },
  { layer: 'draft', exact: ['ms-draw-plane'], prefix: ['ms-pending-'] },
  { layer: 'capture', prefix: ['ms-photo-', 'ms-camera-footprint-'] },
  { layer: 'preview', prefix: ['ms-preview-scan-'] },
  { layer: 'guide', prefix: ['ms-waypoint-ground-'] },
  /* Committed mission geometry: home markers, studio grid, World relief,
     Area/Avoid zones and scan lanes, routes, transfers, waypoints and the
     vehicle. `ms-area-` also covers the outline and length-label families
     and `ms-avoid-` the height affordances. */
  {
    layer: 'committed',
    exact: ['ms-vehicle'],
    prefix: [
      'ms-home-',
      'ms-grid-',
      'ms-world-terrain-',
      'ms-area-',
      'ms-avoid-',
      'ms-route-',
      'ms-transfer-',
      'ms-wp-'
    ]
  }
]

/** Layer that owns `entityId`, or null when no layer claims the ID. */
export function sceneEntityLayer(entityId: string): SceneEntityLayer | null {
  for (const rule of LAYER_RULES) {
    if (rule.exact?.includes(entityId)) return rule.layer
    if (rule.prefix?.some((prefix) => entityId.startsWith(prefix))) return rule.layer
  }
  return null
}

/** Minimal structural view of a Cesium entity, so ownership stays testable
    without a live Viewer. */
export interface SceneEntityLike {
  readonly id: string
}

/** Minimal structural view of `viewer.entities`. */
export interface SceneEntityCollectionLike {
  readonly values: Iterable<SceneEntityLike>
  remove(entity: SceneEntityLike): boolean
}

/** Remove only the entities owned by `layer` and report the removed IDs.

    Rebuilding a layer this way also drops the entities that its own
    snapshot no longer contains (for example the photo frustum of a
    deleted waypoint), because the whole layer is replaced instead of
    only the entities the new snapshot still mentions. */
export function removeSceneEntitiesInLayer(
  entities: SceneEntityCollectionLike,
  layer: SceneEntityLayer
): string[] {
  const removed: string[] = []
  /* Snapshot the collection first: `remove` mutates the live Cesium entity
     dictionary, so iterating it directly would skip entities. */
  const snapshot = Array.from(entities.values)
  for (const entity of snapshot) {
    if (sceneEntityLayer(entity.id) !== layer) continue
    entities.remove(entity)
    removed.push(entity.id)
  }
  return removed
}

/** IDs of `entityIds` that belong to `layer`. */
export function sceneEntityIdsInLayer(entityIds: Iterable<string>, layer: SceneEntityLayer): string[] {
  const ids: string[] = []
  for (const id of entityIds) {
    if (sceneEntityLayer(id) === layer) ids.push(id)
  }
  return ids
}
