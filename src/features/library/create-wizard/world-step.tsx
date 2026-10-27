import { useRef } from "react";
import { UploadIcon } from "@phosphor-icons/react";
import { Button } from "skytrack-ui/button";
import { RadioGroup, RadioRoot } from "skytrack-ui/radio";
import { Tabs, TabsList, TabsPanel, TabsTab } from "skytrack-ui/tabs";
import type { WorkspaceWorldRecord } from "../database/workspace-resources-store";
import MissionThumbnail from "../mission-thumbnail";

type WorldType = "2D" | "3D";

type WorldStepProps = {
  worldType: WorldType;
  onWorldTypeChange: (worldType: WorldType) => void;
  worlds: WorkspaceWorldRecord[];
  worldId: string;
  onWorldSelect: (worldId: string) => void;
  terrainFile: string | null;
  onTerrainFileSelect: (fileName: string) => void;
};

export function WorldStep({
  worldType,
  onWorldTypeChange,
  worlds,
  worldId,
  onWorldSelect,
  terrainFile,
  onTerrainFileSelect,
}: WorldStepProps) {
  const terrainInputRef = useRef<HTMLInputElement>(null);

  return (
    <TabsPanel value="2" className="ms-wizard-panel">
      <div className="ms-lib-form">
        <div className="ms-field">
          <span className="ms-field-label" id="ms-wizard-worldtype-label">
            World type
          </span>
          <Tabs
            value={worldType}
            onValueChange={(value) => {
              if (value === "2D" || value === "3D") {
                onWorldTypeChange(value);
              }
            }}
            className=" w-full max-w-none"
            data-testid="ms-wizard-mode-tabs"
          >
            <TabsList
              variant="filled"
              className=" w-[10.625rem] self-start"
              aria-labelledby="ms-wizard-worldtype-label"
              data-testid="ms-wizard-toggle"
            >
              <TabsTab value="2D" variant="filled">
                2D
              </TabsTab>
              <TabsTab value="3D" variant="filled">
                3D
              </TabsTab>
            </TabsList>
            <TabsPanel value="2D" className="ms-wizard-mode-panel" />
            <TabsPanel value="3D" className="ms-wizard-mode-panel">
              <div className="ms-field">
                <span className="ms-field-label" id="ms-wizard-world-label">
                  World list
                </span>
                <RadioGroup
                  value={worldId}
                  onValueChange={(value: unknown) =>
                    onWorldSelect(String(value))
                  }
                  aria-labelledby="ms-wizard-world-label"
                  className="ms-wizard-radio-list"
                >
                  {worlds.map((world) => (
                    <label key={world.id} className="ms-wizard-radio-row">
                      <span className="ms-wizard-thumb" aria-hidden="true">
                        <MissionThumbnail />
                      </span>
                      <span className="ms-wizard-row-text">
                        {world.name}
                        <span className="ms-wizard-tags">
                          <span className="ms-wizard-tag">{world.status}</span>
                        </span>
                      </span>
                      <RadioRoot
                        value={world.id}
                        aria-label={`${world.name} · ${world.status}`}
                        className="order-3 ml-auto flex-[0_0_auto]"
                      />
                    </label>
                  ))}
                </RadioGroup>
                {worlds.length === 0 ? (
                  <p className="ms-hint">
                    Add or register a World in this Workspace before creating a
                    3D mission.
                  </p>
                ) : null}
              </div>
            </TabsPanel>
          </Tabs>
        </div>
        {worldType === "2D" ? (
          <div className="ms-field">
            <span className="ms-field-label" id="ms-wizard-terrain-label">
              Terrain layer (Optional)
            </span>
            <div
              className=" flex flex-col items-center gap-[0.5rem] p-[1.25rem_0.75rem] [border:0.0625rem_dashed_var(--border)] rounded-(--radius) bg-(--muted) text-(--muted-foreground) text-[0.75rem]"
              role="group"
              aria-labelledby="ms-wizard-terrain-label"
              data-testid="ms-wizard-dropzone"
            >
              <UploadIcon
                aria-hidden="true"
                className="w-[1.25rem] h-[1.25rem]"
              />
              <span className="ms-hint">{terrainFile ?? "No file chosen"}</span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => terrainInputRef.current?.click()}
                data-testid="ms-wizard-filebtn"
              >
                Choose File
              </Button>
              <input
                ref={terrainInputRef}
                type="file"
                className="ms-sr"
                tabIndex={-1}
                aria-hidden="true"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) onTerrainFileSelect(file.name);
                  event.target.value = "";
                }}
              />
            </div>
          </div>
        ) : null}
      </div>
    </TabsPanel>
  );
}
