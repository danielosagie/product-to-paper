# Creao Compliance Audit

This audit applies `design-system-guideline.md` (v1.0) to the live product at agent.creao.ai, as of 2026-10-11 between 13:30 and 14:45 PDT. Every violation below names the rule it breaks, the value we measured, and the check in the guideline's gate that would have stopped it before it shipped, with that check's output.

## 1. Scope and method

**What we looked at:**
- **Desktop, 1280x800:** Chat home `/chat`, Team Pulse `/team-pulse`, Discover `/discover`, Agents `/apps`, Video Studio `/video`, Files `/files`, Connectors `/integrations`.
- **Tablet, 768x1024:** all 7 routes, probe only.
- **Mobile, 375x812:** `/chat`, `/apps`, `/files`, `/integrations`, `/video`. Chromium was emulating a mobile device (Android UA, touch).
- **Real device:** the login screen in Safari on iOS 26.5 (iPhone 16 Pro Max Simulator, driven with serve-sim taps).
- **Shipped bundle:** `assets/index-C3VRtTd6.css`, 569 KB, 4,885 distinct classes.
- **Account:** a new team on the free plan with no agents, files or chats. Most index screens therefore showed their first-run state, which is the first thing every new customer sees.

**Instruments** (all in this repo):

| Instrument | What it measured |
|---|---|
| `tools/creao-check.mjs --css` (check C2) | Off-canon class counts in the shipped bundle. Its output is now the ratchet baseline: `tools/creao-baseline.json`. |
| `tools/creao-ui-probe.js` (check C3) | Run in the page on every screen at both widths. It records computed type, color, radius, contrast, accessible names, target sizes, the iOS input-zoom risk, the declared pattern and the `h1` count. |
| Paper file "Creao" | Holds the canon tokens imported from the bundle's `@theme` (G1), the canon token sheet, the layout patterns and the state matrix. Full-page editable pulls of the live screens are on page "01 Live screens", imported with the Paper Snapshot serializer by the `paper-pull` CLI ([product-to-paper](https://github.com/danielosagie/product-to-paper)). [Open the file](https://app.paper.design/file/01M4P9ZN0ZXPM1SGSHNFM33MJ1). |

**Cross-check between instruments:** on the editable Paper pull of `/apps` (1280, full page), `find_nodes` returns:
- exactly 1 frame with `borderRadius: 10px`, the view toggle, which is V16's 10px radius;
- exactly 8 text layers with `fontWeight: 450`, the sidebar nav items, which is V17.

These match the browser probe's counts on the same page. So the values in Paper are the shipped values, and Paper itself can be searched for drift.

**Not covered:**
- **Chat thread states:** streaming, tool calls, artifacts, errors. We did not send messages, because that spends the account's credits and creates data. These states are listed in section 6 as untested.
- **Settings and agent-detail screens:** there is no agent to open on an empty account.
- **Source code:** we have no repo access. Source-level findings are therefore reported by class name (as they appear in the bundle) rather than `file:line`. Check C1 reports `file:line` when it runs in the repo.

## 2. Summary

**Result:** 18 violations, touching 23 of the guideline's rule IDs.
- 6 are state or accessibility failures a user hits directly (V01 to V04, V09, V18), including the one P0.
- 7 are cross-screen layout inconsistencies, the "nothing above the component level" problem (V05 to V08, V10 to V12).
- 5 are token drift (V13 to V17).
- No screen declares a layout pattern, so **L1 fails on 7 of 7 routes**. That single fact explains most of the layout findings: with no pattern to compose from, each page re-decided its header, tabs, search and primary action.

