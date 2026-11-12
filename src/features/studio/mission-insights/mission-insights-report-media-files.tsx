import { useEffect, useMemo, useState } from "react";
import { FileIcon, FolderIcon } from "@phosphor-icons/react";
import { Badge } from "skytrack-ui/badge";
import { Button } from "skytrack-ui/button";
import type { ReactNode } from "react";
import type { JsonRecord } from "./mission-insights-report-data";
import {
  asRecord,
  numberValue,
  textValue,
} from "./mission-insights-report-data";
import { statusLabel, KeyValueList } from "./mission-insights-report-shared";

type FileEntry = {
  artifact: JsonRecord;
  name: string;
  relativePath: string;
  directories: string[];
};

type FileTreeNode = {
  folders: Map<string, FileTreeNode>;
  files: FileEntry[];
};

type ExplorerItem =
  | { kind: "folder"; name: string }
  | { kind: "file"; entry: FileEntry };

export function sanitizedReportPath(artifact: JsonRecord): string {
  const metadata = asRecord(artifact.metadata);
  const file = asRecord(metadata.file);
  const candidates = [artifact.uri, file.local_path]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .map((source) => {
      const normalized = source.replaceAll("\\", "/");
      if (normalized.startsWith("sample://")) {
        return normalized.slice("sample://".length);
      }
      if (normalized.startsWith("/") || /^[A-Za-z]:\//.test(normalized) || normalized.includes("://")) {
        return normalized.split("/").filter(Boolean).at(-1) ?? "file";
      }
      return normalized;
    })
    .map((candidate) =>
      candidate
        .split("/")
        .filter((part) => part && part !== "." && part !== "..")
        .join("/"),
    )
    .filter(Boolean)
    .sort((a, b) => b.split("/").length - a.split("/").length);
  return candidates[0] ?? textValue(file.name, textValue(artifact.type));
}

function fileEntries(files: JsonRecord[]): FileEntry[] {
  return files.map((artifact) => {
    const metadata = asRecord(artifact.metadata);
    const file = asRecord(metadata.file);
    const relativePath = sanitizedReportPath(artifact);
    const pathParts = relativePath.split("/").filter(Boolean);
    const pathName = pathParts.at(-1) ?? textValue(artifact.type);
    return {
      artifact,
      name: textValue(file.name, pathName),
      relativePath,
      directories: pathParts.slice(0, -1),
    };
  });
}

function createNode(): FileTreeNode {
  return { folders: new Map(), files: [] };
}

function buildFileTree(entries: FileEntry[]): FileTreeNode {
  const root = createNode();
  for (const entry of entries) {
    let node = root;
    for (const directory of entry.directories) {
      if (!node.folders.has(directory)) node.folders.set(directory, createNode());
      node = node.folders.get(directory)!;
    }
    node.files.push(entry);
  }
  return root;
}

function nodeAtPath(root: FileTreeNode, path: string[]) {
  return path.reduce((node, folder) => node.folders.get(folder) ?? createNode(), root);
}

function fileAvailability(artifact: JsonRecord) {
  return statusLabel(asRecord(artifact.availability).state);
}

