# Report tab IA outline

## Report list

- **Audience / task:** Mission Studio user locating and comparing run records.
- **Pattern:** SkyTrack UI `PageHeader` titled Mission Reports with the short sample-data introduction in its lower content slot, followed by a searchable run list with sortable columns and row report actions.
- **Existing content:** Run name, type, status, start time, duration, and report actions.
- **Main landmark:** Existing application `<main>` in `src/App.tsx`; the Report tab remains inside it.

## Mission Insights for Simulation, Real, and HITL

- **Audience / task:** Mission operator or reviewer checks run outcome, identifies issues, verifies deliverables, then inspects flight or validation detail.
- **Traceability:** operator → locate run → understand result → resolve or investigate attention items → verify evidence → inspect relevant detail → return to report list.
- **Navigation:** Report list includes Simulation, Real, and HITL rows. Simulation and Real open Mission Insights tabs; successful HITL opens the HITL validation report. URL-backed row identity and breadcrumb/back behavior remain unchanged.
- **Page pattern:** Keep current PageHeader and report subpage behavior. Do not add another route or `main` landmark.
- **Shared Simulation/Real overview order:**
  1. Persistent prototype-data disclosure.
  2. Mission result: outcome, run status, type, and duration.
  3. Needs attention: highest-priority issue and replay action when a timestamp exists.
  4. Outputs: result deliverables and source links.
  5. Evidence: completeness, availability, and signature/verification state.
  6. Run distributions. Flight path, replay, timeline, and other detail remain in dedicated report tabs.
- **HITL report order:** prototype-data disclosure; mission result; needs-attention summary; readiness verdicts; flight metrics and MQTT action trace; evidence and checksum integrity; simulation comparison with explicit note that parity is not computed by the current collector; versions and hardware/software configuration.
- **Mode-specific meaning:** Simulation and Real report task outcomes and mission evidence. HITL reports bench validation, readiness, hardware trace, configuration, and evidence integrity. Share hierarchy; retain mode-specific content.
- **Responsive priority:** Single column on narrow screens; content sections may use two columns on wide screens. Keep metric strips readable and comparison tables horizontally usable.
- **Preview scope:** Existing sample states only: Simulation success/failure, Real success, and HITL PASS. Values remain illustrative, not live telemetry or operational results. No backend, hardware control, or parity calculation.
- **Assumptions:** A missing sample state remains unavailable and must not be inferred from another mode's data.

## Heading inventory

| Heading | Parent | Semantic element/level | Visual hierarchy role | Required class |
|---|---|---|---|---|
| Mission Reports | Report list PageHeader | `h1` | Page title | `.h3` via PageHeader |
| Mission Insights | Detail PageHeader | `h1` | Page title | `.h3` via PageHeader |
| Mission result | Mission Insights / HITL report | `h2` | Level 1 card title | `.h4` |
| Needs attention | Mission Insights / HITL report | `h2` | Level 1 card title | `.h4` |
| Readiness | HITL report / readiness card | `h2` | Level 1 card title | `.h4` |
| Flight | Mission Insights / flight card | `h2` | Level 1 card title | `.h4` |
| MQTT command & action trace | Flight card / trace group | `h3` | Level 3 subgroup heading | `text-base font-medium text-(--foreground)` |
| Comparison with simulation | HITL report / comparison card | `h2` | Level 1 card title | `.h4` |
| Versions | Mission Insights / versions card | `h2` | Level 1 card title | `.h4` |
| Evidence | Mission Insights / evidence card | `h2` | Level 1 card title | `.h4` |

The detail cards use `.h4` for their Level 1 card titles. `text-lg` is reserved for Level 2 group headings; it must not replace the `.h4` role on these card titles. PageHeader supplies the page-level `<h1 class="h3">`.

## Browser preflight

- **Surface:** Orca embedded browser.
- **Control tool:** `orca` CLI via the `orca-cli` skill, as required by workspace `AGENTS.md`.
- **Starting URL:** `http://localhost:5173/mission/m-local-mvrqcly0-101?tab=report`.
- **Required observation:** Open a Simulation, Real, and HITL report from the report list. Verify each report puts its result before attention and supporting detail, keeps type-specific content distinct, and labels illustrative/unavailable data. Use the report-list breadcrumb/back path and confirm the list returns.
