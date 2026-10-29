import {
  MISSION_DESIGN_PREFERENCES_CHANGE_EVENT,
  readMissionDesignPreferences,
} from "./mission-design-preferences";
import { useEffect, useState } from "react";

export type UnitSystem = "metric" | "imperial";

const METERS_PER_FOOT = 0.3048;
const METERS_PER_MILE = 1609.344;
const SQUARE_METERS_PER_ACRE = 4046.8564224;
const METERS_PER_SECOND_PER_MPH = 0.44704;
const KILOGRAMS_PER_POUND = 0.45359237;
const GRAMS_PER_OUNCE = 28.349523125;
const MILLIMETERS_PER_INCH = 25.4;

export function distanceToDisplay(valueM: number, system: UnitSystem): number {
  return round(system === "imperial" ? valueM / METERS_PER_FOOT : valueM, 3);
}

export function distanceFromDisplay(value: number, system: UnitSystem): number {
  return system === "imperial" ? value * METERS_PER_FOOT : value;
}

export function speedToDisplay(valueMS: number, system: UnitSystem): number {
  return round(
    system === "imperial" ? valueMS / METERS_PER_SECOND_PER_MPH : valueMS,
    3,
  );
}

export function speedFromDisplay(value: number, system: UnitSystem): number {
  return system === "imperial" ? value * METERS_PER_SECOND_PER_MPH : value;
}

export function massToDisplay(valueKg: number, system: UnitSystem): number {
  return round(
    system === "imperial" ? valueKg / KILOGRAMS_PER_POUND : valueKg,
    3,
  );
}

export function massFromDisplay(value: number, system: UnitSystem): number {
  return system === "imperial" ? value * KILOGRAMS_PER_POUND : value;
}

export function massUnit(system: UnitSystem): "kg" | "lb" {
  return system === "imperial" ? "lb" : "kg";
}

export function gramsToDisplay(valueG: number, system: UnitSystem): number {
  return round(system === "imperial" ? valueG / GRAMS_PER_OUNCE : valueG, 2);
}

export function gramsFromDisplay(value: number, system: UnitSystem): number {
  return system === "imperial" ? value * GRAMS_PER_OUNCE : value;
}

export function weightUnit(system: UnitSystem): "g" | "oz" {
  return system === "imperial" ? "oz" : "g";
}

export function millimetersToDisplay(
  valueMm: number,
  system: UnitSystem,
): number {
  return round(
    system === "imperial" ? valueMm / MILLIMETERS_PER_INCH : valueMm,
    2,
  );
}

export function millimetersFromDisplay(
  value: number,
  system: UnitSystem,
): number {
  return system === "imperial" ? value * MILLIMETERS_PER_INCH : value;
}

export function propellerInchesToDisplay(
  valueIn: number,
  system: UnitSystem,
): number {
  return round(
    system === "metric" ? valueIn * MILLIMETERS_PER_INCH : valueIn,
    2,
  );
}

export function propellerInchesFromDisplay(
  value: number,
  system: UnitSystem,
): number {
  return system === "metric" ? value / MILLIMETERS_PER_INCH : value;
}

export function smallLengthUnit(system: UnitSystem): "mm" | "in" {
  return system === "imperial" ? "in" : "mm";
}

export function formatMeasurementText(
  text: string,
  system: UnitSystem,
): string {
  if (system === "metric") return text;
  return text
    .replace(/(-?[\d,.]+)\s*m²/g, (_match, value: string) =>
      formatArea(parseMeasurementNumber(value), system),
    )
    .replace(
      /(-?[\d,.]+)\s*ha\b/g,
      (_match, value: string) =>
        `${formatNumber(parseMeasurementNumber(value) * 2.47105, 1)} ac`,
    )
    .replace(
      /(-?[\d,.]+)\s*km\b/g,
      (_match, value: string) =>
        `${formatNumber(parseMeasurementNumber(value) / 1.609344, 1)} mi`,
    )
    .replace(
      /(-?[\d,.]+)\s*mm\b/g,
      (_match, value: string) =>
        `${formatNumber(parseMeasurementNumber(value) / MILLIMETERS_PER_INCH, 2)} in`,
    )
    .replace(/(-?[\d,.]+)\s*cm\/px/g, (_match, value: string) =>
      formatResolution(parseMeasurementNumber(value), system),
    )
    .replace(
      /(-?[\d,.]+)\s*m\/s\b/g,
      (_match, value: string) =>
        `${round(parseMeasurementNumber(value) / METERS_PER_SECOND_PER_MPH, 2)} mph`,
    )
    .replace(/(-?[\d,.]+)\s*m\b(?![/²])/g, (_match, value: string) =>
      formatDistance(parseMeasurementNumber(value), system),
    );
}

export function distanceUnit(system: UnitSystem): "m" | "ft" {
  return system === "imperial" ? "ft" : "m";
}

export function speedUnit(system: UnitSystem): "m/s" | "mph" {
  return system === "imperial" ? "mph" : "m/s";
}

export function formatDistance(
  valueM: number,
  system: UnitSystem,
  precision = 1,
): string {
  if (system === "imperial") {
    if (Math.abs(valueM) >= METERS_PER_MILE) {
      return `${formatNumber(valueM / METERS_PER_MILE, precision)} mi`;
    }
    return `${formatNumber(valueM / METERS_PER_FOOT, precision)} ft`;
  }
  if (Math.abs(valueM) >= 1000)
    return `${formatNumber(valueM / 1000, precision)} km`;
  return `${formatNumber(valueM, precision)} m`;
}

export function formatArea(valueM2: number, system: UnitSystem): string {
  if (system === "imperial") {
    if (valueM2 >= SQUARE_METERS_PER_ACRE) {
      return `${round(valueM2 / SQUARE_METERS_PER_ACRE, 1)} ac`;
    }
    return `${round(valueM2 / (METERS_PER_FOOT * METERS_PER_FOOT))} ft²`;
  }
  if (valueM2 >= 10_000) return `${round(valueM2 / 10_000, 1)} ha`;
  return `${round(valueM2)} m²`;
}

export function formatResolution(
  valueCmPerPx: number,
  system: UnitSystem,
): string {
  return system === "imperial"
    ? `${round(valueCmPerPx / 2.54, 2)} in/px`
    : `${round(valueCmPerPx, 1)} cm/px`;
}

export function useMeasurementSystem(): UnitSystem {
  const [system, setSystem] = useState<UnitSystem>(
    () => readMissionDesignPreferences().unitSystem,
  );

  useEffect(() => {
    const sync = () => setSystem(readMissionDesignPreferences().unitSystem);
    window.addEventListener(MISSION_DESIGN_PREFERENCES_CHANGE_EVENT, sync);
    return () =>
      window.removeEventListener(MISSION_DESIGN_PREFERENCES_CHANGE_EVENT, sync);
  }, []);

  return system;
}

function round(value: number, places = 0): number {
  const scale = 10 ** places;
  return (
    (Math.round((Math.abs(value) + Number.EPSILON) * scale) / scale) *
    Math.sign(value)
  );
}

function formatNumber(value: number, places: number): string {
  return round(value, places).toLocaleString("en-US", {
    maximumFractionDigits: places,
  });
}

function parseMeasurementNumber(value: string): number {
  return Number(value.replaceAll(",", ""));
}