| Sev | ID | Finding | Rule | First check that blocks it |
|---|---|---|---|---|
| P0 | V01 | Agents on mobile shows "No agents match your search" to a user who searched for nothing, and offers no way to create an agent | S1, S2, L5 | Gate A (state not drawn), then G5 walk |
| P1 | V02 | Icon-only links and buttons with no accessible name (logo link on every screen, "New folder") | A2 | C3 probe, every route |
| P1 | V03 | Mobile tap targets of 6 to 36px (menu, carousel dots, tabs, chips, view toggle, attach) | A3 | C3 probe at 375 |
| P1 | V04 | Connectors search input is 14px on mobile, so iOS zooms the page on focus | A4 | C3 probe at 375 |
| P1 | V05 | Primary action placement differs on every index page; on Agents, "Create" exists only in the empty state | L5, L3 | L1 pattern root plus Gate A |
| P1 | V06 | Four different tab and filter components for the same job, plus nested tabs in Video Studio | L4, L8 | Gate A; C3 A3 on mobile |
| P1 | V07 | Up to 35 ink "primary" buttons on one screen (Discover), 5 on Chat home | L3 | C3 L3, Gate B |
| P2 | V08 | Search and filter controls are 40px on Agents and Discover, 32px on Files and Connectors, and sit in different places | L7 | Gate A; C3 A3 at 375 |
| P2 | V09 | Two screens have no `h1`; the Files title is a `<button>` | A5 | C3 A5 |
| P2 | V10 | Team Pulse uses its own centered 896px column; every other index page runs full width from a 24px gutter | L10 | L1 pattern root |
| P2 | V11 | Three carousel treatments (dots and arrows, top arrows with clipped cards, an edge arrow) | L9 | Gate A |
| P2 | V12 | Tip card's dismiss X sits under the text, bottom-left | L6 | Gate A, G5 walk |
| P2 | V13 | Off-scale type on live screens: 9, 10, 11, 13, 14.5, 15, 22, 51, 52px | T1 | C1, C2, C3 |
| P2 | V14 | 355 off-canon color classes ship, 333 of them raw Tailwind hues across 20 families; live composer border is a `color-mix()`; login links are raw blue | T2 | C1, C2, C3 |
| P2 | V15 | Five neutral ramps and 4 to 6 aliases per value; live UI uses `sidebar-fg`, `grey-900`, `grey-700`, `ox-terminal` | T2, T6 | C3 T6, then C1/C2 after deletion |
| P2 | V16 | Off-scale radius, shadow and motion: 22 / 41 / 18 arbitrary values ship; live radii of 3, 7 and 10px | T3, T7, T8 | C1, C2, C3 T3 |
| P2 | V17 | Arbitrary font weights 450 and 550 (the sidebar uses 450 on every screen) | T5 | C1, C2, C3 T5 |
| P3 | V18 | Disabled "Generate" is white text on mid-grey; avatar initials at 4.46:1 | A1 | C3 (avatar); Gate A (S7/S8 drawn) for the disabled state |

## 3. Findings: behavior, states and access

### V01 · P0 · Agents on mobile shows the wrong empty state and no create path
- **Where:** `/apps` at 375x812 on a team with zero agents.
  - Mobile shows "No agents match your search / Try a different search term / Clear filters", with the search field empty.
  - Desktop, same account and same moment, correctly shows "No agents in this team yet / Create agent".
  - On mobile there is no "Create agent" anywhere. The header holds only "Import" (secondary), and the empty state that carries the primary on desktop is replaced by the no-results state.
- **Breaks:**
  - S1 and S2 must be different states.
  - L5: the primary action is never only in an empty state, and here it is not even there.
- **Why it matters:** this is the first screen a new mobile user sees in the product's core noun, and it tells them they did something wrong and gives them no way forward.
- **Fix:**
  - Render `StateView kind="zero"` when the collection is empty and no query or filter is set; render `kind="no-results"` only when one is.
  - Put "Create agent" in the PageHeader at every width.
- **How it would have been caught:**
  - **Gate A:** the Index pattern requires S1 and S2 as separate artboards at 375, 768 and 1280. A design that only drew desktop S1 has visibly missing frames, and Gate A does not pass with missing frames.
  - **G5 walk:** the designing agent opens `/apps` at 375 on an empty fixture, compares to the S1 artboard, and files the gap: "S1 at 375 renders S2 copy; primary missing".
  - **Lint:** no lint catches this, because the copy is a valid component in the wrong state. This is exactly why the guideline puts a walk and a human gate after the build, not just linters.

### V02 · P1 · Controls without accessible names
- **Where:**
  - The logo link in the sidebar (`a.flex.items-center`, 70x16, an SVG only) on all 7 desktop routes.
  - The icon-only "New folder" button on `/files` at 375 (41x36).
- **Breaks:** A2.
- **Fix:** `aria-label="Creao home"` and `aria-label="New folder"`.
- **Caught by:** C3 on every route of every PR, because the logo lives in the shell. The probe output:

```json
{ "rule": "A2 accessible-name", "severity": "fail", "value": "icon-only control without a name", "count": 1,
  "samples": ["a.flex.items-center @20,18,70x16"] }
```

