import { XIcon } from "@phosphor-icons/react";
import { Alert, AlertDescription } from "skytrack-ui/alert";
import { Button } from "skytrack-ui/button";
import { Badge } from "skytrack-ui/badge";
import { DataTable, type DataTableColumnDef } from "skytrack-ui/data-table";
import { Drawer, DrawerBackdrop, DrawerContent, DrawerDescription, DrawerPopup, DrawerPortal, DrawerTitle, DrawerViewport } from "skytrack-ui/drawer";
import { Separator } from "skytrack-ui/separator";
import type { JsonRecord } from "./mission-insights-report-data";
import { asRecord, numberValue, safeArtifactLocation, textValue } from "./mission-insights-report-data";
import { statusLabel, KeyValueList } from "./mission-insights-report-shared";
import { DetailSection } from "./mission-insights-page-sections";

export function MediaFilesSection({
  files,
  onInspect,
}: {
  files: JsonRecord[];
  onInspect: (id: string) => void;
}) {
  const fileRows = files.map((artifact) => ({
    id: textValue(artifact.artifact_id),
    name: textValue(
      asRecord(artifact.metadata).file &&
        asRecord(asRecord(artifact.metadata).file).name,
      textValue(artifact.type),
    ),
    kind: textValue(artifact.type),
    size: numberValue(artifact.size_bytes) ?? 0,
    status: statusLabel(asRecord(artifact.availability).state),
    artifact,
  }));
  const fileColumns: DataTableColumnDef<(typeof fileRows)[number]>[] = [
    { id: "Name", accessorKey: "name", header: "Name" },
    { id: "Kind", accessorKey: "kind", header: "Kind" },
    {
      id: "Size",
      accessorKey: "size",
      header: "Size",
      meta: { align: "right" },
      cell: ({ row }) => `${row.original.size.toLocaleString()} B`,
    },
    { id: "Status", accessorKey: "status", header: "Status" },
    {
      id: "Details",
      header: "Details",
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => (
        <Button
          variant="outline"
          size="xs"
          onClick={() => onInspect(row.original.id)}
        >
          Inspect
        </Button>
      ),
    },
  ];

  return (
    <DetailSection
      title="Files"
      toolbar={
        <Badge
          className="rounded-(--radius)"
          count={`${files.length} non-media artifacts`}
          status="secondary"
        />
      }
    >
      <p className="m-0 text-(--muted-foreground)">
        The file list contains sample manifest records. Local paths are
        normalized, and live file-system or remote-device actions are
        unavailable.
      </p>
      <DataTable
        columns={fileColumns}
        data={fileRows}
        getRowId={(row) => row.id}
        pageSize={10}
        searchPlaceholder="Search files"
        emptyMessage="No files match this search."
        className="min-w-0"
      />
    </DetailSection>
  );
}

export function FileDetailsDrawer({
  file,
  open,
  onOpenChange,
}: {
  file: JsonRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} swipeDirection="right">
      <DrawerPortal>
        <DrawerBackdrop />
        <DrawerViewport side="right">
          {file ? (
            <DrawerPopup
              side="right"
              className="w-[min(34rem,calc(100vw-1rem))] max-w-full"
              aria-label={`${textValue(file.artifact_id)} file details`}
            >
              <DrawerContent className="flex h-full min-h-0 flex-col gap-4 p-5 sm:p-6">
                <header className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <DrawerTitle className="h4 m-0">Selected file</DrawerTitle>
                    <DrawerDescription className="mt-2">
                      {textValue(file.artifact_id)} · {textValue(file.type)}
                    </DrawerDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    aria-label="Close file details"
                    onClick={() => onOpenChange(false)}
                  >
                    <XIcon aria-hidden="true" />
                  </Button>
                </header>
                <Separator />
                <KeyValueList
                  columns="sm:grid-cols-1"
                  rows={[
                    [
                      "SHA-256",
                      <code key="sha">{textValue(file.sha256)}</code>,
                    ],
                    ["Role", textValue(file.role)],
                    ["Media type", textValue(file.media_type)],
                    [
                      "URI",
                      <code key="uri">{safeArtifactLocation(file)}</code>,
                    ],
                    [
                      "Availability",
                      statusLabel(asRecord(file.availability).state),
                    ],
                    [
                      "Size",
                      `${
                        numberValue(file.size_bytes)?.toLocaleString() ?? "—"
                      } B`,
                    ],
                  ]}
                />
                <Alert variant="info">
                  <AlertDescription>
                    Sample manifest details only. No local disk or remote
                    Mission Computer operation was performed.
                  </AlertDescription>
                </Alert>
              </DrawerContent>
            </DrawerPopup>
          ) : null}
        </DrawerViewport>
      </DrawerPortal>
    </Drawer>
  );
}
