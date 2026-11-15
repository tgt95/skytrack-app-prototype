import { useEffect, useMemo, useState } from "react";
import {
  CaretRightIcon,
  FileIcon,
  FolderIcon,
  FolderOpenIcon,
} from "@phosphor-icons/react";
import { Button } from "skytrack-ui/button";
import {
  CodeBlock,
  CodeBlockContent,
  CodeBlockCopyButton,
} from "skytrack-ui/code-block";
import { CodeBlockTree } from "skytrack-ui/code-block-tree";
import type { ReactNode } from "react";
import type { JsonRecord } from "./mission-insights-report-data";
import {
  asRecord,
  numberValue,
  textValue,
} from "./mission-insights-report-data";
import {
  copyableArtifactPath,
  displayLocalPath,
  sanitizedReportPath,
} from "./mission-insights-report-media-path";
import { MediaPathActions } from "./mission-insights-report-media-path-actions";
import {
  MetadataSection,
  type MetadataRow,
} from "./mission-insights-report-media-metadata";
import { statusLabel } from "./mission-insights-report-shared";

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

function allFolderPaths(entries: FileEntry[]): Set<string> {
  const paths = new Set<string>();
  for (const entry of entries) {
    let path = "";
    for (const directory of entry.directories) {
      path = path ? `${path}/${directory}` : directory;
      paths.add(path);
    }
  }
  return paths;
}

function createNode(): FileTreeNode {
  return { folders: new Map(), files: [] };
}

function buildFileTree(entries: FileEntry[]): FileTreeNode {
  const root = createNode();
  for (const entry of entries) {
    let node = root;
    for (const directory of entry.directories) {
      if (!node.folders.has(directory))
        node.folders.set(directory, createNode());
      node = node.folders.get(directory)!;
    }
    node.files.push(entry);
  }
  return root;
}

function fileAvailability(artifact: JsonRecord) {
  return statusLabel(asRecord(artifact.availability).state);
}

