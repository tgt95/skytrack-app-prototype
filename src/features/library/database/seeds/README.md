# Local database seeds

These JSON files provide initial records for the browser-local Library stores. They are bundled at build time and used when a store has no usable saved state. Once the browser has persisted changes to `localStorage`, editing a seed does not overwrite that saved state; clear the relevant local storage key to load the seeds again.

- `projects.json` contains the initial projects and their mission card records.
- `missions/` contains full mission snapshots referenced by seeded missions.
- `templates.json` contains the initial mission templates.
- `drones.json` is a static drone catalog fixture. The current workspace drone-profile store separately builds its seed profiles from workspace fixtures.
