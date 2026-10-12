# Worked example: Creao (agent.creao.ai), 2026-10-11

One run of the `product-to-paper` skill, all three stages, on a real product.

## What was pulled
- **Routes:** the JS bundle's router listed about 35 paths.
  - 21 render for a signed-in free-plan team: `/chat`, `/team-pulse`, `/discover`, `/discover/skills`, `/apps`, `/video`, `/files`, `/integrations`, `/skills`, `/memory`, `/feed`, `/views`, `/voice`, `/widgets`, `/image`, `/workspaces`, `/organization`, `/pricing`, `/rewards`, `/status`, `/settings/integrations/slack`.
  - 8 redirect to `/chat` because they're feature-flagged off for this account: `/crm`, `/rooms`, `/devices`, `/download`, `/discover/workers`, `/discover/mcp-servers`, `/add-app`, `/affiliates`.
  - `/dev/design-system` exists, but it's dev-gated.
- **Pages:** 12 editable full-page pulls (7 at 1280, 5 at 375), 5,875 nodes. Discover pulled whole at 5,277 px.
- **Components:** 52 of 64 component variants (default, hover, focus-visible, active, disabled) from `components.json`.
- **Fidelity:** 0.36% of pixels off on `/apps` at 1280, all text anti-aliasing.

## What the system pass found
- **Tokens:** 287 theme variables in the bundle became 71 canon tokens (`tokens.css`).
- **Duplicates:** five grey ramps, with aliases stacked four to six deep (`surface` = `card` = `popover` = …).
- **Raw palette:** 355 off-canon color classes ship. 333 are raw Tailwind hues (amber 62), with no warning token.
- **Fonts:**
  - The app uses Instrument Sans (UI) and EB Garamond (greeting).
  - DM Mono is defined but never rendered.
  - The marketing site uses Inter and Frank Ruhl Libre.
- **Cross-check:** after binding, Paper's literal-color search on `/apps` listed exactly the DOM probe's drift (`sidebar-fg` ×7, `grey-900` ×3, `grey-700` ×1).

## Documents
- `design-system-guideline.md`: the token canon, seven layout patterns, the state matrix, two human gates, and the checks.
- `compliance-audit.md`: 18 violations across 7 screens. Each has the rule it breaks, the measured value, and the check that would have caught it before it shipped.
- `tools/creao-check.mjs`: static drift check against a CSS bundle, plus a `--diff` mode for added lines.
- `tools/creao-ui-probe.js`: the DOM probe these rules were measured with.
- `tools/creao-baseline.json`: the measured counts.

## Inputs for paper-pull
- `routes.txt`: the route list for `paper-pull --routes`.
- `components.json`: the component specs for `paper-pull --spec`.
- `RESUME-STORY.md`: the shared story file used by three parallel designers for the "While you were away + one-tap resume" prototype.

## Lessons that became rules in the skills
- **Screenshots were rejected.** Pulls must be editable layers.
- **Full-screen computer use paused a screen recorder.** Everything now runs in background tabs.
- **One tab serializing many components hit the 30 s CDP ceiling.** Each serialization now gets a fresh tab.
- **Designers wrote too many words and added subtitles, tags and status dots.** The brief now carries a word budget and a ban list.
- **Designers wrote font names instead of tokens, and used DM Mono that the product never renders.** Every layer now binds to `var(--font-*)`.
- **Paper's search caps at 200 matches.** Fixes now loop per literal value.