export function MediaFilesSection({
  files,
  onInspect,
  selectedFileId,
  query,
  searchBar,
}: {
  files: JsonRecord[];
  onInspect: (id: string) => void;
  selectedFileId: string;
  query: string;
  searchBar: ReactNode;
}) {
  const entries = useMemo(() => fileEntries(files), [files]);
  const tree = useMemo(() => buildFileTree(entries), [entries]);
  const [folderPath, setFolderPath] = useState<string[]>([]);

  useEffect(() => setFolderPath([]), [files]);

  const matchingEntries = entries.filter((entry) =>
    entry.name.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const columns = query.trim()
    ? [{ title: "Search results", items: matchingEntries.map((entry) => ({ kind: "file", entry }) as ExplorerItem) }]
    : folderPath.reduce<Array<{ title: string; items: ExplorerItem[] }>>(
        (items, _folder, depth) => {
          const path = folderPath.slice(0, depth);
          const node = nodeAtPath(tree, path);
          items.push({
            title: path.at(-1) ?? "Run files",
            items: [
              ...[...node.folders.keys()].sort((a, b) => a.localeCompare(b)).map((name) => ({ kind: "folder", name }) as ExplorerItem),
              ...[...node.files].sort((a, b) => a.name.localeCompare(b.name)).map((entry) => ({ kind: "file", entry }) as ExplorerItem),
            ],
          });
          return items;
        },
        [],
      );
  if (!query.trim()) {
    const node = nodeAtPath(tree, folderPath);
    columns.push({
      title: folderPath.at(-1) ?? "Run files",
      items: [
        ...[...node.folders.keys()].sort((a, b) => a.localeCompare(b)).map((name) => ({ kind: "folder", name }) as ExplorerItem),
        ...[...node.files].sort((a, b) => a.name.localeCompare(b.name)).map((entry) => ({ kind: "file", entry }) as ExplorerItem),
      ],
    });
  }

  return (
    <section className="flex min-w-0 flex-col gap-3" aria-label="Other files">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="m-0 text-sm font-semibold text-foreground">Other files</h3>
        <Badge className="rounded-(--radius)" count={`${files.length} files`} status="secondary" />
      </header>
      {searchBar}
      <div className="flex min-w-0 overflow-x-auto rounded-(--radius) border border-border">
        {columns.map((column, columnIndex) => (
          <section
            key={`${column.title}-${columnIndex}`}
            className="min-h-72 w-[min(18rem,78vw)] min-w-64 shrink-0 border-r border-border p-3 last:border-r-0"
            aria-label={`${column.title} contents`}
          >
            <h4 className="m-0 mb-2 truncate text-xs font-semibold text-muted-foreground">{column.title}</h4>
            {column.items.length ? (
              <ul className="m-0 flex list-none flex-col gap-1 p-0">
                {column.items.map((item) =>
                  item.kind === "folder" ? (
                    <li key={`folder-${item.name}`}>
                      <Button
                        type="button"
                        size="sm"
                        variant={folderPath[columnIndex] === item.name ? "secondary" : "ghost"}
                        className="h-auto w-full justify-start gap-2 whitespace-normal px-2 py-2 text-left"
                        aria-pressed={folderPath[columnIndex] === item.name}
                        onClick={() => setFolderPath([...folderPath.slice(0, columnIndex), item.name])}
                      >
                        <FolderIcon className="size-4 shrink-0 text-(--info)" aria-hidden="true" />
                        <span className="truncate">{item.name}</span>
                      </Button>
                    </li>
                  ) : (
                    <li key={textValue(item.entry.artifact.artifact_id)}>
                      <Button
                        type="button"
                        size="sm"
                        variant={selectedFileId === item.entry.artifact.artifact_id ? "secondary" : "ghost"}
                        className="h-auto w-full justify-start gap-2 whitespace-normal px-2 py-2 text-left"
                        aria-pressed={selectedFileId === item.entry.artifact.artifact_id}
                        onClick={() => onInspect(textValue(item.entry.artifact.artifact_id))}
                      >
                        <FileIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                        <span className="flex min-w-0 flex-1 flex-col gap-1">
                          <span className="truncate">{item.entry.name}</span>
                          <span className="truncate text-xs text-muted-foreground">
                            {query.trim() ? `${item.entry.relativePath} · ` : ""}
                            {statusLabel(item.entry.artifact.type)} · {fileAvailability(item.entry.artifact)}
                          </span>
                        </span>
                      </Button>
                    </li>
                  ),
                )}
              </ul>
            ) : (
              <p className="m-0 py-3 text-sm text-muted-foreground">
                {query.trim() ? "No file names match this search." : "No files or folders here."}
              </p>
            )}
          </section>
        ))}
      </div>
      <p className="m-0 text-xs text-muted-foreground">
        Paths are sanitized report paths. Absolute host paths are hidden.
      </p>
    </section>
  );
}

export function FileDetailsPanel({
  file,
  onClear,
}: {
  file: JsonRecord | null;
  onClear: () => void;
}) {
  return (
    <section className="flex min-w-0 flex-col gap-4" aria-label="File details">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="m-0 text-sm font-semibold text-foreground">File details</h3>
          <p className="m-0 mt-1 break-all text-xs text-muted-foreground">
            {file ? `${textValue(file.artifact_id)} · ${statusLabel(file.type)}` : "Select a file to inspect its metadata."}
          </p>
        </div>
        {file ? <Button variant="ghost" size="sm" onClick={onClear}>Clear</Button> : null}
      </header>
      {file ? (
        <>
          <KeyValueList
            columns="sm:grid-cols-1"
            rows={[
              ["SHA-256", <code key="sha">{textValue(file.sha256)}</code>],
              ["Role", textValue(file.role)],
              ["Kind", statusLabel(file.type)],
              ["Media type", textValue(file.media_type)],
              ["Path", <code key="uri">{sanitizedReportPath(file)}</code>],
              ["Availability", fileAvailability(file)],
              ["Size", `${numberValue(file.size_bytes)?.toLocaleString() ?? "—"} B`],
            ]}
          />
        </>
      ) : null}
    </section>
  );
}
