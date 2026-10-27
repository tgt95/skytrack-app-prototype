/* mission-compass-model.ts — pure orientation snap definitions and resolution. */

export interface MissionCubeSnap {
  heading?: number;
  pitch?: number;
}

export interface MissionCubeSnapDef extends MissionCubeSnap {
  id: string;
  label: string;
}

const DEG = Math.PI / 180;
/** Side-view pitch clamp, mirroring Planner (-10 deg, never through horizon). */
export const MISSION_CUBE_SIDE_PITCH = -10 * DEG;
/** Nadir top-view pitch, mirroring Planner (-89.5 deg). */
export const MISSION_CUBE_TOP_PITCH = -89.5 * DEG;
/** Oblique edge/corner pitch: halfway between nadir and side clamp. */
export const MISSION_CUBE_OBLIQUE_PITCH = -45 * DEG;

const HEADINGS = {
  south: 0,
  southwest: Math.PI / 4,
  west: Math.PI / 2,
  northwest: (3 * Math.PI) / 4,
  north: Math.PI,
  northeast: (5 * Math.PI) / 4,
  east: (3 * Math.PI) / 2,
  southeast: (7 * Math.PI) / 4,
} as const;

function normHeading(h: number): number {
  let v = h % (2 * Math.PI);
  if (v < 0) v += 2 * Math.PI;
  return v;
}

const DIAGONAL_KEYS = [
  "southwest",
  "northwest",
  "northeast",
  "southeast",
] as const;

function diagonalKeyFor(heading: number): (typeof DIAGONAL_KEYS)[number] {
  const h = normHeading(heading);
  let best: (typeof DIAGONAL_KEYS)[number] = DIAGONAL_KEYS[0];
  let bestDist = Number.POSITIVE_INFINITY;
  for (const key of DIAGONAL_KEYS) {
    let d = Math.abs(h - HEADINGS[key]);
    if (d > Math.PI) d = 2 * Math.PI - d;
    if (d < bestDist) {
      bestDist = d;
      best = key;
    }
  }
  return best;
}

function sideKeyFor(heading: number): "south" | "west" | "north" | "east" {
  const h = normHeading(heading);
  const entries = [
    ["south", HEADINGS.south],
    ["west", HEADINGS.west],
    ["north", HEADINGS.north],
    ["east", HEADINGS.east],
  ] as const;
  let best: "south" | "west" | "north" | "east" = "south";
  let bestDist = Number.POSITIVE_INFINITY;
  for (const [key, value] of entries) {
    let d = Math.abs(h - value);
    if (d > Math.PI) d = 2 * Math.PI - d;
    if (d < bestDist) {
      bestDist = d;
      best = key;
    }
  }
  return best;
}

/** Full snap catalog: 5 faces, 4 diagonal sides, 4 oblique sides, 4 oblique diagonals. */
export const MISSION_CUBE_SNAPS: MissionCubeSnapDef[] = [
  { id: "top", label: "Top view", pitch: MISSION_CUBE_TOP_PITCH },
  {
    id: "south",
    label: "South view",
    heading: HEADINGS.south,
    pitch: MISSION_CUBE_SIDE_PITCH,
  },
  {
    id: "north",
    label: "North view",
    heading: HEADINGS.north,
    pitch: MISSION_CUBE_SIDE_PITCH,
  },
  {
    id: "west",
    label: "West view",
    heading: HEADINGS.west,
    pitch: MISSION_CUBE_SIDE_PITCH,
  },
  {
    id: "east",
    label: "East view",
    heading: HEADINGS.east,
    pitch: MISSION_CUBE_SIDE_PITCH,
  },
  {
    id: "southwest",
    label: "South-west view",
    heading: HEADINGS.southwest,
    pitch: MISSION_CUBE_SIDE_PITCH,
  },
  {
    id: "northwest",
    label: "North-west view",
    heading: HEADINGS.northwest,
    pitch: MISSION_CUBE_SIDE_PITCH,
  },
  {
    id: "northeast",
    label: "North-east view",
    heading: HEADINGS.northeast,
    pitch: MISSION_CUBE_SIDE_PITCH,
  },
  {
    id: "southeast",
    label: "South-east view",
    heading: HEADINGS.southeast,
    pitch: MISSION_CUBE_SIDE_PITCH,
  },
  {
    id: "top-south",
    label: "Oblique south view",
    heading: HEADINGS.south,
    pitch: MISSION_CUBE_OBLIQUE_PITCH,
  },
  {
    id: "top-north",
    label: "Oblique north view",
    heading: HEADINGS.north,
    pitch: MISSION_CUBE_OBLIQUE_PITCH,
  },
  {
    id: "top-west",
    label: "Oblique west view",
    heading: HEADINGS.west,
    pitch: MISSION_CUBE_OBLIQUE_PITCH,
  },
  {
    id: "top-east",
    label: "Oblique east view",
    heading: HEADINGS.east,
    pitch: MISSION_CUBE_OBLIQUE_PITCH,
  },
  {
    id: "top-southwest",
    label: "Oblique south-west view",
    heading: HEADINGS.southwest,
    pitch: MISSION_CUBE_OBLIQUE_PITCH,
  },
  {
    id: "top-northwest",
    label: "Oblique north-west view",
    heading: HEADINGS.northwest,
    pitch: MISSION_CUBE_OBLIQUE_PITCH,
  },
  {
    id: "top-northeast",
    label: "Oblique north-east view",
    heading: HEADINGS.northeast,
    pitch: MISSION_CUBE_OBLIQUE_PITCH,
  },
  {
    id: "top-southeast",
    label: "Oblique south-east view",
    heading: HEADINGS.southeast,
    pitch: MISSION_CUBE_OBLIQUE_PITCH,
  },
];

