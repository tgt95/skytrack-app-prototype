import { useEffect, useRef, useState } from "react";
import {
  asRecords,
  asRecord,
  numberValue,
  type JsonRecord,
} from "./mission-insights-report-data";

type PlotTrace = Record<string, unknown>;
type PlotElement = HTMLDivElement & {
  on?: (event: string, handler: (event: Record<string, unknown>) => void) => void;
  _fullLayout?: { scene?: { camera?: PlotCamera } };
};
type PlotCamera = {
  center?: { x?: number; y?: number; z?: number };
  eye?: { x?: number; y?: number; z?: number };
  up?: { x?: number; y?: number; z?: number };
  projection?: { type?: string };
};
type PlotlyApi = {
  react: (
    element: PlotElement,
    traces: PlotTrace[],
    layout: Record<string, unknown>,
    config: Record<string, unknown>,
  ) => Promise<unknown>;
  relayout: (
    element: PlotElement,
    update: Record<string, unknown>,
  ) => Promise<unknown>;
  purge: (element: PlotElement) => void;
  Plots: { resize: (element: PlotElement) => void };
};

declare global {
  interface Window {
    Plotly?: PlotlyApi;
  }
}

const MIN_CAMERA_Z = 0.15;
let plotlyLoad: Promise<PlotlyApi> | null = null;

function loadPlotly(): Promise<PlotlyApi> {
  if (window.Plotly) return Promise.resolve(window.Plotly);
  if (plotlyLoad) return plotlyLoad;
  const loading = new Promise<PlotlyApi>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `${import.meta.env.BASE_URL}vendor/plotly-gl3d.min.js`;
    script.async = true;
    script.onload = () => {
      if (window.Plotly) resolve(window.Plotly);
      else reject(new Error("Plotly loaded without its API."));
    };
    script.onerror = () => reject(new Error("Could not load the 3D chart library."));
    document.head.append(script);
  }).catch((error: unknown) => {
    plotlyLoad = null;
    throw error;
  });
  plotlyLoad = loading;
  return loading;
}

function recordPoint(value: JsonRecord) {
  const x = numberValue(value.x_m);
  const y = numberValue(value.y_m);
  const z = numberValue(value.z_m);
  return x === null || y === null || z === null ? null : { x, y, z };
}

function resolveColor(tokenName: string, backdrop?: string) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return "#808080";
  const token = getComputedStyle(document.documentElement)
    .getPropertyValue(tokenName)
    .trim();
  context.clearRect(0, 0, 1, 1);
  if (backdrop) {
    context.fillStyle = backdrop;
    context.fillRect(0, 0, 1, 1);
  }
  context.fillStyle = token || "#808080";
  context.fillRect(0, 0, 1, 1);
  const [r, g, b] = context.getImageData(0, 0, 1, 1).data;
  return `#${[r, g, b]
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`;
}

