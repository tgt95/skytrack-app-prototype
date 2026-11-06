# Content files

Content here is bundled with Mission Studio at build time. Edit these files to update page content; no database migration or server CMS is involved.

## Download

- `download/platforms.json` owns platform cards, versions, download labels, system requirements, store links, setup copy, and target filenames.
- `download/setup/*.md` owns long-form setup guides. The Download page renders these Markdown files and adds copy controls to fenced code blocks.

## Changelogs

- `changelogs/YYYY-MM-DD-slug.md` owns reader-facing release notes.
- See [`changelogs/README.md`](./changelogs/README.md) for required frontmatter and writing guidance.

## Content boundaries

- Keep Library records used to initialize local storage under `src/features/library/database/seeds/`.
- Keep domain, scene, and report fixtures near the feature or calculation that consumes them.
- Keep SVG illustrations and platform marks under `src/assets/`; the JSON refers to them by key, not by duplicating their vector markup.
