# Completion checks — T-367

| Layer | Requirement | Procedure | Expected result | Status / evidence |
|---|---|---|---|---|
| STATIC | REQUIRED | Run `npm run typecheck` and `npm run lint` in the standalone app. | Both focused commands exit successfully; no test or build command runs. | PASS — both commands exited 0 on 2026-11-02. |
| RUNTIME | REQUIRED | Use Orca embedded browser at `http://localhost:5173/mission/m-local-mvrqcly0-101?tab=report`. Inspect the detail DOM, heading levels, and shell landmarks. | One `main`; PageHeader title is `h1`; five section titles are `h2.h4`; MQTT subgroup is `h3.text-base`; top navigation, left sidebar, and status bar are absent on the detail. | PASS — Orca snapshot showed the expected header, five report regions, headings, and no shell landmarks. Screenshots: `agents/hitl-mission-insights-preview.png`, `agents/hitl-mission-insights-preview-lower.png`. |
| SYSTEM | REQUIRED | From the Report list, search `HITL`, open Mission Insights, return with the Mission Reports breadcrumb, then open the preview again. | Search shows two HITL rows; detail hides shell chrome; breadcrumb restores shell and retains `HITL` search plus both rows; detail remains reachable. | PASS — Orca snapshots confirmed each state and transition in the existing dev session. DataTable remains mounted while detail is open. |
| BUILD | NOT_APPLICABLE | Owner requested a static preview during active development; workspace build-timing rule defers builds. | No project build command. | NOT_RUN by policy; no package or release claim. |
| TESTS | NOT_APPLICABLE | Owner requested JSX layout preview; no test run was requested or needed for the presentation-only slice. | No test command. | NOT_RUN; typecheck, lint, and Orca runtime/system inspection provide the scoped evidence. |

Browser preflight: Orca embedded browser controlled through `orca-cli`; inspect shell visibility on detail and shell restoration plus list-state retention on breadcrumb return.
