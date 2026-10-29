import {
  CaretDownIcon,
  CaretUpIcon,
  DotsThreeIcon,
  GitMergeIcon,
  HandIcon,
  PathIcon,
  RulerIcon,
} from "@phosphor-icons/react";
import { Button } from "skytrack-ui/button";
import {
  Menu,
  MenuItem,
  MenuPopup,
  MenuPortal,
  MenuPositioner,
  MenuSeparator,
  MenuSubmenuRoot,
  MenuSubmenuTrigger,
  MenuTrigger,
} from "skytrack-ui/menu";
import { SkyTooltip } from "../../../ui/components/sky-tooltip";
import { ACTION_OPTIONS } from "./sequence-action-controls";
import type {
  CameraActionKind,
  MissionRouteMeta,
  StudioMission,
} from "../../../domain/mission-model";
import {
  formatDistance,
  useMeasurementSystem,
} from "../../../shared/measurement-units";

type Waypoint = StudioMission["waypoints"][number];

export interface RouteSequenceCardHeaderProps {
  route: MissionRouteMeta;
  routeIndex: number;
  routeLength: number;
  waypointCount?: number;
  routeWaypoints?: Waypoint[];
  actionCount?: number;
  routeActions?: number;
  latestWaypoint?: Waypoint;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onDeleteRoute: (routeId: string) => void;
  onInsertActionAt: (
    wpId: string,
    actionIndex: number,
    kind: CameraActionKind,
  ) => void;
}

export function RouteSequenceCardHeader({
  route,
  routeIndex,
  routeLength,
  waypointCount,
  routeWaypoints,
  actionCount,
  routeActions,
  latestWaypoint,
  collapsed,
  onToggleCollapsed,
  onDeleteRoute,
  onInsertActionAt,
}: RouteSequenceCardHeaderProps) {
  const unitSystem = useMeasurementSystem();
  const totalWaypoints = waypointCount ?? routeWaypoints?.length ?? 0;
  const totalActions = actionCount ?? routeActions ?? 0;
  const targetWaypoint = latestWaypoint ?? routeWaypoints?.at(-1);

  return (
    <div className="flex flex-row items-center gap-2 min-w-0 p-3 max-sm:flex-wrap">
      <div className="flex items-center gap-1.5 flex-[0_0_auto] min-w-0 whitespace-nowrap">
        <PathIcon
          aria-hidden="true"
          className="w-4 h-4 text-(--foreground) shrink-0"
        />
        <span className="text-sm font-semibold flex-[0_0_auto] min-w-0 whitespace-nowrap">
          {route.label}
        </span>
      </div>
      <span className="block flex-[1_1_0] ml-auto min-w-0 overflow-hidden text-right text-ellipsis whitespace-nowrap text-xs text-(--muted-foreground) max-sm:ml-0 max-sm:text-left">
        <SkyTooltip>
          <span
            className="inline-flex items-center gap-1 text-xs text-(--muted-foreground) [font-variant-numeric:tabular-nums] whitespace-nowrap"
            title="Waypoint-to-waypoint route length; excludes Home launch and return, transfers, and Area scan legs."
            aria-label={`Waypoint-to-waypoint route length ${formatDistance(routeLength, unitSystem)}; excludes Home launch and return, transfers, and Area scan legs`}
          >
            <RulerIcon aria-hidden="true" className="w-3.5 h-3.5" />
            {formatDistance(routeLength, unitSystem)}
          </span>
        </SkyTooltip>
        <span aria-hidden="true">·</span>
        <SkyTooltip>
          <span
            className="inline-flex items-center gap-1 text-xs text-(--muted-foreground) [font-variant-numeric:tabular-nums] whitespace-nowrap"
            aria-label={`${totalWaypoints} waypoints in ${route.label}`}
          >
            <GitMergeIcon aria-hidden="true" className="w-3.5 h-3.5" />
            {totalWaypoints}
          </span>
        </SkyTooltip>
        <span aria-hidden="true">·</span>
        <SkyTooltip>
          <span
            className="inline-flex items-center gap-1 text-xs text-(--muted-foreground) [font-variant-numeric:tabular-nums] whitespace-nowrap"
            aria-label={`${totalActions} drone actions in ${route.label}`}
          >
            <HandIcon aria-hidden="true" className="w-3.5 h-3.5" />
            {totalActions}
          </span>
        </SkyTooltip>
      </span>
      <div className="flex items-center gap-0 ml-auto shrink-0">
        <Menu>
          <SkyTooltip>
            <MenuTrigger
              aria-label={`More options for ${route.label}`}
              className="border-0 bg-transparent p-0"
              render={<Button variant="ghost" size="icon-sm" />}
            >
              <DotsThreeIcon aria-hidden="true" />
            </MenuTrigger>
          </SkyTooltip>
          <MenuPortal>
            <MenuPositioner side="bottom" align="end" sideOffset={4}>
              <MenuPopup>
                {targetWaypoint ? (
                  <MenuSubmenuRoot>
                    <MenuSubmenuTrigger
                      aria-label={`Add action to latest waypoint in ${route.label}`}
                    >
                      Add action
                    </MenuSubmenuTrigger>
                    <MenuPortal>
                      <MenuPositioner side="right" align="start" sideOffset={4}>
                        <MenuPopup className="min-w-52.5">
                          {ACTION_OPTIONS.map((option) => (
                            <MenuItem
                              key={option.value}
                              onClick={() =>
                                onInsertActionAt(
                                  targetWaypoint.id,
                                  targetWaypoint.actions.length,
                                  option.value,
                                )
                              }
                            >
                              {option.label}
                            </MenuItem>
                          ))}
                        </MenuPopup>
                      </MenuPositioner>
                    </MenuPortal>
                  </MenuSubmenuRoot>
                ) : (
                  <MenuItem disabled>Add action</MenuItem>
                )}
                <MenuSeparator />
                <MenuItem onClick={() => onDeleteRoute(route.id)}>
                  Delete route
                </MenuItem>
              </MenuPopup>
            </MenuPositioner>
          </MenuPortal>
        </Menu>
        <SkyTooltip>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-expanded={!collapsed}
            aria-label={
              collapsed ? `Expand ${route.label}` : `Collapse ${route.label}`
            }
            data-testid={`ms-collapse-route-${routeIndex}`}
            onClick={onToggleCollapsed}
          >
            {collapsed ? (
              <CaretDownIcon aria-hidden="true" />
            ) : (
              <CaretUpIcon aria-hidden="true" />
            )}
          </Button>
        </SkyTooltip>
      </div>
    </div>
  );
}

export default RouteSequenceCardHeader;
