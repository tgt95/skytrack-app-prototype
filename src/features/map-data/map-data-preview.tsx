import type { CSSProperties } from "react";
import type { MissionTerrainLayer } from "@/domain/mission-model";
import type { MapDataFileRecord, MapDataPreflight } from "./map-data";

type BBox = [number, number, number, number];
type Point = [number, number];

function isPoint(value: unknown): value is Point {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    typeof value[0] === "number" &&
    Number.isFinite(value[0]) &&
    typeof value[1] === "number" &&
    Number.isFinite(value[1])
  );
}

function ringsFrom(value: unknown): Point[][] {
  if (!Array.isArray(value) || value.length === 0) return [];
  if (isPoint(value[0])) return [value.filter(isPoint)];
  return value.flatMap(ringsFrom);
}

function pathFor(ring: Point[], bbox: BBox): string {
  const [west, south, east, north] = bbox;
  const dx = Math.max(east - west, 0.000001);
  const dy = Math.max(north - south, 0.000001);
  return (
    ring
      .map(([lon, lat], index) => {
        const x = 8 + ((lon - west) / dx) * 344;
        const y = 8 + ((north - lat) / dy) * 164;
        return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(" ") + " Z"
  );
}

function geoJsonPreview(file: MapDataFileRecord | MapDataPreflight) {
  if (!file.bbox) return null;
  try {
    const data = JSON.parse(file.content) as {
      features?: Array<{ geometry?: { type?: string; coordinates?: unknown } }>;
    };
    const paths = (data.features ?? []).flatMap((feature) =>
      ringsFrom(feature.geometry?.coordinates).map((ring) =>
        pathFor(ring, file.bbox as BBox),
      ),
    );
    return paths.slice(0, 400);
  } catch {
    return null;
  }
}

function terrainGrid(file: MapDataFileRecord | MapDataPreflight) {
  try {
    const data = JSON.parse(file.content) as {
      scene?: { terrain?: { size?: number; elevations?: number[] } };
    };
    const terrain = data.scene?.terrain;
    if (
      !terrain ||
      !Number.isInteger(terrain.size) ||
      !Array.isArray(terrain.elevations)
    )
      return null;
    const elevations = terrain.elevations;
    const size = terrain.size as number;
    if (size < 2 || elevations.length !== size * size) return null;
    const step = Math.max(1, Math.ceil((size - 1) / 20));
    const indices = Array.from(
      { length: size - 1 },
      (_, index) => index,
    ).filter((index) => index % step === 0);
    if (indices.at(-1) !== size - 1) indices.push(size - 1);
    const values = indices.flatMap((row) =>
      indices.map((column) => elevations[row * size + column]),
    );
    const minimum = Math.min(...values);
    const range = Math.max(Math.max(...values) - minimum, 0.001);
    const cell = 180 / Math.max(indices.length - 1, 1);
    return indices.slice(0, -1).flatMap((row, rowIndex) =>
      indices.slice(0, -1).map((column, columnIndex) => {
        const value = elevations[row * size + column];
        const strength = Math.round(((value - minimum) / range) * 100);
        const style = {
          fill: `color-mix(in srgb, var(--primary) ${strength}%, var(--muted))`,
        } satisfies CSSProperties;
        return {
          x: 10 + columnIndex * cell,
          y: 10 + rowIndex * cell,
          size: cell + 0.5,
          style,
        };
      }),
    );
  } catch {
    return null;
  }
}

export function MapDataPreview({
  file,
  className = "",
}: {
  file: MapDataFileRecord | MapDataPreflight;
  className?: string;
}) {
  const paths = file.type === "boundary" ? geoJsonPreview(file) : null;
  const cells = file.type === "scene" ? terrainGrid(file) : null;
  return (
    <div className={`grid gap-2 ${className}`}>
      <svg
        viewBox="0 0 360 180"
        role="img"
        aria-label={
          file.type === "boundary"
            ? `Boundary preview for ${file.name}`
            : `Elevation grid preview for ${file.name}`
        }
        className="h-40 w-full rounded-(--radius) border border-border bg-muted/30"
      >
        {paths?.map((path, index) => (
          <path
            key={`${index}-${path.slice(0, 16)}`}
            d={path}
            fill="var(--primary)"
            fillOpacity="0.24"
            stroke="var(--primary)"
            strokeWidth="0.75"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {cells?.map((cell, index) => (
          <rect
            key={index}
            x={cell.x}
            y={cell.y}
            width={cell.size}
            height={cell.size}
            style={cell.style}
          />
        ))}
        {!paths?.length && !cells?.length ? (
          <text
            x="180"
            y="94"
            textAnchor="middle"
            className="fill-muted-foreground text-[10px]"
          >
            Preview unavailable
          </text>
        ) : null}
      </svg>
      <p className="m-0 text-xs text-muted-foreground">
        {file.bbox
          ? `${file.bbox[1].toFixed(3)}–${file.bbox[3].toFixed(3)}° N · ${file.bbox[0].toFixed(3)}–${file.bbox[2].toFixed(3)}° E`
          : "Geographic extent unavailable"}
      </p>
    </div>
  );
}

export function TerrainLayerPreview({
  terrain,
  className = "",
}: {
  terrain: MissionTerrainLayer;
  className?: string;
}) {
  const size = terrain.gridSize;
  const stride = Math.max(1, Math.ceil((size - 1) / 20));
  const indices = Array.from({ length: size - 1 }, (_, index) => index).filter(
    (index) => index % stride === 0,
  );
  if (indices.at(-1) !== size - 1) indices.push(size - 1);
  const sampled = indices.flatMap((row) =>
    indices.map((column) => terrain.elevationsM[row * size + column]),
  );
  const minimum = sampled.reduce(
    (current, value) => Math.min(current, value),
    Number.POSITIVE_INFINITY,
  );
  const maximum = sampled.reduce(
    (current, value) => Math.max(current, value),
    Number.NEGATIVE_INFINITY,
  );
  const range = Math.max(maximum - minimum, 0.001);
  const cellSize = 180 / Math.max(indices.length - 1, 1);

  return (
    <svg
      viewBox="0 0 200 200"
      role="img"
      aria-label={`Elevation preview for ${terrain.sourceFileName}`}
      className={`h-40 w-full rounded-(--radius) border border-border bg-muted/30 ${className}`}
    >
      {indices.slice(0, -1).flatMap((row, rowIndex) =>
        indices.slice(0, -1).map((column, columnIndex) => {
          const elevation = terrain.elevationsM[row * size + column];
          const strength = Math.round(((elevation - minimum) / range) * 100);
          const style = {
            fill: `color-mix(in srgb, var(--primary) ${strength}%, var(--muted))`,
          } satisfies CSSProperties;
          return (
            <rect
              key={`${row}-${column}`}
              x={10 + columnIndex * cellSize}
              y={10 + rowIndex * cellSize}
              width={cellSize + 0.5}
              height={cellSize + 0.5}
              style={style}
            />
          );
        }),
      )}
    </svg>
  );
}
