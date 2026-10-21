/** Local, synthetic elevation fixtures for legacy 3D World previews.
 *  These are deliberately self-contained demo data: they do not request
 *  satellite imagery or a remote terrain service. Heights are relative meters.
 */

export interface WorldTerrainFixture {
  label: string
  description: string
  /** Rectangular elevation samples, north row first, in relative meters. */
  elevationsM: readonly (readonly number[])[]
  /** Horizontal spacing between adjacent elevation samples, in meters. */
  sampleSpacingM: number
  /** Visual tint for the local terrain surface. */
  tint: string
}

export const WORLD_TERRAIN_FIXTURES: Readonly<Record<string, WorldTerrainFixture>> = {
  'Courtyard block': {
    label: 'Courtyard block',
    description: 'Raised perimeter with a shallow sloped courtyard basin',
    sampleSpacingM: 48,
    tint: '#68846b',
    elevationsM: [
      [8, 8, 8, 8, 8, 8, 8, 8, 8],
      [8, 7, 6, 5, 5, 6, 7, 8, 8],
      [8, 6, 4, 3, 3, 4, 6, 8, 8],
      [8, 5, 3, 1, 1, 3, 5, 8, 8],
      [8, 5, 3, 1, 0, 2, 5, 8, 8],
      [8, 6, 4, 2, 1, 3, 6, 8, 8],
      [8, 7, 6, 4, 3, 5, 7, 8, 8],
      [8, 8, 8, 7, 6, 7, 8, 8, 8],
      [8, 8, 8, 8, 8, 8, 8, 8, 8]
    ]
  },
  'Rooftop pad': {
    label: 'Rooftop pad',
    description: 'Elevated flat pad with sloped access ramps and edges',
    sampleSpacingM: 48,
    tint: '#8a8171',
    elevationsM: [
      [0, 1, 2, 3, 3, 2, 1, 0, 0],
      [1, 3, 5, 7, 7, 5, 3, 1, 0],
      [2, 5, 8, 10, 10, 8, 5, 2, 1],
      [3, 7, 10, 11, 11, 10, 7, 3, 2],
      [3, 7, 10, 11, 11, 10, 7, 3, 2],
      [2, 5, 8, 10, 10, 8, 5, 2, 1],
      [1, 3, 5, 7, 7, 5, 3, 1, 0],
      [0, 1, 2, 3, 3, 2, 1, 0, 0],
      [0, 0, 1, 1, 1, 1, 0, 0, 0]
    ]
  },
  'Rolling hills': {
    label: 'Rolling hills',
    description: 'Low rolling terrain with a diagonal ridge and shallow gullies',
    sampleSpacingM: 48,
    tint: '#6e8b5e',
    elevationsM: [
      [1, 2, 3, 4, 5, 6, 7, 8, 9],
      [1, 3, 5, 7, 8, 9, 10, 11, 11],
      [2, 4, 7, 9, 10, 10, 9, 8, 7],
      [3, 6, 9, 11, 10, 8, 6, 5, 4],
      [4, 8, 11, 10, 7, 4, 3, 3, 4],
      [5, 9, 10, 7, 4, 2, 3, 5, 7],
      [6, 9, 8, 5, 3, 4, 7, 10, 12],
      [6, 8, 6, 4, 4, 7, 11, 14, 15],
      [5, 6, 5, 5, 7, 11, 15, 17, 18]
    ]
  },
  'Mountain ridge': {
    label: 'Mountain ridge',
    description: 'Steep twin slopes rising to a narrow central ridge',
    sampleSpacingM: 48,
    tint: '#778276',
    elevationsM: [
      [0, 1, 2, 3, 4, 4, 3, 2, 1],
      [1, 2, 4, 6, 8, 7, 5, 3, 2],
      [2, 4, 7, 11, 14, 11, 7, 4, 2],
      [3, 6, 11, 17, 21, 16, 10, 5, 3],
      [4, 8, 14, 21, 25, 19, 11, 6, 3],
      [4, 7, 12, 18, 22, 17, 10, 5, 2],
      [3, 5, 8, 12, 15, 12, 7, 4, 1],
      [2, 3, 5, 7, 8, 7, 4, 2, 0],
      [1, 2, 3, 4, 4, 3, 2, 1, 0]
    ]
  }
}