### V03 · P1 · Mobile tap targets below 44px
- **Where, measured at 375x812:**

| Element | Size | Route(s) |
|---|---|---|
| Menu button | 32x32 | every route |
| Carousel dots | 6x6, and 16x6 when active | `/chat` |
| Attach "+" | 36x36 | `/chat` |
| "Like" | 24x24 | `/chat` |
| "Run agent" | 81x32 | `/chat` |
| Tabs | 36 tall | `/apps` |
| Tabs | 26 tall | `/integrations` |
| Category chips | 28 tall | `/integrations` |
| View toggle | 26x26 | `/files` |
| Filter selects | 140x32 | `/files` |
| Mode switch | 97x26 | `/video` |
| Option pills | 32 tall | `/video` |

- **Breaks:** A3 (44x44 below `md`), and L7 (44px controls on mobile).
- **Fix:**
  - The pattern primitives set mobile control height to 44: `Toolbar`, `ViewTabs`, the top-bar menu button.
  - Carousel dots are removed on mobile (L9).
- **Caught by:** C3 at 375. Sample output:

```json
{ "rule": "A3 target-size", "severity": "fail", "value": "32x32 < 44", "count": 4,
  "samples": ["button.inline-flex \"Open menu\" @12,12,32x32"] }
```

### V04 · P1 · Connectors search zooms the page on iOS
- **Where:** the `/integrations` search input is 14px at 375 wide. iOS Safari zooms any focused input under 16px, and the page stays zoomed after blur.
- **Control receipt:** the login inputs are 16px. On iOS 26.5 Safari, a serve-sim tap on the email field focused it with no zoom (`screens/ios-safari-login-focus.png`). So the rule is right, and Connectors is the outlier.
- **Breaks:** A4.
- **Fix:** `text-base md:text-sm` on the shared `Input`. The fix goes in the component once, not per page.
- **Caught by:** C3 at 375:

```json
{ "rule": "A4 ios-input-zoom", "severity": "fail", "value": "14px input on mobile", "count": 1,
  "samples": ["input.w-full.min-w-0 \"Search integrations\" @16,290,343x32"] }
```

- **G5 confirms it on real WebKit:** the walk taps the field through serve-sim.

### V09 · P2 · Missing `h1`; a title rendered as a button
- **Where:**
  - `/chat` has 0 `h1`: the greeting is an `h2`.
  - `/files` has 0 `h1`: "Files" is a `button.font-sans.text-2xl.font-semibold`, 52x32.
  - The other five routes have exactly one.
- **Breaks:** A5.
- **Fix:**
  - `PageHeader` always renders the title as `h1`.
  - The chat greeting becomes the `h1` of the Chat pattern.
  - If the Files title must open a menu, use a chevron button next to the heading.
- **Caught by:** C3 `A5 one-h1` ("0 visible h1") on both routes.

### V18 · P3 · Contrast misses: disabled primary, avatar initials
- **Where:**
  - `/video`, "Generate · 7.5" before a prompt is entered: white text on a flat mid-grey fill, at both widths.
  - `/chat`, the "DT" team avatar initials measure 4.46:1 (`grey-700` on `grey-200`), just under 4.5:1. C3 catches this one: `A1 contrast | 4.46:1 | x1`.
- **Breaks:** A1, which requires a disabled primary to be the canon fill at `opacity-50`.
- **Why the probe passes it, by design:** WCAG exempts disabled controls, and C3 skips `:disabled`.
- **Caught by:** Gate A. The Builder pattern's required states include S7 (generating) and S8 (blocked by credits), and the primary's disabled look is drawn in Paper with canon tokens. A grey not in the token set cannot be picked there, because the Paper file only offers canon tokens.

## 4. Findings: layout above the component level

These are the findings the brief describes: "nothing above the component level says how a whole screen should be structured". Six screens are collections and should share the Index pattern (P2). Measured side by side at 1280x800:

