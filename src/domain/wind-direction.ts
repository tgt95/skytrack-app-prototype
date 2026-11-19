function normalizeWindAzimuth(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}

/** Convert persisted ENU Push TO (0° East, counter-clockwise) to meteorological FROM (0° true North, clockwise). */
export function enuPushToAzimuthToMeteorologicalFrom(azimuthDeg: number): number {
  return normalizeWindAzimuth(270 - azimuthDeg);
}

/** Convert meteorological FROM (0° true North, clockwise) to persisted ENU Push TO (0° East, counter-clockwise). */
export function meteorologicalFromAzimuthToEnuPushTo(azimuthDeg: number): number {
  return normalizeWindAzimuth(270 - azimuthDeg);
}