function LocalFileTree({
  node,
  selectedFileId,
  expandedFolders,
  onToggleFolder,
  onInspect,
  depth = 0,
  parentPath = "",
}: {
  node: FileTreeNode;
  selectedFileId: string;
  expandedFolders: Set<string>;
  onToggleFolder: (path: string) => void;
  onInspect: (id: string) => void;
  depth?: number;
  parentPath?: string;
}) {
  const folders = [...node.folders.entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  );
  const files = [...node.files].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <ul className="m-0 grid list-none gap-0.5 p-0">
      {folders.map(([name, child]) => {
        const path = parentPath ? `${parentPath}/${name}` : name;
        const expanded = expandedFolders.has(path);
        const folderId = `local-folder-${encodeURIComponent(path)}`;
        return (
          <li key={path} className="min-w-0">
            <div
              className="flex min-w-0 items-center gap-1"
              style={{ paddingInlineStart: `${depth * 16}px` }}
            >
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                className="size-7 shrink-0 p-0"
                aria-label={`${expanded ? "Collapse" : "Expand"} ${name}`}
                aria-expanded={expanded}
                aria-controls={folderId}
                onClick={() => onToggleFolder(path)}
              >
                <CaretRightIcon
                  className={`size-3.5 transition-transform ${expanded ? "rotate-90" : ""}`}
                  aria-hidden="true"
                />
              </Button>
              {expanded ? (
                <FolderOpenIcon
                  className="size-4 shrink-0 text-(--info)"
                  aria-hidden="true"
                />
              ) : (
                <FolderIcon
                  className="size-4 shrink-0 text-(--info)"
                  aria-hidden="true"
                />
              )}
              <button
                type="button"
                className="flex h-8 min-w-0 flex-1 cursor-pointer appearance-none items-center justify-start rounded-(--radius) border-0 bg-transparent px-2 text-left text-foreground [font:inherit] hover:bg-muted/60 focus-visible:outline-2 focus-visible:outline-(--ring) focus-visible:outline-offset-2"
                aria-expanded={expanded}
                aria-controls={folderId}
                onClick={() => onToggleFolder(path)}
              >
                <span className="truncate">{name}</span>
              </button>
            </div>
            {expanded ? (
              <div id={folderId}>
                <LocalFileTree
                  node={child}
                  selectedFileId={selectedFileId}
                  expandedFolders={expandedFolders}
                  onToggleFolder={onToggleFolder}
                  onInspect={onInspect}
                  depth={depth + 1}
                  parentPath={path}
                />
              </div>
            ) : null}
          </li>
        );
      })}
      {files.map((entry) => {
        const id = textValue(entry.artifact.artifact_id);
        const selected = id === selectedFileId;
        return (
          <li key={id} className="min-w-0">
            <button
              type="button"
              className={`flex h-9 w-full min-w-0 cursor-pointer appearance-none items-center justify-start gap-2 rounded-(--radius) border-0 px-2 py-1 text-left [font:inherit] transition-colors focus-visible:outline-2 focus-visible:outline-(--ring) focus-visible:outline-offset-2 ${
                selected
                  ? "bg-secondary text-secondary-foreground"
                  : "bg-transparent text-foreground hover:bg-muted/60"
              }`}
              style={{ paddingInlineStart: `${depth * 16 + 36}px` }}
              aria-pressed={selected}
              onClick={() => onInspect(id)}
            >
              <FileIcon
                className="size-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1 truncate">{entry.name}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
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
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() =>
    allFolderPaths(entries),
  );

  useEffect(() => setExpandedFolders(allFolderPaths(entries)), [entries]);

  const matchingEntries = entries.filter((entry) =>
    entry.name.toLowerCase().includes(query.trim().toLowerCase()),
  );
  return (
    <section
      className="flex min-h-0 min-w-0 flex-col gap-3 xl:h-full"
      aria-label="Other files"
    >
      {searchBar}
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">
        {/* <p className="m-0 mb-2 text-xs sub-heading">{visibleFileCount} files</p> */}
        <div className="min-w-0">
          {query.trim() ? (
            matchingEntries.length ? (
              <ul className="m-0 grid list-none gap-0.5 p-0">
                {matchingEntries.map((entry) => (
                  <li
                    key={textValue(entry.artifact.artifact_id)}
                    className="min-w-0"
                  >
                    <button
                      type="button"
                      className={`flex h-9 w-full min-w-0 cursor-pointer appearance-none items-center justify-start gap-2 rounded-(--radius) border-0 px-2 py-1 text-left [font:inherit] transition-colors focus-visible:outline-2 focus-visible:outline-(--ring) focus-visible:outline-offset-2 ${
                        selectedFileId === entry.artifact.artifact_id
                          ? "bg-secondary text-secondary-foreground"
                          : "bg-transparent text-foreground hover:bg-muted/60"
                      }`}
                      aria-pressed={
                        selectedFileId === entry.artifact.artifact_id
                      }
                      onClick={() =>
                        onInspect(textValue(entry.artifact.artifact_id))
                      }
                    >
                      <FileIcon
                        className="size-4 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1 truncate">
                        {entry.name}
                      </span>
                      <span
                        className="min-w-0 max-w-[40%] truncate text-xs text-muted-foreground"
                        title={entry.relativePath}
                      >
                        {entry.relativePath}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="m-0 px-2 py-3 text-sm text-muted-foreground">
                No file names match this search.
              </p>
            )
          ) : entries.length ? (
            <LocalFileTree
              node={tree}
              selectedFileId={selectedFileId}
              expandedFolders={expandedFolders}
              onToggleFolder={(path) =>
                setExpandedFolders((current) => {
                  const next = new Set(current);
                  if (next.has(path)) next.delete(path);
                  else next.add(path);
                  return next;
                })
              }
              onInspect={onInspect}
            />
          ) : (
            <p className="m-0 px-2 py-3 text-sm text-muted-foreground">
              No files are available in this report.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

export function FileDetailsPanel({
  file,
  fileName,
  source,
  emptyMessage,
}: {
  file: JsonRecord | null;
  fileName: string;
  source: string;
  emptyMessage: string;
}) {
  const mimeType = textValue(file?.media_type, "").toLowerCase();
  const extension = fileName.split(".").at(-1)?.toLowerCase() ?? "";
  const isJson = extension === "json" || mimeType.includes("json");
  const isCode = [
    "c",
    "cc",
    "cpp",
    "css",
    "go",
    "h",
    "hpp",
    "html",
    "java",
    "js",
    "jsx",
    "md",
    "py",
    "rs",
    "sh",
    "sql",
    "ts",
    "tsx",
    "xml",
    "yaml",
    "yml",
  ].includes(extension);
  const previewValue = source || file;
  const copyValue = isJson
    ? typeof previewValue === "string"
      ? previewValue
      : (JSON.stringify(previewValue, null, 2) ?? "")
    : source;
  const localPath = file ? displayLocalPath(file) : "";
  const metadataRows: MetadataRow[] = file
    ? [
        ["SHA-256", <code key="sha">{textValue(file.sha256)}</code>],
        ["Role", textValue(file.role)],
        ["Kind", statusLabel(file.type)],
        ["Media type", textValue(file.media_type)],
        [
          "Local path",
          <span className="flex min-w-0 items-center gap-2" key="local-path">
            <code className="min-w-0 flex-1 truncate" title={localPath}>
              {localPath}
            </code>
            <MediaPathActions
              value={localPath}
              copyValue={copyableArtifactPath(file)}
            />
          </span>,
        ],
        ["Availability", fileAvailability(file)],
        ["Size", `${numberValue(file.size_bytes)?.toLocaleString() ?? "—"} B`],
      ]
    : [];

  return (
    <section
      className="flex min-h-0 min-w-0 flex-col xl:h-full"
      aria-label="File details"
    >
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-6 py-4">
        <h3 className="h6 m-0 min-w-0 truncate text-foreground">
          {file ? fileName : "File details"}
        </h3>
        <div className="flex shrink-0 items-center gap-1">
          {file && (isJson || (isCode && source)) ? (
            <CodeBlockCopyButton
              value={copyValue}
              aria-label="Copy file content"
            />
          ) : null}
        </div>
      </header>
      {file ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="flex min-w-0 flex-col">
            {isJson ? (
              <CodeBlockTree
                key={textValue(file?.artifact_id, fileName)}
                className="w-full min-w-0 rounded-none border-0 border-b border-border bg-transparent [&_[data-slot=code-block-header]]:hidden [&_[data-slot=code-block-line-number]]:border-r-0 [&_[data-slot=code-block-line-number]]:bg-transparent [&_[data-slot=scroll-area-viewport]]:relative [&_[data-slot=scroll-area-viewport]]:after:absolute [&_[data-slot=scroll-area-viewport]]:after:inset-y-0 [&_[data-slot=scroll-area-viewport]]:after:left-[calc(var(--code-block-gutter-width)-1px)] [&_[data-slot=scroll-area-viewport]]:after:w-px [&_[data-slot=scroll-area-viewport]]:after:bg-border [&_[data-slot=scroll-area-viewport]]:after:content-['']"
                value={previewValue}
                title={fileName}
                defaultExpandAll
                showLineNumbersToggle={false}
              />
            ) : isCode && source ? (
              <CodeBlock
                size="sm"
                lineNumbers
                className="w-full rounded-none border-0"
              >
                <CodeBlockContent className="max-h-[28rem]">
                  {source}
                </CodeBlockContent>
              </CodeBlock>
            ) : null}
            <div className="p-6">
              <MetadataSection
                title="Information"
                rows={metadataRows}
                labelWidth="compact"
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 items-center justify-center p-6">
          <div
            className="flex max-w-sm flex-col items-center gap-3 text-center"
            role="status"
          >
            <FileIcon
              className="size-8 text-muted-foreground"
              aria-hidden="true"
            />
            <p className="m-0 text-sm text-muted-foreground">{emptyMessage}</p>
          </div>
        </div>
      )}
    </section>
  );
}
