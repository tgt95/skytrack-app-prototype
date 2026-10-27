import {
  useRef,
  type ComponentProps,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import DesignPanel, { ZoneDraftPanel } from "../design/design-panel";
import RouteDraftPanel from "../design/drawing/route-draft-panel";
import { AIModelPickerPanel } from "../design/panels/ai-model-picker-panel";
import SimulationPanel, {
  SimulationSettingsForm,
} from "../simulation/simulation-panel";

type DraftPanelProps = ComponentProps<typeof RouteDraftPanel>;
type ZonePanelProps = ComponentProps<typeof ZoneDraftPanel>;
type DesignInspectorProps = ComponentProps<typeof DesignPanel>;
type SimulationInspectorProps = ComponentProps<typeof SimulationPanel>;
type SimulationSettingsProps = ComponentProps<typeof SimulationSettingsForm>;

const MIN_INSPECTOR_WIDTH = 320;
const MAX_INSPECTOR_WIDTH = 1440;
const MIN_MAP_WIDTH = 600;
const AI_MODEL_PANEL_WIDTH = 400;
const INSPECTOR_RESIZE_STEP = 24;

function availableInspectorWidth(): number {
  const body = document.querySelector<HTMLElement>('[data-testid="ms-body"]');
  const rail = document.querySelector<HTMLElement>(
    'aside[aria-label="Mission navigation and tools"]',
  );
  return (
    (body?.clientWidth ??
      document.documentElement.clientWidth ??
      window.innerWidth) -
    (rail?.getBoundingClientRect().width ?? 56) -
    MIN_MAP_WIDTH
  );
}

function maxInspectorWidth(extraPanelWidth: number): number {
  const availableWidth = availableInspectorWidth() - extraPanelWidth;
  return Math.max(
    MIN_INSPECTOR_WIDTH,
    Math.min(MAX_INSPECTOR_WIDTH, Math.round(availableWidth)),
  );
}

function clampInspectorWidth(width: number, extraPanelWidth = 0): number {
  const maxWidth = Math.max(
    MIN_INSPECTOR_WIDTH,
    maxInspectorWidth(extraPanelWidth),
  );
  return Math.round(Math.min(maxWidth, Math.max(MIN_INSPECTOR_WIDTH, width)));
}

export interface StudioInspectorProps {
  visible: boolean;
  stageIsDesign: boolean;
  codeView: boolean;
  routeDraftActive: boolean;
  zoneDraftActive: boolean;
  routeDraft: DraftPanelProps;
  zoneDraft: ZonePanelProps;
  design: DesignInspectorProps;
  simulationSettingsOpen: boolean;
  simulationSettings: SimulationSettingsProps;
  simulation: SimulationInspectorProps;
  inspectorWidth: number | null;
  onInspectorWidthChange: (width: number) => void;
}

export default function StudioInspector({
  visible,
  stageIsDesign,
  codeView,
  routeDraftActive,
  zoneDraftActive,
  routeDraft,
  zoneDraft,
  design,
  simulationSettingsOpen,
  simulationSettings,
  simulation,
  inspectorWidth,
  onInspectorWidthChange,
}: StudioInspectorProps) {
  const inspectorRef = useRef<HTMLElement>(null);
  const resizePointer = useRef<{
    pointerId: number;
    startX: number;
    startWidth: number;
  } | null>(null);
  const compactViewport = window.matchMedia("(max-width: 61.25rem)").matches;
  const modelPickerVisible =
    stageIsDesign && codeView && !routeDraftActive && design.aiModelsOpen;
  const extraPanelWidth = modelPickerVisible
    ? Math.min(
        AI_MODEL_PANEL_WIDTH,
        Math.max(0, availableInspectorWidth() - MIN_INSPECTOR_WIDTH),
      )
    : 0;
  const defaultInspectorWidth =
    !compactViewport && stageIsDesign && codeView && !routeDraftActive
      ? window.innerWidth <= 1180
        ? Math.min(window.innerWidth * 0.45, 620)
        : Math.min(720, Math.max(460, window.innerWidth * 0.38))
      : 400;
  const currentInspectorWidth =
    inspectorWidth === null
      ? clampInspectorWidth(defaultInspectorWidth, extraPanelWidth)
      : clampInspectorWidth(inspectorWidth, extraPanelWidth);
  const aiModelPanelWidth = extraPanelWidth;
  const customFlexBasis =
    !compactViewport && (inspectorWidth !== null || modelPickerVisible)
      ? `${currentInspectorWidth}px`
      : undefined;

  const onResizePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const bounds = inspectorRef.current?.getBoundingClientRect();
    if (!bounds) return;
    event.preventDefault();
    resizePointer.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startWidth: bounds.width,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onResizePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const activeDrag = resizePointer.current;
    if (!activeDrag || activeDrag.pointerId !== event.pointerId) return;
    onInspectorWidthChange(
      clampInspectorWidth(
        activeDrag.startWidth + activeDrag.startX - event.clientX,
        extraPanelWidth,
      ),
    );
  };

  const onResizePointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    if (resizePointer.current?.pointerId !== event.pointerId) return;
    resizePointer.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const onResizeKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const currentWidth =
      (inspectorWidth === null
        ? null
        : clampInspectorWidth(inspectorWidth, extraPanelWidth)) ??
      inspectorRef.current?.getBoundingClientRect().width ??
      400;
    const widthChange =
      event.key === "ArrowLeft"
        ? INSPECTOR_RESIZE_STEP
        : event.key === "ArrowRight"
          ? -INSPECTOR_RESIZE_STEP
          : event.key === "Home"
            ? MIN_INSPECTOR_WIDTH - currentWidth
            : event.key === "End"
              ? MAX_INSPECTOR_WIDTH - currentWidth
              : null;
    if (widthChange === null) return;
    event.preventDefault();
    onInspectorWidthChange(
      clampInspectorWidth(currentWidth + widthChange, extraPanelWidth),
    );
  };

  if (!visible) return null;

  return (
    <div className="relative z-20 flex min-h-0 min-w-0 flex-[0_0_auto]">
      {modelPickerVisible ? (
        <AIModelPickerPanel
          panelWidth={aiModelPanelWidth}
          models={design.aiModels}
          selectedModelId={design.selectedAIModelId}
          onSelectModel={design.onSelectAIModel}
          onImport={design.onImportAIModel}
          onClose={() => design.onAIModelsOpenChange(false)}
          onAnnounce={design.onAnnounce}
        />
      ) : null}
      <aside
        ref={inspectorRef}
        style={customFlexBasis ? { flexBasis: customFlexBasis } : undefined}
        className={[
          `ms-inspector-wrap${stageIsDesign && codeView && !routeDraftActive ? " is-code-view" : ""}`,
          "relative grow-0 shrink-0 basis-100 min-h-0 border-l border-l-border bg-(--card) overflow-y-auto [.ms-inspector-wrap&:where(.is-code-view)]:basis-[clamp(28.75rem,38vw,45rem)] [.ms-inspector-wrap&:where(.is-code-view)]:overflow-hidden [@media_(max-width:_73.75rem)]:basis-77.5 [@media_(max-width:_73.75rem)]:[.ms-inspector-wrap&:where(.is-code-view)]:basis-[min(45vw,38.75rem)] [@media_(max-width:_61.25rem)]:flex-[0_0_auto] [@media_(max-width:_61.25rem)]:[border-left:none] [@media_(max-width:_61.25rem)]:border-t [@media_(max-width:_61.25rem)]:border-t-border [@media_(max-width:_61.25rem)]:overflow-visible [@media_(max-width:_61.25rem)]:[.ms-inspector-wrap&:where(.is-code-view)]:basis-auto [@media_(max-width:_61.25rem)]:[.ms-inspector-wrap&:where(.is-code-view)]:h-150",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-label="Inspector"
      >
        {routeDraftActive ? (
          <RouteDraftPanel {...routeDraft} />
        ) : zoneDraftActive ? (
          <ZoneDraftPanel {...zoneDraft} />
        ) : stageIsDesign ? (
          <DesignPanel {...design} />
        ) : simulationSettingsOpen ? (
          <div className="ms-inspector" data-testid="ms-sim-settings">
            <div
              className="flex items-start justify-between gap-2"
              data-testid="ms-inspector-head"
            >
              <div>
                <h2 className="heading ms-inspector-title">
                  Simulation settings
                </h2>
              </div>
            </div>
            <SimulationSettingsForm {...simulationSettings} />
          </div>
        ) : (
          <SimulationPanel {...simulation} />
        )}
      </aside>
      <div
        className="group absolute inset-y-0 left-0 z-[100] flex w-2 -translate-x-1/2 touch-none select-none items-center justify-center cursor-col-resize bg-transparent outline-none focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-(--ring) [@media_(max-width:_61.25rem)]:hidden"
        style={modelPickerVisible ? { left: aiModelPanelWidth } : undefined}
        role="separator"
        aria-label="Resize inspector panel"
        aria-orientation="vertical"
        aria-valuemin={MIN_INSPECTOR_WIDTH}
        aria-valuemax={clampInspectorWidth(
          MAX_INSPECTOR_WIDTH,
          extraPanelWidth,
        )}
        aria-valuenow={Math.round(currentInspectorWidth)}
        aria-valuetext={`${Math.round(currentInspectorWidth)} pixels wide`}
        tabIndex={0}
        title="Drag to resize"
        onPointerDown={onResizePointerDown}
        onPointerMove={onResizePointerMove}
        onPointerUp={onResizePointerEnd}
        onPointerCancel={onResizePointerEnd}
        onKeyDown={onResizeKeyDown}
      >
        <span className="h-full w-0.5 bg-transparent transition-colors group-hover:bg-(--primary) group-focus-visible:bg-(--primary) group-active:bg-(--primary)" />
      </div>
    </div>
  );
}
