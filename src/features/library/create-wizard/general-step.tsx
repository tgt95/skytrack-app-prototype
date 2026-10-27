import { FieldControl, FieldLabel, FieldRoot } from "skytrack-ui/field";
import {
  Select,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
  SelectList,
  SelectPopup,
  SelectPortal,
  SelectPositioner,
  SelectTrigger,
  SelectValue,
} from "skytrack-ui/select";
import { TabsPanel } from "skytrack-ui/tabs";

type GeneralStepProps = {
  title: string;
  onTitleChange: (title: string) => void;
  onNext: () => void;
  projects: { id: string; name: string }[];
  projectId: string;
  onProjectChange: (projectId: string) => void;
};

export function GeneralStep({
  title,
  onTitleChange,
  onNext,
  projects,
  projectId,
  onProjectChange,
}: GeneralStepProps) {
  return (
    <TabsPanel value="1">
      <div className="ms-lib-form">
        <FieldRoot name="wizard-mission-name">
          <FieldLabel>Mission name</FieldLabel>
          <FieldControl
            value={title}
            onValueChange={(value) =>
              onTitleChange(typeof value === "string" ? value : "")
            }
            placeholder="Enter text"
            maxLength={120}
            aria-label="Mission name"
            autoFocus
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onNext();
              }
            }}
          />
        </FieldRoot>
        <FieldRoot name="wizard-project">
          <FieldLabel id="ms-wizard-project-label">
            Project
          </FieldLabel>
          <Select
            value={projectId}
            onValueChange={(value) => onProjectChange(String(value))}
          >
            <SelectTrigger
              aria-labelledby="ms-wizard-project-label"
            >
              <SelectValue placeholder="Select a project">
                {projects.find((project) => project.id === projectId)?.name ??
                  ""}
              </SelectValue>
            </SelectTrigger>
            <SelectPortal>
              <SelectPositioner>
                <SelectPopup>
                  <SelectList>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        <SelectItemIndicator />
                        <SelectItemText>{project.name}</SelectItemText>
                      </SelectItem>
                    ))}
                  </SelectList>
                </SelectPopup>
              </SelectPositioner>
            </SelectPortal>
          </Select>
        </FieldRoot>
      </div>
    </TabsPanel>
  );
}
