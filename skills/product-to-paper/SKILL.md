---
name: product-to-paper
description: Take a live web product into Paper and design new features in its own style. Stage 1 pulls every real page and component into Paper as editable, token-bound layers (never screenshots). Stage 2 builds the product's design system on one System page. Stage 3 designs a feature with Claude Opus, gates it with a person, builds it with Codex, walks the build as a user, and gates the fixes. Use before redesigning, auditing or adding features to an existing product.
---

# product-to-paper

`paper-pull` below is `npx -y github:danielosagie/product-to-paper pull`.

## Setup (stop if any fails)
1. Paper desktop is open with the target file, and `PAPER_FILE_ID` is set (from `app.paper.design/file/<id>`).
2. A Chromium browser is signed in to the product with remote debugging allowed (`chrome://inspect/#remote-debugging`). `paper-pull` finds it through `DevToolsActivePort`; otherwise pass `--cdp http://127.0.0.1:9222`.
3. The Paper Snapshot extension is installed in that browser.
4. At least 5 GB of disk is free. `paper-pull` refuses below that, because swap filled the disk mid-run on a 16 GB Mac.

**Always:**
- Never sign in for the user. Never read cookies, credentials or `.env` files.
- Work in the background: no full-screen control, OS keystrokes or bringing apps forward. Taking over the screen paused a screen recorder on the Creao run.
- Editable layers only. If a page won't import, report it; never fall back to a screenshot.

## Stage 1: Pull (page "Live screens")
```bash
paper-pull --scan --base https://app.example.com --bundle https://app.example.com/assets/index-XXXX.js
paper-pull --base https://app.example.com --routes routes.txt --widths 1280,375 --max 10 --signed-in-text "Settings"
```
- `--scan` reads the bundle's router and writes `routes.txt` with the paths that **render**. Paths that **redirect** (feature-flagged off) or **404** are listed separately. Put them in your report; never drop them.
- `--signed-in-text` is text that only shows when signed in. The import stops without it.
- Rerun for the next batch; imported routes are skipped.
- Each import prints `<name> · <nodes> nodes · <bound%> bound · drift: <values that matched no token>`. The drift line is the product's real off-system values.
- **Check it with Paper MCP:**
  - `get_basic_info`: every artboard has a real size.
  - `get_screenshot` one artboard per width next to live. Expect text anti-aliasing only; Creao `/apps` was 0.36% of pixels off.
  - `find_nodes` for a value you know is on the page.
