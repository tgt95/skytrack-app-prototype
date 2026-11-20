export type WindVisualizationMode = "particle-stream" | "flow-field";

export const WIND_VISUALIZATION_MODES: {
  value: WindVisualizationMode;
  label: string;
}[] = [
  { value: "particle-stream", label: "Particle stream" },
  { value: "flow-field", label: "Volumetric flow field" },
];
