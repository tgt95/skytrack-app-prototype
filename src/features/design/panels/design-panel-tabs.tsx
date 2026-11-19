import { Tabs, TabsList, TabsTab } from "skytrack-ui/tabs";
import { AIModelManagerControl } from "./ai-model-manager-toast";

export function DesignPanelTabs({
  codeView,
  previewView,
  canChangeView,
  aiModelsOpen,
  onCodeViewChange,
  onPreviewViewChange,
  onAIModelsOpenChange,
}: {
  codeView: boolean;
  previewView: boolean;
  canChangeView: boolean;
  aiModelsOpen: boolean;
  onCodeViewChange: (code: boolean) => void;
  onPreviewViewChange: (preview: boolean) => void;
  onAIModelsOpenChange: (open: boolean) => void;
}) {
  return (
    <div
      className="ms-pane-tabs flex items-center justify-between gap-2 p-3 min-h-16 border-b border-border"
      data-testid="ms-pane-tabs"
    >
      <Tabs
        value={codeView ? "code" : previewView ? "preview" : "visual"}
        onValueChange={(value: unknown) => {
          const tab = String(value);
          onPreviewViewChange(tab === "preview");
          onCodeViewChange(tab === "code");
        }}
        aria-label="Mission panel view"
        className=" text-xs"
      >
        <TabsList variant="filled">
          <TabsTab value="visual">Design</TabsTab>
          <TabsTab value="code" disabled={!canChangeView}>
            Code
          </TabsTab>
          <TabsTab value="preview" disabled={!canChangeView}>
            Preview
          </TabsTab>
        </TabsList>
      </Tabs>
      {!previewView ? (
        <AIModelManagerControl
          open={aiModelsOpen}
          onOpenChange={onAIModelsOpenChange}
        />
      ) : null}
    </div>
  );
}