- Foreign fonts on a live pull are evidence (Creao's marketing site uses Inter while the app uses Instrument Sans). Don't rebind them.

## Stage 2: System (page "00 System")
1. **Tokens from production.** Tailwind v4 keeps them in `@layer theme{…}` of the shipped CSS (`curl` the `/assets/index-*.css`). With repo access, read the `@theme` stylesheet.
2. **Pick the canon.**
   - One token per value: same-value aliases collapse into one name. Write down the retire map.
   - One neutral ramp.
   - A missing job gets a token (Creao had no warning color, so amber was hard-coded 62 times); a missing value does not.
   - Fonts are assigned by where the product renders them (`get_computed_styles` on the pulls).
3. **Push them.** `create_tokens` in order: neutrals, semantic, status, domain. Aliases go in as `var(--canon)`. Every token gets a description with its source and rule. Draw a "Canon tokens" artboard from `var(--token)` values only.
4. **Import components and states.**
   ```bash
   paper-pull --base https://app.example.com --spec elements.json --page "00 System"
   ```
   One entry: `{ "name": "Button / primary", "route": "/agents", "pick": "[...document.querySelectorAll('button')].find(b => b.innerText.trim() === 'Create agent')", "states": ["default", "hover", "focus-visible", "active"] }`. Pick buttons, tabs and selects by visible text; cards and notices by text, then climb to the nearest ancestor with a border or fill; composers by `[contenteditable="true"]`.
5. **Bind every layer.**
   - Fonts: per literal family, loop `find_nodes({styleName:"fontFamily", styleValue:'"Instrument Sans"*'})` then `update_styles` with `var(--font-sans)` until nothing is found. `find_nodes` returns at most 200, so search by literal name.
   - Colors: `find_nodes({styleValue:"#*"})`. Bind any that equal a canon token. What's left is real drift and should match the DOM probe.
6. **Patterns and state matrix.** One layout per screen type at 1280 and 375, cloned from the pulls. The matrix covers zero data, no results, loading, error, one item, many with long names, read-only and offline. Zero data and no results must look different.

## Stage 3: Design, build, review
| Step | Who |
|---|---|
| Design, walk, review | Claude Opus 5.5 at max effort (Fable 5.1 for a new pattern or a large flow). Never a smaller model. |
| Build, fix | Codex: `codex exec -m gpt-6.1-sol` |
| Gate A, Gate B | A person |

1. **Prepare.**
   - Mobbin (if connected): one search per step with `output_tool: "Paper"`. Take the move, not the look, and cite each `mobbin_url`.
   - Write a story file with exact names, numbers, dates and product decisions. Every designer reads it.
   - Create the prototype page once, before starting designers.
2. **Design.** One designer per part of the flow, each with its own row and a hard stop time. Paste this into every brief:
   ```
   RULES (non-negotiable)
   - Their layout: clone the live sidebar, header, rows and composer, and buttons, toggles, selects,
     notices and cards from "00 System" (<x-paper-clone node-id=…/>), then set_text_content.
     Check every original string was replaced.
   - Their type: every text layer uses var(--font-sans) (or --font-serif / --font-display where the live
     product does). Never a font name. Copy size, weight, line height and color from the live element.
   - Word budget: title <= 4 words; one supporting line <= 8; rows are a name plus a 2-4 word fact;
     dialogs about 20-25 words.
   - Nothing decorative: no subtitles, tags, pills, badges, chips, status or active dots, step labels,
     captions under buttons, or labels on artboards. Status is wording plus text color.
   - One primary per view. A disabled primary is the ink fill at opacity 0.5.
   - Creative inside the system: new components only from tokens and live primitives.
   - Every state (zero, no results, loading, error, extremes, read-only, working, blocked, offline)
     at 1280 and 375.
   - Name artboards "B1 · <screen> · desktop 1280 (opus-5-5)".
   ```
3. **Review before Gate A.** Never accept a designer's own report. Compare each artboard with the live page it extends and cut until it has no more words or boxes. Run the font audit. Find leftover clone text and banned elements. Fix small things yourself; send bigger cuts back as exact instructions.
4. **Gate A.** A person approves the pattern, every state, the copy and one primary per view, in a Paper comment. Nothing is built before this.
5. **Build.** `codex exec -m gpt-6.1-sol -c model_reasoning_effort="high" -o build-report.md "Implement Paper frame group <link> exactly. Read values with get_jsx/get_computed_styles, never screenshots. Use the product's components and tokens only. Run lint and tests." < /dev/null`
6. **Walk it as a user** (the Opus that designed it): browser-use on the preview at 1280 and 768; iOS Safari through serve-sim at 375 with real taps and typing. Reach every state and run the DOM probe in each (`examples/creao/tools/creao-ui-probe.js`).
7. **Gate B.** List every state × width where the build differs from the frame or the frame missed something, redesign each gap next to the original, and have the person approve, reject or defer each one. Codex fixes the approved ones; walk again until the probe shows zero `fail`.

PR description: `Pattern:`, `Paper:`, `Design model:`, `Inspiration:`, `Gate A:`, `Walk report:`, `Gate B:`.

## When it fails
| Symptom | Fix |
|---|---|
| `No CDP endpoint found` | Allow `chrome://inspect/#remote-debugging`, or start the browser with `--remote-debugging-port=9222`, or pass `--cdp`. |
| An import hangs, then times out | Already one fresh tab per import. Rerun just that route. |
| "Open a Paper file to use this tool" | Too many writers at once. Run fewer; rerun the route. |
| Refuses to start: free disk | Free space, then import in smaller batches. |

## Done when
- [ ] Every rendering route × {1280, 375} is on "Live screens"; redirects and 404s are in the report.
- [ ] `get_tokens` matches the canon, and "00 System" holds tokens, components × states, patterns and the state matrix with no overlaps.
- [ ] No literal font family is left; literal colors equal the probe's drift list.
- [ ] Gate A and Gate B are recorded, and the probe shows zero `fail` on every state × width.
- [ ] No scratch artboards or pages are left.