| | Discover | Agents | Files | Connectors | Team Pulse | Video Studio |
|---|---|---|---|---|---|---|
| Title | h1 24/600 | h1 24/600 | **button** 24/600 | h1 24/600 | h1 24/600 + "· team" | h1 24/600 |
| Description | yes | no | no | no | yes | no |
| Header actions | none | "Import" (secondary) | "New folder" (ghost) + **"Upload" (ink)** | none | none | settings icon |
| Tabs | pills, h36 | pills, h36 | none | **underline, right-aligned**, h26 | **small text, right-aligned** | pills + **segmented** h26 |
| Category filter | none | 2 Selects h40 | 2 Selects h32 | **chip row** h28 | none | none |
| Search | right-aligned, h40, w576 | left, h40, w448 | left, **h32**, w384 | left, **h32**, w730 | none | none |
| Content column | full, x24 | full, x24 | full, x24 | full, x24 | **centered 896** | full |
| Carousel | dots + arrows | none | none | **top arrows, cards clipped** | none | none |

### V05 · P1 · The primary action moves from page to page
- **Where:**
  - Files puts its primary ("Upload", ink) top-right.
  - Agents puts a *secondary* ("Import") top-right, and its primary ("Create agent") only inside the empty-state card. Once a team has agents, the page loses its create button entirely; on mobile it is already gone (V01).
  - Connectors, Discover and Team Pulse have no header action.
- **Breaks:** L5 (primary in the PageHeader, never only in an empty state), and L3.
- **Fix:** every Index page renders `PageHeader` with an explicit `primary` slot. Pages that genuinely have no create action (Discover) say so: `primary={null}`, which is reviewed at Gate A.
- **Caught by:**
  - **C3 L1** fails on all 7 routes today: `"no [data-layout] root"`. Under the guideline, an Index screen cannot exist without `ScreenLayout pattern="index"`, whose `PageHeader` makes the primary slot a required prop. Leaving it out is a TypeScript error before it is a design review.
  - **Gate A:** the Index frames in Paper show the primary at all three widths.

### V06 · P1 · Four tab components for one job, and tabs inside tabs
- **Where:**
  - Pill tabs (Discover, Agents, Video).
  - Underline tabs, right-aligned, 26px (Connectors), plus a second row of category chips, 28px.
  - Small right-aligned text filters (Team Pulse).
  - Video Studio stacks two levels: Studio/History/Library pills, then a Create/Edit segmented control (26px, `rounded-[4px]`, 12px text) inside the Studio panel.
- **Breaks:**
  - L4: one tab component; categories are a Select or chip group in the Toolbar, not a second tab row.
  - L8: no nested navigation.
  - The P4 Builder rule: one tab level.
- **Fix:**
  - `ViewTabs`, using today's pill style, is the only section switcher.
  - Connectors' "All / Available / Built-in / Connected" become `ViewTabs`, and its categories become a Select.
  - Video Studio becomes a Builder (Create/Edit as its single mode switch). History and Library become Index screens linked from its header.
- **Caught by:**
  - **Gate A:** the Toolbar slot in the Index pattern has one `ViewTabs` position, so a second tab row has nowhere to go in Paper.
  - **C3 A3 at 375** independently fails the 26px tabs and 28px chips (V03).

### V07 · P1 · Many "primary" buttons per view
- **Where:**
  - `/discover` renders 35 ink-filled "Try now" buttons, one per card.
  - `/chat` renders 5 at once in the 1280 viewport: "Open Team Pulse" plus four "Try /..." suggestion buttons.
- **Breaks:** L3. Card actions are `secondary` or `ghost`; the card itself is the link.
- **Fix:** card CTAs become `variant="secondary"`; promo cards (Team Pulse on Chat home) use `secondary`.
- **Caught by:** C3 reports it on every run:

```json
{ "rule": "L3 one-primary-action", "severity": "warn", "value": "35 primary-filled buttons", "count": 34,
  "samples": ["button.pointer-events-auto.relative.z-10 \"Try now\""] }
```

- L3 is a warning in CI (some marketing-style surfaces may justify more than one) and a blocking item at **Gate B**, where the reviewer sees the count in the walk report.

### V08 · P2 · Toolbar controls change height and position
- **Where:**
  - Search is 40px on Agents and Discover and 32px on Files and Connectors.
  - It is right-aligned on Discover and left-aligned elsewhere.
  - Selects are 40px on Agents and 32px on Files.
  - The view toggle is a 72x38 segmented control with `rounded-[10px]` on Agents, and two 26x26 buttons on Files.
- **Breaks:** L7 (40px default controls), and the P2 Toolbar order: tabs, search, filters, toggle.
- **Fix:** one `Toolbar` primitive owns the order and heights.
- **Caught by:**
  - **Gate A**, against the Index artboard.
  - **C3 T3** catches the 10px radius.
  - **C3 A3** catches every 32px control at 375.

