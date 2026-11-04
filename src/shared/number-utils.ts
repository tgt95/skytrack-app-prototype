/** Round a number to the requested decimal places. Defaults to a whole number. */
export function roundTo(value: number, decimalPlaces = 0): number {
  const scale = 10 ** decimalPlaces;
  const roundedValue =
    Math.round((Math.abs(value) + Number.EPSILON) * scale) / scale;
  return Math.sign(value) * roundedValue;
}

/** Format a metric area using square meters for small areas and hectares for mapped sites. */
export function formatMetricArea(areaM2: number): string {
  if (areaM2 >= 10_000) return `${roundTo(areaM2 / 10_000, 1)} ha`;
  return `${roundTo(areaM2)} m²`;
}