async function buildPlot(report: JsonRecord, element: PlotElement, plotly: PlotlyApi) {
  const flight = asRecord(report.flight_path);
  const samples = asRecords(flight.samples)
    .map((sample) => ({ sample, point: recordPoint(sample) }))
    .filter((item): item is { sample: JsonRecord; point: NonNullable<ReturnType<typeof recordPoint>> } => item.point !== null);
  const waypoints = asRecords(report.waypoints)
    .map((waypoint) => ({ waypoint, point: recordPoint(waypoint) }))
    .filter((item): item is { waypoint: JsonRecord; point: NonNullable<ReturnType<typeof recordPoint>> } => item.point !== null);
  if (!samples.length) throw new Error("This report has no flight path samples to plot.");

  const speeds = samples.map(({ sample, point }, index) => {
    if (index === 0) return 0;
    const previous = samples[index - 1];
    const t0 = numberValue(previous.sample.t_s);
    const t1 = numberValue(sample.t_s);
    if (t0 === null || t1 === null || t1 <= t0) return 0;
    return Math.hypot(
      point.x - previous.point.x,
      point.y - previous.point.y,
      point.z - previous.point.z,
    ) / (t1 - t0);
  });
  const x = samples.map(({ point }) => point.x);
  const y = samples.map(({ point }) => point.y);
  const z = samples.map(({ point }) => point.z);
  const allPoints = [...samples.map(({ point }) => point), ...waypoints.map(({ point }) => point)];
  const range = (values: number[]) => [Math.min(...values), Math.max(...values)] as [number, number];
  const xRange = range(allPoints.map((point) => point.x));
  const yRange = range(allPoints.map((point) => point.y));
  const zRange = [Math.min(0, ...allPoints.map((point) => point.z)), Math.max(...allPoints.map((point) => point.z))] as [number, number];
  const spanX = Math.max(1, xRange[1] - xRange[0]);
  const spanY = Math.max(1, yRange[1] - yRange[0]);
  const maxSpan = Math.max(spanX, spanY);
  const background = resolveColor("--background");
  const surface = resolveColor("--card");
  const border = resolveColor("--border", surface);
  const grid = resolveColor("--border", background);
  const foreground = resolveColor("--foreground", surface);
  const muted = resolveColor("--muted-foreground", surface);
  const font = getComputedStyle(document.documentElement).getPropertyValue("--font-sans").trim() || "sans-serif";
  const info = resolveColor("--info", background);
  const cyan = resolveColor("--chart-2", background);
  const success = resolveColor("--success", background);
  const warning = resolveColor("--warning", background);
  const danger = resolveColor("--destructive", background);
  const maxSpeed = Math.max(...speeds, 0.001);
  const colorscale = [[0, info], [0.25, cyan], [0.5, success], [0.75, warning], [1, danger]];
  const start = samples[0];
  const end = samples[samples.length - 1];
  const sameStartEnd = Math.hypot(end.point.x - start.point.x, end.point.y - start.point.y, end.point.z - start.point.z) < 0.5;
  const traces: PlotTrace[] = [{
    type: "scatter3d", mode: "lines+markers", name: "Flight path", showlegend: true,
    x, y, z,
    customdata: samples.map(({ sample }, index) => [numberValue(sample.t_s) ?? 0, speeds[index]]),
    hovertemplate: "t = %{customdata[0]:.1f} s<br>X = %{x:.2f} m · Y = %{y:.2f} m · Z = %{z:.2f} m<br>Speed = %{customdata[1]:.2f} m/s<extra>Flight path</extra>",
    line: { color: speeds, colorscale, cmin: 0, cmax: maxSpeed, width: 5 },
    marker: { size: 3.6, color: speeds, colorscale, cmin: 0, cmax: maxSpeed, showscale: true, colorbar: { title: { text: "Speed (m/s)", side: "top", font: { color: foreground, size: 12, family: font } }, bgcolor: surface, borderwidth: 0, thickness: 15, len: 0.8, x: 0.72, y: 0.5, tickfont: { color: muted, size: 10, family: font }, outlinecolor: border, outlinewidth: 1 } },
  }, {
    type: "scatter3d", mode: "markers+text", name: "Start", showlegend: true,
    x: [start.point.x], y: [start.point.y], z: [start.point.z],
    text: [sameStartEnd ? "Start · End" : "Start"], textposition: "top right", textfont: { color: foreground, size: 11, family: font },
    hovertemplate: `Start (t = ${(numberValue(start.sample.t_s) ?? 0).toFixed(1)} s)<br>X = %{x:.2f} m · Y = %{y:.2f} m · Z = %{z:.2f} m<extra></extra>`,
    marker: { size: 6, symbol: "circle", color: success, line: { color: background, width: 1 } },
  }, {
    type: "scatter3d", mode: sameStartEnd ? "markers" : "markers+text", name: "End", showlegend: true,
    x: [end.point.x], y: [end.point.y], z: [end.point.z], text: sameStartEnd ? undefined : ["End"], textposition: "top center", textfont: { color: foreground, size: 11, family: font },
    hovertemplate: `End (t = ${(numberValue(end.sample.t_s) ?? 0).toFixed(1)} s)<br>X = %{x:.2f} m · Y = %{y:.2f} m · Z = %{z:.2f} m<extra></extra>`,
    marker: { size: 7.5, symbol: "circle", color: warning, line: { color: background, width: 1 } },
  }];

  const reached = waypoints.filter(({ waypoint }) => waypoint.reached === true);
  const defined = waypoints;
  const addWaypointTrace = (item: typeof waypoints[number], reachedState: boolean, showlegend: boolean) => {
    const index = numberValue(item.waypoint.index);
    const label = `WP${index ?? "?"}`;
    const { x: px, y: py, z: pz } = item.point;
    const trace: PlotTrace = {
      type: "scatter3d", mode: reachedState || item.waypoint.reached === false ? "markers+text" : "markers",
      name: reachedState ? "Waypoint reached" : "Waypoint defined",
      legendgroup: reachedState ? "waypoint-reached" : "waypoint-defined", showlegend,
      x: [px], y: [py], z: [pz],
      hovertemplate: `${label} ${reachedState ? "Reached" : `Defined${item.waypoint.reached === false ? " (not reached)" : ""}`}<br>X = %{x:.2f} m · Y = %{y:.2f} m · Z = %{z:.2f} m<extra></extra>`,
      marker: { size: 5.5, symbol: reachedState ? "diamond" : "cross", color: reachedState ? success : danger },
      ...(reachedState ? {} : { opacity: item.waypoint.reached === true ? 0.5 : 0.78 }),
    };
    if (reachedState || item.waypoint.reached === false) {
      trace.text = [label];
      trace.textposition = "top center";
      trace.textfont = { color: reachedState ? foreground : muted, size: 10, family: font };
    }
    traces.push(trace);
  };
  reached.forEach((item, index) => addWaypointTrace(item, true, index === 0));
  defined.forEach((item, index) => addWaypointTrace(item, false, index === 0));

  const axis = (title: string, axisRange: [number, number]) => ({
    title: { text: title, font: { color: foreground, size: 12, family: font } },
    autorange: false, range: axisRange, tickfont: { color: muted, size: 10, family: font },
    gridcolor: grid, linecolor: grid, zerolinecolor: grid, showbackground: true,
    backgroundcolor: background, showspikes: false,
  });
  const layout: Record<string, unknown> = {
    height: 520, margin: { l: 6, r: 12, t: 10, b: 10 }, paper_bgcolor: surface, plot_bgcolor: surface,
    font: { family: font, color: foreground, size: 11 }, showlegend: true,
    legend: { x: 0.83, y: 0.9, xanchor: "left", yanchor: "top", bgcolor: surface, borderwidth: 0, font: { color: foreground, size: 11, family: font }, itemsizing: "constant", tracegroupgap: 4 },
    scene: {
      domain: { x: [0, 0.69], y: [0, 1] }, bgcolor: surface, dragmode: "turntable", aspectmode: "manual",
      aspectratio: { x: Number((Math.max(0.65, 1.35 * spanX / maxSpan)).toFixed(3)), y: Number((Math.max(0.65, 1.35 * spanY / maxSpan)).toFixed(3)), z: 0.65 },
      camera: { center: { x: 0, y: 0, z: 0.02 }, eye: { x: 1.34, y: -1.44, z: 0.86 }, up: { x: 0, y: 0, z: 1 } },
      xaxis: axis("X (m)", xRange), yaxis: axis("Y (m)", yRange), zaxis: axis("Z (m)", zRange),
    },
  };
  await plotly.react(element, traces, layout, {
    responsive: true,
    displaylogo: false,
    displayModeBar: "hover",
    scrollZoom: true,
  });
  let clamping = false;
  element.on?.("plotly_relayout", (event) => {
    if (clamping || !("scene.camera" in event || "scene.camera.eye.z" in event || "scene.camera.up" in event)) return;
    const cameraUpdate = event["scene.camera"] as PlotCamera | undefined;
    const current = cameraUpdate ?? element._fullLayout?.scene?.camera;
    const eye = current?.eye;
    if (!eye) return;
    const nextZ = typeof event["scene.camera.eye.z"] === "number" ? event["scene.camera.eye.z"] as number : eye.z ?? 0.86;
    if (nextZ >= MIN_CAMERA_Z && current?.up?.z === 1 && current.up.x === 0 && current.up.y === 0) return;
    clamping = true;
    void plotly.relayout(element, { "scene.camera": {
      center: current?.center ?? { x: 0, y: 0, z: 0.02 },
      eye: { x: eye.x ?? 1.34, y: eye.y ?? -1.44, z: Math.max(MIN_CAMERA_Z, nextZ) },
      up: { x: 0, y: 0, z: 1 },
      ...(current?.projection ? { projection: current.projection } : {}),
    } }).finally(() => { clamping = false; });
  });
}

