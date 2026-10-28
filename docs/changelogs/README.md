# Release Notes and Changelogs

This directory contains reader-facing release notes for SkyTrack Mission Studio. Release notes are loaded statically at compile time and displayed in the Library **What's New** panel (`release-notes-popover.tsx`).

## File format

Each release is a Markdown file named according to the convention:

```
YYYY-MM-DD-slug.md
```

- `YYYY-MM-DD`: ISO 8601 release date (used for chronological sorting and `<time>` machine-readable attributes). It must match the `date` in frontmatter.
- `slug`: URL-friendly identifier derived as the note ID (e.g. `mission-summaries`).

Non-dated files (such as this `README.md`) are automatically filtered out by the release loader.

## Frontmatter schema

Every release file must start with YAML frontmatter containing the following required fields:

```markdown
---
date: 2026-10-24
title: Mission summaries, at a glance
category: Mission planning
summary: Compare survey area, waypoints, actions, and photo coverage from the mission list.
---
```

| Field      | Type                           | Description                                                                   |
| ---------- | ------------------------------ | ----------------------------------------------------------------------------- |
| `date`     | ISO 8601 string (`YYYY-MM-DD`) | Required release date. Must be a valid calendar date and match the filename.  |
| `title`    | string                         | Headline of the release note shown in list and header.                        |
| `category` | string                         | Product feature category (e.g. `Mission planning`, `Worlds`, `AI models`).    |
| `summary`  | string                         | One or two sentence summary shown in the release card and dialog description. |

## Markdown body

The content beneath the frontmatter delimiter (`---`) forms the release body. It is rendered in the release detail dialog with `react-markdown` (raw HTML is disabled):

- Use bullet lists (`- ...`) to highlight key capabilities, UX improvements, or workflow updates.
- Keep tone direct, reader-facing, and benefit-driven.
- Avoid internal task references, implementation-only chatter, or ticket numbers.
- Markdown links, code spans, blockquotes, and lists are supported.

## Writing guidelines

1. **User value first**: Focus on what users can now do, see, or configure in Mission Studio.
2. **Concise bullets**: Keep bullet points to 1–2 sentences each.
3. **Categories**: Use consistent category names matching product modules (`Mission planning`, `Worlds`, `AI models`, `Settings`, etc.).
4. **Before release**: When requested to commit, push, or deploy Mission Studio, add a new dated Markdown file to this directory summarizing the user-facing changes.
