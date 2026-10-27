/* Planner-style basemap preview grid for the Studio map pickers.
   Satellite stays the Studio default; switching only swaps the active map
   imagery and never touches camera, entities, or mission state. */

import { Button } from "skytrack-ui/button";
import { CheckboxRoot as Checkbox } from "skytrack-ui/checkbox";
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
            className="text-sm font-medium mb-2"
            data-testid="ms-basemap-group-label"
          >
            {group.label}
          </p>
          <div className="grid grid-cols-2 gap-2" data-testid="ms-basemap-grid">
            {group.ids.map((id) => {
              const option = BASEMAPS[id];
              return (
                <Button
                  key={id}
                  type="button"
                  variant='outline'
                  // variant={value === id ? "secondary" : "outline"}
                  aria-pressed={value === id}
                  data-testid={`${testidPrefix}-${id}`}
                  className={`flex min-w-0 h-22.5 flex-col items-stretch justify-start gap-1 p-1.25 overflow-hidden text-xs  ${value === id ? "border-(--primary)" : "border-border"}`}
                  onClick={() => onChange(id)}
                >
                  <span
                    className='relative block w-full h-13 overflow-hidden border border-border rounded-[calc(var(--radius)-0.0625rem)] bg-(--muted) [&_img]:block [&_img]:w-full [&_img]:h-full [&_img]:object-cover'
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
                      <Checkbox
                        checked
                        readOnly
                        aria-hidden="true"
                        tabIndex={-1}
                        className="pointer-events-none absolute top-1 right-1"
                        data-testid="ms-basemap-check"
                      />
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