export function MissionInsightsReportFlightPath3D({ report }: { report: JsonRecord }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const element = container as PlotElement;
    let active = true;
    let plotly: PlotlyApi | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let themeObserver: MutationObserver | null = null;
    const render = async () => {
      if (!active || !plotly) return;
      try {
        await buildPlot(report, element, plotly);
        if (!active) return;
        setState("ready");
        setError("");
      } catch (cause) {
        setState("error");
        setError(cause instanceof Error ? cause.message : "The report chart could not be rendered.");
      }
    };
    void loadPlotly().then((loaded) => {
      if (!active) return;
      plotly = loaded;
      render();
      resizeObserver = new ResizeObserver(() => {
        if (plotly && active) plotly.Plots.resize(element);
      });
      resizeObserver.observe(container);
      themeObserver = new MutationObserver(render);
      themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style"] });
    }).catch((cause: unknown) => {
      if (!active) return;
      setState("error");
      setError(cause instanceof Error ? cause.message : "The 3D chart is unavailable.");
    });
    return () => {
      active = false;
      resizeObserver?.disconnect();
      themeObserver?.disconnect();
      if (plotly) plotly.purge(element);
    };
  }, [report]);

  return (
    <div className="relative min-w-0 overflow-hidden rounded-(--radius) border border-border bg-(--card)">
      <div ref={containerRef} className="h-[520px] w-full" aria-label="Interactive 3D flight path chart" />
      {state !== "ready" ? (
        <div className="absolute inset-0 flex items-center justify-center bg-(--card) p-6 text-center text-sm text-muted-foreground" role="status">
          {state === "loading" ? "Loading interactive 3D flight path…" : `3D flight path unavailable · ${error}`}
        </div>
      ) : null}
    </div>
  );
}
