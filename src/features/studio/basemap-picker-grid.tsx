/* Planner-style basemap preview grid for the Studio map pickers.
   Satellite stays the Studio default; switching only swaps the active map
   imagery and never touches camera, entities, or mission state. */

import { CheckIcon } from "@phosphor-icons/react";
import { Button } from "skytrack-ui/button";
import { BASEMAPS, type MissionBasemapStyle } from "../scene/basemaps";

export function BasemapPickerGrid({
  value,
  onChange,
  testidPrefix,
}: {
  value: MissionBasemapStyle;
  onChange: (style: MissionBasemapStyle) => void;
  testidPrefix: string;
}) {
  const groups: { label: string; ids: MissionBasemapStyle[] }[] = [
    { label: "Standard", ids: ["satellite", "basic", "light", "dark"] },
    { label: "More styles", ids: ["daybreak", "overcast"] },
  ];
  return (
    <>
      {groups.map((group) => (
        <div key={group.label}>
          <p
            className=" m-[0.75rem_0_0.375rem] text-(--muted-foreground) text-[0.6875rem] font-semibold tracking-[0.06em] uppercase"
            data-testid="ms-basemap-group-label"
          >
            {group.label}
          </p>
          <div
            className=" grid grid-cols-2 gap-[0.5rem]"
            data-testid="ms-basemap-grid"
          >
            {group.ids.map((id) => {
              const option = BASEMAPS[id];
              return (
                <Button
                  key={id}
                  type="button"
                  variant={value === id ? "secondary" : "outline"}
                  aria-pressed={value === id}
                  data-testid={`${testidPrefix}-${id}`}
                  className=" flex min-w-0 h-[5.625rem] flex-col items-stretch justify-start gap-[0.25rem] p-[0.3125rem] overflow-hidden text-[0.75rem]"
                  onClick={() => onChange(id)}
                >
                  <span
                    className=" relative block w-full h-[3.25rem] overflow-hidden [border:0.0625rem_solid_var(--border)] rounded-[calc(var(--radius)-0.0625rem)] bg-(--muted) [&_img]:block [&_img]:w-full [&_img]:h-full [&_img]:object-cover"
                    data-testid="ms-basemap-thumb"
                  >
                    <img
                      src={option.thumbnailUrl}
                      alt=""
                      loading="lazy"
                      onError={(event) => {
                        event.currentTarget.style.visibility = "hidden";
                      }}
                    />
                    {value === id ? (
                      <span
                        className=" absolute top-[0.25rem] right-[0.25rem] flex w-[1.25rem] h-[1.25rem] items-center justify-center rounded-[62.4375rem] bg-(--primary) text-(--primary-foreground)"
                        data-testid="ms-basemap-check"
                      >
                        <CheckIcon aria-hidden="true" weight="bold" />
                      </span>
                    ) : null}
                  </span>
                  <span>{option.label}</span>
                </Button>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}
