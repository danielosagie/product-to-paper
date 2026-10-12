# Creao Product Design Guideline

Version 1.0, 2026-10-11. Owner: Product Design. Applies to every screen of agent.creao.ai, whether a person or a coding agent builds it.

Creao already has tokens and a component library (shadcn/Radix on Tailwind v4: the live DOM carries Radix trigger ids such as `radix-_r_2i_-trigger-yours`, and the bundle carries shadcn's `focus-visible:border-ring focus-visible:ring-ring/50` signature). This guideline sits on top of that library. It does three things:

1. It names the **canon**: the subset of today's tokens that product UI may use.
2. It defines the **layout patterns**: how a whole screen is composed from those components.
3. It defines the **gate**: the checks and the two human approvals that a screen passes before it ships.

It does not redesign the library.

## 0. How to use this file

- **Load the whole file before building or changing a screen.** It is written to be complete, so you should not need to ask a follow-up question. If you still have one, the answer goes into this file, not into a chat thread.
- **Rule IDs are stable.** T = token, L = layout, S = state, A = access, G = gate. Checks, errors, PR templates and the compliance audit all cite these IDs.
- **Words that matter:**
  - **must:** the gate blocks the merge.
  - **should:** reviewers push back, and an exception needs a reason.
  - **may:** allowed.
- **Definition of done:** section 9. If every box there is checked, you are done. Otherwise you are not.
- **How to run it:** the `product-to-paper` skill in [product-to-paper](https://github.com/danielosagie/product-to-paper) (section 7).
- **Paper file:** [Creao](https://app.paper.design/file/01M4P9ZN0ZXPM1SGSHNFM33MJ1): tokens, components, patterns, state matrix, live pulls and the prototype.

## 1. What we measured (the receipts behind this guideline)

Every count in this section was measured against production on 2026-10-11:

- **Shipped bundle:** `agent.creao.ai/assets/index-C3VRtTd6.css`, 569 KB, 4,885 distinct classes. Counted with `tools/creao-check.mjs --css`.
- **Theme:** the `@theme` block holds 287 custom properties: 201 color, 24 text, 8 radius, 15 font.
- **Live screens:** 7 routes at 1280x800 and 768x1024, and 5 at 375x812, probed with `tools/creao-ui-probe.js`.
- **Real device:** the login screen checked on iOS 26.5 Safari (Simulator, driven with serve-sim).

What the measurements say:

| Measured | Count | Why it matters |
|---|---:|---|
| Neutral ramps defined | 5 (`grey` warm, `gray`, `neutral`, `zinc`, `slate`) | Five greys for one job. The brand ramp is `grey`. |
| Raw-palette color utilities shipped (`bg-amber-500`, `text-violet-600`, ...) | 333 across 20 hue families | Plus 22 hex or color-mix literals (10 hex, 12 color-mix): 355 in all. Semantic utilities: 413. Almost half of all color bypasses the semantic layer. |
| Arbitrary font sizes (`text-[13px]`, `text-[14.5px]`, `text-[7px]`) | 36 | The theme defines 12 steps; the canon uses 8 (T1). |
| Arbitrary radii | 22 | The theme defines 7 steps; the canon uses 6 plus `full` (T3). |
| Arbitrary shadows | 41 | There is 1 shadow token. |
| Arbitrary durations and easings | 18 | There are 2 easing tokens. |
| Arbitrary spacing in px | 39 | The scale is 4px-based. |
| Aliases with identical values | `surface` = `card` = `popover` = `embedded-card` = `ox-paper` = `grey-0`; `foreground` = `primary` = `accent` = `ring` = `ox-ink` = `grey-950`; `destructive` = `error` = `oxblood` = `ox-accent` | An agent picking "the right token" has 4 to 6 equally valid answers. |
| Layout above the component level | none | Six index pages use 4 tab styles, 2 search heights and 3 primary-action placements (see `compliance-audit.md`). |

The fix is not more tokens. It is fewer, named choices, plus a gate that makes the named choice the only one that ships.

## 2. Principles

1. **One way to do each job.** If two components or tokens do the same job, one of them is retired. Choice is where drift starts.
2. **Every screen is a declared pattern.** A screen says which of the seven patterns it is (section 4). The pattern decides the header, toolbar, action placement, widths and responsive behavior, so the feature team only decides content.
3. **States are designed, not discovered.** Every screen ships with all of its required states drawn in Paper (section 6) before code starts. A state found in production is a design bug.

## 3. Token canon (T rules)

Source of truth is code: the `@theme` block in the app's main stylesheet. Paper mirrors it: the Creao Paper file holds the same canon as Paper tokens, so designs are built from the real values (rule G1). Every canon token is listed in Appendix A.

### T1 Type scale (must)
- **Product UI uses only these sizes:**
  - `text-xs` 12px: meta, badges, captions. **This is the floor.**
  - `text-sm` 14px: dense UI such as sidebar, tables, menus and labels.
  - `text-base` 16px: chat messages, body copy, every mobile input.
  - `text-lg` 18px: section headings.
  - `text-xl` 20px: sheet and dialog titles.
  - `text-2xl` 24px: page titles.
  - `text-3xl` 30px: the chat greeting.
  - `text-4xl` 36px: hero, at most one per screen.
- **No arbitrary sizes.** That means no `text-[13px]`, no `text-[0.8rem]`, and no responsive arbitrary steps such as `md:text-[3.25rem]`.
- **Nothing below 12px.** There are no 7 to 11px labels, including on thumbnails and in illustrations that render live text.

### T2 Color (must)
- **Product UI uses semantic tokens only:**
  - Surfaces: `background`, `surface`, `surface-alt`, `surface-elevated`, `surface-raised`, `chrome`.
  - Text: `foreground`, `muted-foreground`.
  - Lines: `border`.
  - Actions: `primary`, `primary-foreground`, `secondary`, `destructive`.
  - Status: `success`, `petrol` (neutral status), `warning` (new, see below).
  - Focus: `ring`.
  - Neutral ramp: the warm `grey-0` to `grey-950`.
- **Opacity modifiers are allowed on canon tokens** (`bg-foreground/5`).
- **Banned everywhere in product UI:**
  - Every raw Tailwind hue: `red-*` ... `rose-*`, and the custom `blue-*`.
  - The four foreign neutral ramps: `gray-*`, `neutral-*`, `zinc-*`, `slate-*`.
  - Hex, rgb, oklch and `color-mix()` literals in classes or styles.
- **New token:** `--color-warning` (#a86b1d). The code has no warning token today, which is why `amber-*` appears 62 times and `#daa520`, `#b8860b` and `#e67e22` are hard-coded.
- **Domain color sets are tokens with a fixed scope:**
  - `credit-plan`, `credit-purchased`, `credit-reward`, `credit-daily`: credit meters and charts only.
  - `memory-*`: memory-type chips only.
  - These must not be used for anything else.
- **Illustrations and media mockups are exempt** (onboarding art, the "what Creao can do" thumbnails, macOS traffic lights in a window mock), but only inside a container marked `data-exempt="illustration"`. The probe skips that subtree; nothing else is exempt.

### T3 Radius (must)
- **Allowed values:**
  - `rounded-sm` 4px: badges, kbd, inline code.
  - `rounded-md` 6px: buttons, inputs, menu items, list rows.
  - `rounded-lg` 8px: cards.
  - `rounded-xl` 12px: popovers, dialogs.
  - `rounded-2xl` 16px: chat composer, panels.
  - `rounded-3xl` 24px: mobile sheet top corners.
  - `rounded-full`: pills, avatars, pill tabs.
- **No arbitrary radii.**

### T4 Font families (must)
| Family | Token | Role |
|---|---|---|
| Instrument Sans | `font-sans` | All UI text. |
| DM Sans | `font-display` | Page titles of `text-2xl` and up. |
| EB Garamond | `font-serif` | **One editorial moment per screen at most** (the chat greeting, a Discover hero). Never body, never labels, never buttons. |
| JetBrains Mono | `font-mono` | Code, logs, tool-call payloads. |
| DM Mono | `font-data` | Tabular numbers: credits, counts, timestamps in tables. |

`font-ox-ui`, `font-ox-mono` and `font-ui-fallback` are aliases. They are retired; use the family token.

### T5 Weights (must)
- **400 body, 500 labels/buttons/nav, 600 headings.**
- 700 is allowed only for the `text-4xl` hero.
- No arbitrary weights (`font-[450]`, `font-[550]`).

### T6 Aliases (should, then must after migration)
Retire every alias in Appendix A, table A2, and replace it with its canon name. The probe reports alias use as a warning today. It becomes a failure once the alias is deleted from `@theme`; delete it in the same PR that migrates its last use.

### T7 Motion (must)
- **Durations:** `duration-150` (hover, press), `duration-200` (enter, exit of small surfaces), `duration-300` (sheets, dialogs, page-level).
- **Easings:** `ease-out` for entering, `ease-in-out` for moving.
- **No arbitrary durations or cubic-beziers.**
- **Respect `prefers-reduced-motion`:** a transform animation becomes an opacity change or nothing.

### T8 Elevation (must)
- **Four levels only:**
  - `shadow-none`: default. Surfaces separate by fill and border, not shadow.
  - `shadow-xs`: inputs and buttons that sit on a surface.
  - `shadow-card-hover`: interactive cards on hover.
  - `shadow-lg`: popovers, dialogs, sheets.
- **No arbitrary shadows.** Focus is a ring (`ring-ring/50`), never a shadow.

### T9 Z layers (must)
- **Named layers:** `z-10` sticky toolbar, `z-20` page header, `z-30` sidebar drawer, `z-40` popover/menu/tooltip, `z-50` dialog/sheet/toast.
- **No arbitrary z-index.**

### T10 Spacing (must)
- **The 4px scale only:** `1 2 3 4 6 8 12` (4, 8, 12, 16, 24, 32, 48px).
- Safe-area insets (`env(safe-area-inset-*)`, `var(--sat)`, `var(--sab)`) may be added to a scale step through `calc()`. This is the only allowed arbitrary spacing.
- No arbitrary px or rem.

## 4. Layout patterns (L rules)

Every routed screen renders exactly one pattern root:

```tsx
<ScreenLayout pattern="index">{...}</ScreenLayout>  // renders <div data-layout="index" ...>
```

`ScreenLayout`, `PageHeader`, `Toolbar`, `ViewTabs`, `StateView` and `ResponsiveOverlay` are thin layout primitives built from existing components (Button, Tabs, Input, Select, Card, Dialog, Sheet, DropdownMenu, Skeleton, Badge, Tooltip). They add structure, not new visuals.

### L1 Declared pattern (must)
- **Exactly one `[data-layout]` root per screen.** The value is one of `chat | index | detail | builder | settings | overlay | auth`.
- **A screen that fits no pattern does not ship.** It goes to design. A new pattern is added to this file first (section 7, Gate A).

### App shell (all patterns except `auth`)
- **Sidebar:** 256px, `bg-chrome`.
- **Main area:** `bg-background`.
- **Below `md` (768px):**
  - The sidebar becomes a drawer opened by a 44x44 menu button in the top bar.
  - The top bar is 56px.
  - Content gutter is 16px (24px at `md` and up).

### P1 Chat (`data-layout="chat"`)
Use for any conversation with Creao, including agent test runs.

```
| sidebar | top bar 48: [model] [mode]                       [plan] |
|         |           ┌──── chat column, max 768 (container-prose) ┐ |
|         |           │ messages / tool-call cards / artifacts     │ |
|         |           │ composer (rounded-2xl), pinned bottom      │ |
|         |           └────────────────────────────────────────────┘ |
```

**Empty state:**
- One greeting: `font-serif text-3xl`. This is the screen's one serif moment.
- The composer.
- At most **one** suggestion row.
- At most one notice (L6).

**Thread:**
- Tool-call cards are collapsible.
- Artifacts open in a right panel at `lg` and up, and in a full-height Sheet below `lg`.
- The composer stays pinned and respects the safe area on mobile.

**Promos (Team Pulse, templates) are not primary actions.** A promo card's button is `secondary` (L3).

### P2 Index (`data-layout="index"`)
Use for any collection: Agents, Files, Connectors, Discover, Team Pulse, Video history and library, Skills.

```
PageHeader   [title text-2xl/600 + one-line description text-sm muted]      [secondary ≤2] [PRIMARY]
Notice       (optional, max 1, dismiss button top-right)
Toolbar      [ViewTabs]  [Search h40, max 448]  [Filter selects h40] ............ [ViewToggle]
Content      grid (3 cols ≥lg, 2 ≥md, 1 <md) or list; uniform cards; max width 1152, centered
States       every state in the Index column of section 6
```

- **Widths (must, L10):**
  - Content max width is `container-index` (1152px), centered, with the shell gutter.
  - An index page does not invent its own narrower centered column.
- **Header (must):**
  - The title is the page's only `h1` (A5).
  - The description is optional, one line, `text-sm text-muted-foreground`.
  - The header carries the page's primary action (L3) and up to 2 secondary actions.
  - Below `md`, the primary stays a labelled button (44px tall) and secondaries collapse into a 44x44 overflow menu.
- **Toolbar (must):**
  - One row; it wraps on mobile in this order: tabs, search full-width, filters.
  - Search and filter controls are 40px tall on desktop and 44px on mobile.
  - Mobile input text is 16px (A4).
- **Cards:**
  - A card's action is `secondary` or `ghost`.
  - **Never an ink primary button per card** (L3). The whole card may be the link.

### P3 Detail (`data-layout="detail"`)
Use for one object: an agent, a connector, a run, a file, a skill.

```
[← Back to Agents]
[Title + status Badge]                                   [secondary] [PRIMARY]
ViewTabs: Overview · Runs · Settings
main column (fluid)                         | right rail 320 (≥lg): metadata, owners, usage
```

- Below `lg`, the rail stacks under the main column.
- Destructive actions live in the Settings tab, inside a "Danger zone" group, behind a confirm Overlay.

### P4 Builder (`data-layout="builder"`)
Use for create/edit surfaces with an input panel and a live result: Video Studio, the agent builder, the skill editor.

```
| input panel 384 (form)                   | preview canvas (fluid)            |
|  ...fields...                            |  idle / generating / result       |
|  [cost line] [PRIMARY: Generate · 7.5]   |                                   |  ← primary sticky at panel bottom
```

- **One tab level per region at most (L4).** A builder may have mode tabs (Create / Edit) **or** page tabs (Studio / History / Library), not both. History and Library are Index screens linked from the header.
- **Show the cost of the primary action next to it** (credits, time) before the user commits.
- **Below `md`:**
  - The panel comes first and the preview follows.
  - The primary is sticky at the bottom: 48px tall, full width, inside the safe area.

### P5 Settings (`data-layout="settings"`)

```
| section nav 200 | form column, max 672 (container-form)                |
|                 | Section title                                       |
|                 | [label + help text]             [control]           |
|                 | ...                                [Save section]   |
```

- Save is per section. Unsaved changes show an inline bar with Save and Discard.
- Below `md`, the section nav becomes a list that pushes to the section.

### P6 Overlay (`data-layout="overlay"`)
Use for dialogs, confirmations and quick-create.

- **One component, `ResponsiveOverlay`:**
  - At `md` and up it renders `Dialog`: max width 480, or 640 for forms; `rounded-xl`; `shadow-lg`.
  - Below `md` it renders a bottom `Sheet` with `rounded-3xl` top corners and a drag handle.
  - The same children render in both.
- **Footer:**
  - Desktop: one primary on the right, Cancel to its left.
  - Mobile: full-width primary at the bottom, Cancel above it.
- **Destructive confirms:**
  - The primary is `destructive` and names the action ("Delete agent", never "OK").
  - The object name appears in the body.

### P7 Auth (`data-layout="auth"`)
- Centered card, max width 400, on `bg-background`.
- Provider buttons are full width and 44px tall.
- Links use `text-foreground underline`, not a hue (T2).

### Cross-pattern layout rules
- **L2 No horizontal page scroll (must).** At 375, 768 and 1280 the document never scrolls sideways. Wide content (tables, code, carousels) scrolls inside its own container.
- **L3 One primary action per view (must).**
  - At most one ink-filled (`bg-primary`) button is visible per view, where a view is the page, or an open overlay.
  - Lists, cards and promos use `secondary` or `ghost`.
  - Exception: the Chat send button is an icon button and does not count.
- **L4 One tab component, one level (must).**
  - Section switching uses `ViewTabs`, the pill style today's Agents page uses.
  - Filtering by category uses `Select` or a chip `ToggleGroup` placed in the Toolbar, never a second tab row.
  - One tab level per region.
- **L5 Primary action placement (must).**
  - The primary lives in the PageHeader (Index, Detail), at the panel bottom (Builder), or in the overlay footer (Overlay).
  - It also appears in empty states (S1), but **never only** there. A user with data must still be able to create.
- **L6 Notices (must).**
  - At most one dismissible notice per screen.
  - Dismiss is a 24x24 (44x44 mobile) icon button with `aria-label="Dismiss"`, top-right of the notice.
- **L7 Control heights (must).**
  - Desktop: 32px dense (table rows, inline), 40px default (search, select, button).
  - Below `md`: 44px minimum for anything tappable (A3).
- **L8 No nested navigation (must).** No tabs inside tabs, and no segmented control inside a tab panel that switches the same kind of thing.
- **L9 One carousel (should).**
  - Featured rows use one `Carousel` component: arrows top-right, peek of the next card.
  - No pagination dots at any width: at 6px they are untappable on mobile and add nothing on desktop.
- **L10 Page widths come from the pattern (must).** Index 1152, chat 768, settings 672. A page does not set its own `max-w-[...]`.

## 5. Access rules (A rules)

- **A1 Contrast (must).**
  - Text needs 4.5:1, or 3:1 at 18px and up (or 14px bold).
  - This includes disabled primary buttons: disabled is `opacity-50` on the canon fill, never white on mid-grey.
- **A2 Names (must).** Every icon-only control has an `aria-label`. That includes the logo link ("Creao home"), view toggles, "New folder" and dismiss buttons.
- **A3 Target size (must).**
  - Below `md`, every tappable element is at least 44x44.
  - At `md` and up, at least 24x24.
  - Hit area may be extended with padding or a pseudo-element; visual size may stay smaller.
- **A4 Mobile inputs (must).** Inputs, textareas and selects are at least 16px on mobile, so iOS Safari does not zoom on focus.
- **A5 Semantics (must).** One `h1` per screen: the PageHeader title. A title is never a `button`; if it opens a menu, put a chevron button next to it.

## 6. State matrix (S rules)

A screen is not designed until every required state for its pattern is drawn in Paper at 375, 768 and 1280.

| ID | State | Chat | Index | Detail | Builder | Settings | Overlay |
|---|---|:-:|:-:|:-:|:-:|:-:|:-:|
| S1 | Zero data, first run (explains what goes here + the primary action) | ● | ● | | ● | | |
| S2 | No results (shows the query or filters + "Clear") | | ● | | | | |
| S3 | Loading (skeleton in the final layout, no spinner-only screens) | ● | ● | ● | ● | ● | ● |
| S4 | Error (what failed, in plain words, + Retry) | ● | ● | ● | ● | ● | ● |
| S5 | Extremes: 1 item, 500 items, 80-char names, 3-line descriptions | ● | ● | ● | | | |
| S6 | Read-only / shared / no permission (no create, explains why) | | ● | ● | ● | ● | |
| S7 | Working: streaming, generating, saving (progress + Stop/Cancel) | ● | | ● | ● | ● | ● |
| S8 | Blocked by plan or credits (cost shown, upgrade path, no dead button) | ● | ● | | ● | | |
| S9 | Offline / reconnecting | ● | ● | ● | ● | | |

- **S1 and S2 must be different screens.** Showing "No agents match your search" to a user who has typed nothing is a bug.
- **`StateView kind="zero|no-results|error|blocked"` renders S1, S2, S4 and S8** so that copy and layout are consistent.

## 7. The process: two gates, Paper first

Most of the drift in `compliance-audit.md` was not created by bad components. It came from designing in code, one screen at a time, with only the happy path drawn. The process moves every decision to before code, and puts a person at the two moments that matter. It runs as one skill, `product-to-paper`, plus one CLI, published at [product-to-paper](https://github.com/danielosagie/product-to-paper) (install with `npx github:danielosagie/product-to-paper`). The skill has three stages:

| Stage | What it does |
|---|---|
| Pull | `paper-pull` imports every live route into Paper as **editable, token-bound layers, full page**, at 1280 and 375, over plain CDP in background tabs. Never screenshots. |
| System | Pulls `@theme` into Paper as the canon tokens, imports components in each state, binds every layer to a token, and lays out patterns and the state matrix on "00 System". |
| Design | Opus designs every state in Paper, Gate A, Codex builds, Opus walks it as a user and proposes fixes, Gate B, Codex fixes. |

```
G1 Pull ─▶ G2 Design (Opus, Paper) ─▶ G3 GATE A ─▶ G4 Build (Codex) ─▶ G5 Walk as a user (Opus) ─▶ G6 Propose ─▶ G7 GATE B ─▶ merge
```

- **G1 Pull (must).**
  - The Paper file holds the canon (C4 sync check passes).
  - Every existing screen being changed is imported as editable layers.
- **G2 Design (must).**
  - Design runs on Claude Opus 5.5 (`claude-opus-5-5`) at max effort, or on Fable 5.1 (`claude-fable-5-1`) for a new pattern or a large flow. Never a smaller model.
  - Output is every required state (section 6) × 375/768/1280, in canon tokens and existing components.
  - The model id goes in the artboard name.
  - Every brief carries the rules block: clone the live layout and components, fonts only through `var(--font-*)`, a word budget (title at most 4 words, one line at most 8), nothing decorative (no subtitles, tags, pills, status dots or step labels), one primary per view.
- **G3 Gate A (must).** A person approves the pattern, the states, the copy and the one-primary rule, in a Paper comment. No implementation starts before it.
- **G4 Build (must).**
  - Codex (`gpt-6.1-sol`) builds from Paper's exact values (`get_jsx`, `get_computed_styles`), never from screenshots.
  - C1 must exit 0.
- **G5 Walk (must).**
  - The agent that designed the screen uses it like a user, in every state:
    - Desktop: browser-use over CDP, at 1280 and 768.
    - Mobile: iOS Safari through serve-sim, at 375.
  - The probe (C3) runs in each state.
- **G6 Propose (must).** The walk produces a gap list, with a Paper redesign for each gap.
- **G7 Gate B (must).**
  - The same person approves, rejects or defers each gap.
  - Codex fixes the approved ones, and the walk repeats until the probe shows zero `fail` and every approved gap is closed.

## 8. Enforcement mechanism (what runs, when, and what it prints)

| Check | Runs | Blocks | Catches |
|---|---|---|---|
| **C1 `node tools/creao-check.mjs --diff --cached`** (pre-commit) and **`--diff origin/main...HEAD`** (CI) | every commit and every PR | commit and merge | T1, T2, T3, T4, T5, T7, T8, T9, T10 on **added lines only**, limit zero, reported at `file:line`. `--src src/` also counts the whole tree against the ratchet |
| **C2 `node tools/creao-check.mjs --css dist/assets/*.css`** | CI after `vite build` | merge | Any rule count in the **shipped bundle** going above the ratchet baseline (`creao-baseline.json`). Catches what C1 cannot see: classes built from string concatenation, third-party CSS, `@apply` |
| **C3 `tools/creao-ui-probe.js`** | CI against the PR preview: every changed route × required state × {375, 768, 1280}; also in the G5 walk | merge on any `fail` | L1 declared pattern, L2 page h-scroll, L3 one primary, T1 to T5 on computed styles, T6 alias use (warn), A1 contrast, A2 names, A3 target size, A4 iOS input zoom, A5 one `h1` |
| **C4 Paper token sync** | start of every design pass (G1) and at Gate A, on the designer's machine (Paper's MCP is local) | Gate A | Paper `get_tokens({format:"css"})` differs from the canon in `@theme` |
| **C5 PR template check** | CI | merge | Missing `Pattern:`, `Paper:`, `Design model:`, `Gate A:`, `Walk report:` or `Gate B:` lines in the PR description |

### Ratchet, not big bang
- Today's counts are the baseline: T1 36, T2 355, T3 22, T4 3, T5 4, T7 18, T8 41, T9 11, T10 39 shipped classes.
- C2 fails if any count goes **up**.
- When a count goes down, the baseline is lowered in the same PR with `--write-baseline`. That is the only time the baseline file changes.
- C1 checks **added lines only**, with a limit of zero, so new code is clean from day one while old code is migrated screen by screen.

### Errors are written for the reader that will fix them
Agents read failures, so every message names the rule, the value, the limit and the fix. For example:

```
FAIL src/routes/apps/AgentCard.tsx:41  T1 type-scale: "text-[13px]" is off the canon. Limit: canon tokens only. Fix: use text-xs|sm|base|lg|xl|2xl|3xl|4xl (12/14/16/18/20/24/30/36px).
FAIL src/routes/apps/AgentCard.tsx:41  T3 radius-scale: "rounded-[10px]" is off the canon. Limit: canon tokens only. Fix: use rounded-sm|md|lg|xl|2xl|3xl|full (4/6/8/12/16/24px).
diff: 2 off-canon class uses added
```

C2 on the bundle prints one line per rule, and fails the build when a count rises:

```
FAIL T2 color-token        356 (limit 355)  e.g. divide-gray-100 border-amber-200 ...
```

C5 is a few lines of CI:

```bash
body="$(gh pr view "$PR" --json body -q .body)"
for k in "Pattern:" "Paper:" "Design model:" "Gate A:" "Walk report:" "Gate B:"; do
  grep -q "^$k" <<<"$body" || { echo "FAIL G: PR description is missing '$k' (design-system-guideline.md section 9)"; exit 1; }
done
```

The probe report gives the rule, the value, the count and up to three samples with their position:

```json
{ "rule": "A3 target-size", "severity": "fail", "value": "32x32 < 44", "count": 4,
  "samples": ["button.inline-flex \"Open menu\" @12,12,32x32"] }
```

### Exceptions
- **Inline:** `// creao-allow T2: brand illustration, DS-123`, on the same line. A reason and a ticket are required.
- C1 skips the line, but every allow is counted in CI output, and the count is ratcheted like everything else.
- **Illustration subtrees:** `data-exempt="illustration"` (T2 only).
- **Nothing else.** There is no file-level or directory-level disable.

## 9. Definition of done (copy into the PR description)

```
Pattern: P2 Index (data-layout="index")
Paper: <link to the frame group with all states>
Design model: claude-opus-5-5 (max effort)
Gate A: <approver>, <date>
[ ] C1 creao-check --src clean on changed lines
[ ] C2 bundle census at or below baseline (baseline lowered if counts dropped)
[ ] Walk report: probe JSON + screenshot for every required state × 375/768/1280, zero `fail`
[ ] Mobile walked in iOS Safari (serve-sim), not only emulated
[ ] Every gap from the walk listed, redesigned in Paper, and resolved or deferred with a reason
Gate B: <approver>, <date>
```

## Appendix A. Canon tokens

### A1 Canon (Tailwind v4 `@theme` names)

| Group | Tokens | Values |
|---|---|---|
| Neutral ramp | `grey-0` `grey-100` `grey-200` `grey-300` `grey-400` `grey-500` `grey-600` `grey-800` `grey-950` | #fefdfb #f8f6f3 #ebe7e2 #dfdad3 #a8a09a #6e6863 #46423f #2b2926 #16181a |
| Surfaces | `background` `surface` `surface-alt` `surface-elevated` `surface-raised` `chrome` | grey-100, grey-0, #f0ede8, grey-200, grey-300, #f4f1ed |
| Text | `foreground` `muted-foreground` | grey-950, grey-500 |
| Lines | `border` | #e6e2db |
| Actions | `primary` `primary-foreground` `secondary` `destructive` | grey-950, #f3ecd8 (cream), grey-200, #6e2f2c (oxblood) |
| Status | `success` `petrol` `warning` (new) | #4a6552, #4a5560, #a86b1d |
| Focus | `ring` | grey-950 |
| Domain (scoped) | `credit-plan` `credit-purchased` `credit-reward` `credit-daily`; `memory-preference` `memory-fact` `memory-decision` `memory-entity` | credit meters; memory chips |
| Type | `text-xs` ... `text-4xl`; `font-sans` `font-display` `font-serif` `font-mono` `font-data`; weights 400/500/600 | section 3 |
| Radius | `sm 4` `md 6` `lg 8` `xl 12` `2xl 16` `3xl 24` `full` | |
| Spacing | 4px base: `1 2 3 4 6 8 12` | |
| Containers | `container-prose` 768, `container-form` 672, `container-index` 1152 | |
| Breakpoints | `sm 640` `md 768` `lg 1024` `xl 1280` | |

### A2 Retired aliases (migrate, then delete from `@theme`)

| Retire | Use |
|---|---|
| `card`, `popover`, `embedded-card`, `ox-paper`, `card-hover` | `surface` |
| `accent`, `ox-ink`, `ox-btn-bg`, `primary-light` | `primary` / `foreground` |
| `accent-foreground`, `ox-cream`, `ox-btn-fg`, `destructive-foreground` | `primary-foreground` |
| `error`, `oxblood`, `ox-accent` | `destructive` |
| `ox-running` | `success` |
| `ox-petrol` | `petrol` |
| `muted` (same value as `muted-foreground`, used as text) | `muted-foreground` |
| `ox-tile`, `secondary-foreground` | `surface-elevated` / `foreground` |
| `edge`, `control-border` (#ebe7e2, a second border color), `input`, `ox-rule` | `border` |
| `grey-700` (#4a463f, 4 units from grey-600), `grey-900` (#1b1a17, indistinguishable from grey-950) | `grey-600`, `grey-950` |
| `sidebar-fg`, `sidebar-fg-active` | `muted-foreground`, `foreground` |
| `ox-slate`, `ox-terminal` | `grey-950` (media overlays may use `grey-950/70`) |
| `chat-header-surface`, `chat-header-divider` | `background/60`, `border` |
| `gray-*`, `neutral-*`, `zinc-*`, `slate-*`, all hue ramps, custom `blue-*` | semantic tokens above; `warning` for amber/yellow uses |

## Appendix B. Rule index

| ID | Rule | Checked by |
|---|---|---|
| T1 to T5, T7 to T10 | Token canon | C1 source, C2 bundle, C3 computed (T1 to T5) |
| T6 | Aliases | C3 warn, then C1/C2 after deletion |
| L1 | Declared pattern | C3 |
| L2 | No horizontal page scroll | C3 |
| L3 | One primary per view | C3 (warn on desktop, fail in Gate B review) |
| L4, L8 | One tab component, one level | Gate A / Gate B review against Paper |
| L5, L6, L7, L9, L10 | Placement, notices, heights, carousel, widths | Gate A / B review; L7 heights also via A3 on mobile |
| A1 to A4 | Contrast, names, targets, iOS zoom | C3 |
| A5 | One h1, titles are headings | C3 (`h1` count) and review |
| S1 to S9 | State matrix | Gate A (drawn), G5 walk (reached and probed), Gate B |
| G1 to G7 | Process | C4, C5, Gate A, Gate B |