### V10 · P2 · Team Pulse sets its own width
- **Where:** `/team-pulse` content is a centered column 896px wide starting at x88 of main. Every other index page runs full width from a 24px gutter (x24, 976px wide at 1280).
- **Breaks:** L10: page widths come from the pattern.
- **Fix:** `ScreenLayout pattern="index"` sets `max-w-[--container-index] mx-auto px-6`, and pages stop setting their own `max-w-*`.
- **Caught by:** the L1 pattern root plus Gate A.
- **Gap in the checks today:** C1 does not yet flag `max-w-*` inside route files. Section 7 lists it as the next rule to add.

### V11 · P2 · Three carousel treatments
- **Where:**
  - Discover "Featured agents": pagination dots plus arrows on the right.
  - Connectors "Featured connectors": arrows top-right, cards cut off at the right edge.
  - Chat home "What Creao can do": a round arrow overlaid on the last card's edge.
- **Breaks:** L9.
- **Caught by:** Gate A. There is one Carousel in the Paper component set, so a second treatment would be a new-component request, which Gate A reviews explicitly.

### V12 · P2 · Notice dismiss button is misplaced
- **Where:** the `/apps` "Team agents & skills are here" notice puts its X below the body text, bottom-left (desktop at 195,105 in the 800px capture; mobile at 47,232).
- **Breaks:** L6 (dismiss is top-right, 24x24 or 44x44 on mobile, `aria-label="Dismiss"`).
- **Caught by:** Gate A (the Notice slot is drawn once in the Index pattern), and the G5 walk side-by-side.

## 5. Findings: token drift (the bundle and the live screens)

Bundle census, `node tools/creao-check.mjs --css assets/index-C3VRtTd6.css`, recorded as the ratchet baseline:

```
T1 type-scale          36  e.g. text-[13px] text-[17px] text-[0.8rem] text-[0.6875rem] text-[2.5rem]
T2 color-token        355  e.g. divide-gray-100 border-amber-200 border-[color-mix(in_srgb,var(--color-grey-200)_72%,...)]
T3 radius-scale        22  e.g. rounded-[0.14em] rounded-[1px] rounded-[2px] rounded-[3px] rounded-[4px]
T4 font-family          3  e.g. font-ox-mono font-ox-ui font-ui-fallback
T5 font-weight          4  e.g. font-[450] font-[500] font-[550] font-[600]
T7 motion-token        18  e.g. duration-[180ms] duration-[260ms] duration-[280ms] ease-[cubic-bezier(0.34,1.56,0.64,1)]
T8 elevation-token     41  e.g. shadow-[0_0_0_1px_rgb(22_24_26/0.30),0_2px_6px_rgb(22_24_26/0.12)]
T9 z-layer             11  e.g. z-[1] z-[2] z-[3] z-[100] z-[300]
T10 spacing-scale      39  e.g. mt-[16px] mt-[26px] -ml-[40px] ml-[52px] gap-[13px]
```

### V13 · P2 · Off-scale type on live screens
- **Where (computed, 1280x800):**

| Route | Off-scale sizes |
|---|---|
| `/chat` | 9px "Thinking" (`text-[9px]`); 10px chip labels ×17 (`text-[10px]`); 11px durations ×10; card titles 15px ×13 (`text-[15px]`); card meta 13px ×13 (`text-[13px]`); greeting 52px |
| `/discover` | eyebrow 11px; subtitle 13.5px at 768 and 14.5px at 1280 (class `text-[12.5px]` plus responsive arbitrary steps); hero 37px at 768 and 51px at 1280 (class `text-[31px]` plus responsive steps). One element, a different off-scale value at every breakpoint |
| `/video` | labels 13px ×37; tags 10px ×8; "A blank slate" 22px |

- **Breaks:** T1, including the 12px floor.
- **Fix:**
  - Card title `text-base` (16), meta `text-sm` (14), labels `text-xs` (12).
  - Greeting and hero `text-3xl` / `text-4xl`.
  - Nothing under 12px.
- **Caught by, in order:**
  1. **C1 at commit:** `src/...:NN  T1 type-scale: "text-[13px]" is off the canon. ... Fix: use text-xs|sm|base|lg|xl|2xl|3xl|4xl`.
  2. **C2 in CI:** `FAIL T1 type-scale 37 (limit 36)` for any new arbitrary size, even one assembled at runtime.
  3. **C3 on the preview:** `T1 type-scale | 13px | x37`.

