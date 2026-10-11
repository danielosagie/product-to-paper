---
name: design-build-review
description: Design a new feature in a product's exact style and ship it. Claude Opus designs every state in Paper from the System page and live pulls (Mobbin for inspiration), a person approves (Gate A), Codex builds, Opus walks the build as a user on desktop and iOS and proposes fixes, a person approves (Gate B), Codex fixes. Use for any new feature, prototype or redesign.
---

# design-build-review

| Step | Who | Model |
|---|---|---|
| Design, walk, review | Claude | Opus 5.5 at max effort. Fable 5.1 for a new pattern or a large flow. Never a smaller model. |
| Build, fix | Codex | `codex exec -m gpt-6.1-sol`, high effort |
| Gate A, Gate B | A person | none |

Needs the "00 System" page from `build-system` (font audit clean) and the live pulls from `pull-live`. Use `paper-pull` for any page you touch that isn't pulled yet.

## 1. Prepare
- **Mobbin, if connected:** run `search_screens` / `search_flows` with `output_destination: "design_tool"` and `output_tool: "Paper"`, one search per step of the flow.
  - Take the **move**, not the look. Examples from the Creao run:
    - "one right-aligned Sign in per account row" (Lemni)
    - "a toggle per row" (n8n)
    - "a soft full-width button closing a review card" (Copilot)
  - Cite each reference by its `mobbin_url`.
  - Drop anything from a reference that breaks the rules below, such as category chips or status dots.
- **Write a story file:** exact names, numbers, dates and the product decisions, e.g. "resume starts from today; catch-up is opt-in per agent". Every designer reads the same file, so the flow reads as one journey. See `examples/creao/RESUME-STORY.md`.
- **Create the prototype page once,** before starting any designers. Two designers creating it at the same moment made two pages with the same name.

## 2. Design (Opus in Paper)
Split a big flow across parallel designers: one per part (entry points, main screen, overlay flow). Give each its own row of artboards, a hard stop time and the story file. Paste this block into every brief; designers drift without it.

```
RULES (non-negotiable)
- Their layout: clone the real sidebar, header, rows and composer from the live pulls, and buttons,
  toggles, selects, notices and cards from "00 System" (<x-paper-clone node-id=…/>), then change the
  text with set_text_content. After cloning, check that every original string was replaced.
- Their type: every text layer uses font-family var(--font-sans) (or --font-serif / --font-display
  where the live product uses them). Never write a font name. Copy size, weight, line height and
  color from the matching live element with get_computed_styles.
- Word budget: title at most 4 words; one supporting line at most 8; rows are a name plus a 2-4 word
  fact; dialogs about 20-25 words. Copy is labels, not sentences.
- Nothing decorative: no subtitles, tags, pills, badges, chips, status or active dots, step labels,
  captions under buttons, or labels on artboards. Status is wording plus text color.
- One primary per view. A disabled primary is the ink fill at opacity 0.5.
- Creative inside the system: new components are welcome, built only from tokens and live primitives.
  Inline marks are real assets, e.g. a logo cloned from the Connectors pull, the live avatar style.
- Every state the pattern needs (zero, no results, loading, error, extremes, read-only, working,
  blocked, offline) at 1280 and 375.
- Name artboards "B1 · <screen> · desktop 1280 (opus-5-5)". The model goes in the name, not the canvas.
```

## 3. Review it yourself before Gate A
Never accept a designer's own report. For each artboard:
1. **Compare it with the live page it extends,** side by side. If it has more words or more boxes, cut until it doesn't.
2. **No literal font family is left on the page.** Use the font audit loop from `build-system` step 5.
3. **Find leftover clone text and banned elements.** One designer shipped an unedited "Create agent" dialog in place of the resume dialog.
4. **Fix small things yourself** with `set_text_content` and `update_styles`. Send bigger cuts back as exact instructions, e.g. "delete the 'Why your agents stopped' section; put the cause in the row as warning text".

**→ Gate A.** A person approves the pattern, every state, the copy and one primary per view, in a Paper comment. Nothing is built before this.

## 4. Build (Codex)
```bash
codex exec -m gpt-6.1-sol -c model_reasoning_effort="high" -o build-report.md \
  "Implement Paper frame group <link> exactly. Read values with get_jsx/get_computed_styles, never screenshots.
   Use the product's existing components and tokens only. Run the repo's lint and tests before finishing." < /dev/null
```

## 5. Walk it as a user (the same Opus that designed it)
- **Desktop:** browser-use on the preview (the same CDP session `paper-pull` uses), at 1280 and 768.
- **Mobile:** iOS Safari on the Simulator through serve-sim, at 375, with real taps and typing into every input. Real WebKit catches input zoom, safe-area and keyboard problems that emulation misses.
- **Reach every state,** using fixtures, URL params or real actions.
- **In each state:** run the DOM probe (`examples/creao/tools/creao-ui-probe.js`; adapt the token list at the top to your product), keep the JSON, and compare against the Paper frame.

## 6. Propose fixes, then Gate B
- **Gap list:** each state × width where the build differs from the frame, or where the frame missed something.
- **Redesign each gap** in Paper next to the original frame, under the same rules.
- **→ Gate B.** A person approves, rejects or defers each gap. Codex fixes the approved ones, then go back to step 5.
- **Repeat until** the probe has zero `fail` on every state × width and every approved gap is closed. Then merge.

## PR description
```
Pattern: <P2 Index>
Paper: <link>
Design model: claude-opus-5-5
Inspiration: <mobbin_url>, <mobbin_url>
Gate A: <name>, <date>
Walk report: <probe JSON + one capture per state × width>
Gate B: <name>, <date>
```