export function resolveMissionSnap(id: string): MissionCubeSnap | null {
  const found = MISSION_CUBE_SNAPS.find((s) => s.id === id);
  if (!found) return null;
  const snap: MissionCubeSnap = {};
  if (found.heading !== undefined) snap.heading = found.heading;
  if (found.pitch !== undefined) snap.pitch = found.pitch;
  return snap;
}

export type CubeFace = "TOP" | "NORTH" | "SOUTH" | "EAST" | "WEST";

const FACE_SNAP_ID: Record<CubeFace, string> = {
  TOP: "top",
  SOUTH: "south",
  NORTH: "north",
  WEST: "west",
  EAST: "east",
};

const FACE_HEADING: Record<Exclude<CubeFace, "TOP">, number> = {
  SOUTH: HEADINGS.south,
  NORTH: HEADINGS.north,
  WEST: HEADINGS.west,
  EAST: HEADINGS.east,
};

export const CUBE_SIZE = 56;
export const HALF_SIZE = CUBE_SIZE / 2;
/** Normalized face-coordinate band for edge/corner regions (outer ~1/3). */
const REGION_BAND = 0.33;

/**
 * Resolve a click at normalized face coordinates (u,v in [-1,1], +v downward)
 * to a face, edge, or corner snap. Center band snaps to the face view;
 * edge bands snap to the adjacent side/oblique view; corner bands snap to
 * the diagonal/oblique-diagonal view.
 */
export function resolveRegionSnap(
  face: CubeFace,
  u: number,
  v: number,
  headingRad = 0,
): MissionCubeSnap | null {
  const au0 = Math.abs(u);
  const av0 = Math.abs(v);
  const faceSnap = resolveMissionSnap(FACE_SNAP_ID[face]);
  if (!faceSnap) return null;
  if (Math.max(au0, av0) < REGION_BAND) return faceSnap;

  if (face === "TOP") {
    // Heading-relative mapping: the cube visual rotates in-plane by
    // rz = -heading, so a screen vector (u,v) corresponds to the
    // face-local vector Rot(+heading) * (u,v). Map the face-local
    // region to world sides; at heading 0 this reduces to the fixed
    // screen-up = north mapping.
    const ch = Math.cos(headingRad);
    const sh = Math.sin(headingRad);
    const uf = u * ch - v * sh;
    const vf = u * sh + v * ch;
    const au = Math.abs(uf);
    const av = Math.abs(vf);
    const horizontal = au >= av;
    if (Math.min(au, av) >= REGION_BAND) {
      const diag = cornerDiagonal(uf < 0, vf < 0);
      return resolveMissionSnap(`top-${diag}`);
    }
    if (horizontal) return resolveMissionSnap(uf < 0 ? "top-west" : "top-east");
    return resolveMissionSnap(vf < 0 ? "top-north" : "top-south");
  }

  const baseHeading = FACE_HEADING[face];
  const isSide = au0 >= av0;
  const isCorner = Math.min(au0, av0) >= REGION_BAND;
  if (isCorner) {
    const upper = v < 0;
    const sideward =
      u < 0
        ? normHeading(baseHeading - Math.PI / 4)
        : normHeading(baseHeading + Math.PI / 4);
    if (upper) {
      const diag = diagonalKeyFor(sideward);
      return { heading: HEADINGS[diag], pitch: MISSION_CUBE_OBLIQUE_PITCH };
    }
    const diag = diagonalKeyFor(sideward);
    return { heading: HEADINGS[diag], pitch: MISSION_CUBE_SIDE_PITCH };
  }
  if (isSide) {
    const sideward =
      u < 0
        ? normHeading(baseHeading - Math.PI / 4)
        : normHeading(baseHeading + Math.PI / 4);
    const diag = diagonalKeyFor(sideward);
    return { heading: HEADINGS[diag], pitch: MISSION_CUBE_SIDE_PITCH };
  }
  if (v < 0) {
    const side = sideKeyFor(baseHeading);
    return resolveMissionSnap(`top-${side}`);
  }
  return faceSnap;
}

/** Screen-corner (left, up) flags to a diagonal key for the TOP face. */
function cornerDiagonal(left: boolean, up: boolean): string {
  if (up && left) return "northwest";
  if (up && !left) return "northeast";
  if (!up && left) return "southwest";
  return "southeast";
}