### V14 · P2 · The semantic color layer is bypassed
- **Where:**
  - **Bundle:** 355 off-canon color classes. 333 are raw Tailwind hues across 20 families (amber 62, blue 40, green 36, emerald 29, red 23, violet 20, yellow 18, sky 15, gray 13, cyan 11, neutral 10, ...), and 22 are literals: 10 hex (`bg-[#c0392b]`, `text-[#b8860b]`, `bg-[#daa520]`, ...) and 12 `color-mix()`. 413 color utilities use semantic tokens.
  - **Live, `/chat`:** the composer border is `color(srgb 0.908 0.892 0.870)`, a `color-mix()` of `grey-200` and `grey-300`, and is not a token. The suggestion illustration draws a raw `blue-500` (#5a7dd8) outline.
  - **Live, login on iOS Safari:** "Forgot password?" and "Register" are hyperlink-blue, a hue that is not in the canon.
- **Breaks:** T2. And the absent warning token is the root cause of the amber, yellow and goldenrod spread.
- **Fix:**
  - Add `--color-warning`, already added to the Paper canon.
  - Map amber/yellow to `warning`, green/emerald to `success`, red to `destructive`.
  - The composer border uses `border`.
  - Links use `text-foreground underline`.
  - Illustrations move under `data-exempt="illustration"`.
- **Caught by:**
  - **C1** on each class: `T2 color-token: "bg-amber-500/20" is off the canon ...`.
  - **C2** ratchet at 355.
  - **C3** on computed values, which also catches literals built in inline `style={{}}` that no class regex sees: `T2 color-token | border color(srgb 0.908392 0.891608 0.869804) | x1`.

### V15 · P2 · Five neutral ramps and stacks of aliases
- **Where:**
  - **Theme:** `grey-*` (warm, the brand ramp), `gray-*`, `neutral-*`, `zinc-*` and `slate-*` are all defined and used.
  - **Same-value aliases:**
    - `surface` = `card` = `popover` = `embedded-card` = `ox-paper` = `grey-0`.
    - `foreground` = `primary` = `accent` = `ring` = `ox-ink` = `grey-950`.
    - `destructive` = `error` = `oxblood` = `ox-accent`.
  - **Mislabelled:** `muted` has the same value as `muted-foreground` and is used as text.
  - **Two border colors:** `border`/`input` are #e6e2db; `edge`/`control-border` are #ebe7e2.
  - **Live, every screen:** the sidebar uses `sidebar-fg` ×7 to 8; the team name uses `grey-900`; the avatar uses `grey-700`. Video thumbnails use `ox-terminal` ×56.
- **Breaks:** T2, and T6 (aliases are retired; Appendix A2 maps each one to its canon name).
- **Caught by:**
  - **C3** reports alias use as `T6 non-canon-alias` warnings on every route today, e.g. `text alias --color-sidebar-fg | x7`.
  - When the alias is deleted from `@theme`, the class stops compiling. C1 then fails any remaining use, and C2 fails if one sneaks back.
  - **C4** (Paper token sync) keeps the Paper file at the canon, so designs cannot reintroduce an alias.

### V16 · P2 · Off-scale radius, elevation and motion
- **Where:**
  - **Bundle:** 22 arbitrary radii, 41 arbitrary shadows (there is 1 shadow token), 18 arbitrary durations and easings, including a springy `cubic-bezier(0.34,1.56,0.64,1)`.
  - **Live radii:** 3px duration badges ×35 on `/chat`, 7px icon tiles ×16, a 10px view toggle on `/apps`, a 3px kbd chip on `/video`.
- **Breaks:** T3, T7, T8.
- **Caught by:** C1 and C2 for all three. C3 also catches radius on computed style: `T3 radius-scale | 3px | x35`.

### V17 · P2 · Arbitrary font weights
- **Where:** the sidebar nav renders weight 450 on every screen (×8); the bundle ships `font-[450]` and `font-[550]`.
- **Breaks:** T5.
- **Caught by:** C1 and C2 (`font-[450]`), and C3 `T5 font-weight | 450 | x8`.

## 6. How the gate would have run on these screens

Here is the history of `/apps` replayed under the guideline:

1. **G1:** the designer, an agent on `claude-opus-5-5`, starts from the Paper file, which already holds the canon. No `amber-*`, no `rounded-[10px]` and no 13px exist there to pick.
2. **G2:** it draws Agents as P2 Index at 375, 768 and 1280, with S1 to S8. S1 (zero) and S2 (no results) are separate frames. "Create agent" sits in the PageHeader at all widths.
3. **Gate A:** the reviewer checks the frames. V01, V05, V06, V08, V11 and V12 cannot be approved, because the pattern has no slot for them.
4. **G4:** the build. C1 fails the commit on `rounded-[10px]` (V16), and on any `text-[13px]` or `bg-amber-*` the engineer or agent types.
5. **CI:** C2 fails if the shipped bundle grows any count. C3 runs on the preview:
   - L1 confirms `data-layout="index"`.
   - A2 catches the nameless logo link (V02).
   - A3 and A4 at 375 catch V03 and V04.
   - A5 catches a missing `h1`.
6. **G5:** the designing agent walks `/apps` in iOS Safari through serve-sim with an empty fixture, a 500-agent fixture and a read-only fixture. It compares each against its Paper frame, and logs any gap (for example a 2-line card title truncating at 375).
7. **G6 and Gate B:** gaps are redesigned in Paper, approved, implemented and re-walked to zero probe failures. Then the PR merges.

**What was not exercised in this audit, and where each is caught:**
- Chat thread states: streaming (S7), tool-call failure (S4), credits exhausted (S8), offline (S9). These are required states of P1; a Chat PR cannot pass Gate A without them.
- Agent Detail (P3) and Settings (P5): there was no data to reach them on a new account. The G5 walk uses fixtures for exactly this reason.

## 7. What already passes

An audit that lists only failures cannot be checked, so here is what held:
- **L2 no horizontal page scroll:** passed on all 19 probe runs (7 at 1280, 7 at 768, 5 at 375).
- **A4 iOS input zoom:** passed everywhere except Connectors search. The 16px login inputs did not zoom on real iOS Safari.
- **A1 contrast:** body text, muted text and buttons pass on every screen. The only measured misses are in V18.
- **Composition already close to canon:** Agents' header, pill tabs and empty-state card are the nearest thing to the P2 Index pattern. That is why `ViewTabs` adopts its pill style, rather than inventing a new one.
- **T1 on most pages:** Files, Connectors, Team Pulse and Agents render no off-scale type at 1280. The drift concentrates in Chat home, Discover and Video Studio, the most promotional surfaces.

## 8. What the mechanism does not catch yet (and the next rules)

- **Wrong-but-valid states (V01) and wrong-but-valid composition (V06, V11):** no linter can tell that a correct component is in the wrong place. These are caught by the Paper-first state matrix, the walk and the two human gates, which is why those are `must`.
- **Page-level widths (V10):** add C1 rule L10, which flags any `max-w-*` in files under the routes directory, since the pattern owns width.
- **Pattern declared but misused** (an Index page with two tab rows): add a C3 check that counts `[role=tablist]` per `[data-layout]` root (L4/L8).
- **Copy quality and the pattern choice itself:** these stay human, at Gate A.

## 9. Receipts

| Receipt | Where |
|---|---|
| Bundle census and baseline | `tools/creao-baseline.json`, `tools/census-baseline-2026-10-11.json` |
| Runtime probe source | `tools/creao-ui-probe.js`; run in the page, it returns `{url, viewport, pattern, fail[], warn[]}` |
| Static checker | `tools/creao-check.mjs`. Verified on a fixture: it fails `text-[13px]`, `bg-amber-500/20`, `rounded-[10px]`, `shadow-[...]` and `font-[550]` with exit 1 |
| Reference captures (1280 and 375) | `screens/desktop-*.jpg`, `screens/mobile-*.jpg`. These are for this document only; the editable pulls live in Paper |
| iOS Safari, real WebKit | `screens/ios-safari-login.png`, `screens/ios-safari-login-focus.png` (focus on a 16px input, no zoom) |
| Paper file "Creao" | Canon tokens (71, imported with source notes), the canon token sheet, layout patterns, the Index state matrix, and full-page editable pulls of the live screens ("01 Live screens"). [Open](https://app.paper.design/file/01M4P9ZN0ZXPM1SGSHNFM33MJ1) |
