export interface ReleaseNote {
  id: string;
  title: string;
  category: string;
  date: string;
  dateTime: string;
  summary: string;
  content: string;
}

interface RawFrontmatter {
  date?: string;
  title?: string;
  category?: string;
  summary?: string;
}

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function formatDisplayDate(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return isoDate;
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);
  if (month < 1 || month > 12) return isoDate;
  const monthName = MONTH_NAMES[month - 1];
  return `${monthName} ${day}, ${year}`;
}

function isValidIsoDate(str: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str);
  if (!match) return false;
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const dateObj = new Date(Date.UTC(year, month - 1, day));
  return (
    dateObj.getUTCFullYear() === year &&
    dateObj.getUTCMonth() === month - 1 &&
    dateObj.getUTCDate() === day
  );
}

function parseFrontmatterAndContent(raw: string): {
  frontmatter: RawFrontmatter;
  content: string;
} {
  const trimmed = raw.trimStart();
  if (!trimmed.startsWith("---")) {
    throw new Error("Missing frontmatter opening delimiter");
  }

  const match = trimmed.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    throw new Error("Missing frontmatter closing delimiter");
  }

  const yamlBlock = match[1];
  const content = match[2].trim();

  const frontmatter: Record<string, string> = {};
  const lines = yamlBlock.split(/\r?\n/);

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith("#")) {
      continue;
    }
    const colonIdx = trimmedLine.indexOf(":");
    if (colonIdx === -1) {
      continue;
    }
    const key = trimmedLine.slice(0, colonIdx).trim();
    let val = trimmedLine.slice(colonIdx + 1).trim();

    if (
      (val.startsWith('"') && val.endsWith('"') && val.length >= 2) ||
      (val.startsWith("'") && val.endsWith("'") && val.length >= 2)
    ) {
      val = val.slice(1, -1);
    }
    frontmatter[key] = val;
  }

  return { frontmatter, content };
}

function loadReleaseNotes(): ReleaseNote[] {
  const markdownFiles = import.meta.glob<string>(
    "../../../../docs/changelogs/*.md",
    {
      query: "?raw",
      import: "default",
      eager: true,
    },
  );

  const notes: ReleaseNote[] = [];

  for (const [filePath, rawContent] of Object.entries(markdownFiles)) {
    const fileName = filePath.split("/").pop() ?? "";

    const fileMatch = /^(\d{4}-\d{2}-\d{2})-(.+)\.md$/.exec(fileName);
    if (!fileMatch) {
      // Filter non-release docs such as README.md
      continue;
    }

    const [, fileDate, slug] = fileMatch;
    const { frontmatter, content } = parseFrontmatterAndContent(rawContent);

    const dateVal = frontmatter.date?.trim();
    if (!dateVal) {
      throw new Error(`Missing required date in release note: ${fileName}`);
    }
    if (!isValidIsoDate(dateVal)) {
      throw new Error(
        `Invalid ISO date in release note: ${fileName} (${dateVal})`,
      );
    }
    if (dateVal !== fileDate) {
      throw new Error(
        `Frontmatter date must match filename date in release note: ${fileName} (${dateVal})`,
      );
    }

    const title = frontmatter.title?.trim();
    if (!title) {
      throw new Error(`Missing required title in release note: ${fileName}`);
    }

    const category = frontmatter.category?.trim();
    if (!category) {
      throw new Error(`Missing required category in release note: ${fileName}`);
    }

    const summary = frontmatter.summary?.trim();
    if (!summary) {
      throw new Error(`Missing required summary in release note: ${fileName}`);
    }

    notes.push({
      id: slug,
      title,
      category,
      date: formatDisplayDate(dateVal),
      dateTime: dateVal,
      summary,
      content,
    });
  }

  notes.sort((a, b) => b.dateTime.localeCompare(a.dateTime));

  return notes;
}

export const RELEASE_NOTES: ReleaseNote[] = loadReleaseNotes();
