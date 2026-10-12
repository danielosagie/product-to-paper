---
name: build-system
description: Build a product's design system in Paper from what actually ships. Pull its tokens from the production CSS, pick the canon, import the real components and their states with paper-pull, make sure every layer is bound to a token, and lay out components, layout patterns and a state matrix on one System page. Use once per product, and again when its theme or components change.
---

# build-system

`paper-pull` below is `npx -y github:danielosagie/product-to-paper pull` (installed by `npx github:danielosagie/product-to-paper`).

The result is one Paper page, **"00 System"**, where every layer is bound to a token. It holds:
- the token sheet,
- the live components in each of their states,
- the layout patterns,
- the state matrix.

Run `pull-live` first; the patterns are built from its pages.

## 1. Pull the tokens from production
```bash
curl -s https://app.example.com/ | grep -o '/assets/index-[^"]*\.css'
curl -s -o index.css https://app.example.com/assets/<that file>
```
- Tailwind v4 keeps every token in `@layer theme{…}`. With repo access, read the stylesheet that declares `@theme`.

## 2. Pick the canon
1. **One token per value.** Same-value aliases collapse into one name. Creao had `surface` = `card` = `popover` = `embedded-card` = `ox-paper`, all becoming `surface`. Write down the retire map.
2. **One neutral ramp.** Creao defined five grey ramps; keep the brand one.
3. **A missing job gets a token; a missing value does not.** Creao had no warning color, so amber was hard-coded 62 times; add `--color-warning`. Never add a token for 13px.
4. **Fonts are assigned by where the product renders them.** Read `get_computed_styles` on the live pulls: the UI font, the greeting or display font, any mono. Creao defines a DM Mono `--font-data` that no screen uses, so it's left out.

## 3. Push the tokens to Paper (MCP)
- `create_tokens` in order: neutrals, semantic, status, domain. Sizes go smallest first. Aliases go in as `var(--canon)`.
- Every token gets a description with its source and rule, e.g. `"Secondary text. Source: --color-muted-foreground. Never a fill."`
- Draw a "Canon tokens" artboard (swatches, type scale, radius, spacing) using only `var(--token)` values.

## 4. Import the components and their states
```bash
paper-pull --base https://app.example.com --spec elements.json --page "00 System"
```
One spec entry:
```json
{ "name": "Button / primary", "route": "/agents",
  "pick": "[...document.querySelectorAll('button')].find(b => b.innerText.trim() === 'Create agent')",
  "states": ["default", "hover", "focus-visible", "active"] }
```
- **Buttons, tabs, selects:** pick by their exact visible text.
- **Cards, notices, empty states:** pick by their text, then climb to the nearest ancestor with a border or fill (see `examples/creao/components.json`).
- **Composers:** they are often `contenteditable`; pick `[contenteditable="true"]`.
- **Creao:** 52 of 64 variants landed. Misses came from Paper refusing writes while several agents hit it at once, and from pickers that didn't match. Rerun them when Paper is quiet.

## 5. Make sure every layer is bound (MCP, no script)
`paper-pull` binds on the way in, but anything added by hand or by other agents needs this audit.
- **Fonts:** for each literal family on the page, loop:
  1. `find_nodes({pageId, filters:[{styleName:"fontFamily", styleValue:'"Instrument Sans"*'}]})`
  2. `update_styles` on those ids with `fontFamily: "var(--font-sans)"`
  3. Repeat until the search returns nothing.

  Do the same for `system-ui*` and any other family, mapping each one to the font token whose value it is. Anything foreign goes to `--font-sans`.
  - `find_nodes` returns at most 200 matches. Search by literal name; a search for "any font" keeps returning the layers you already fixed.
- **Colors:** `find_nodes({styleValue:"#*"})` lists literal colors. Bind any that equal a canon token. What's left on a pulled component is the product's real drift, and it should match the DOM probe on the same page.
  - Creao `/apps` had 11 left: `sidebar-fg` ×7, `grey-900` ×3, `grey-700` ×1.

## 6. Layout patterns and the state matrix
Hand these to an Opus design agent with the brief block from `design-build-review`: their layout, fonts through tokens, word budget, no decoration.
- **Patterns:** one per screen type (Creao: Chat, Index, Detail, Builder, Settings, Overlay as dialog and sheet) at 1280 and 375, cloned from the live pulls.
- **State matrix:** zero data, no results, loading, error, one item, many items with long names, read-only, offline. Zero data and no results must look different; Creao's mobile Agents page mixed them up.
- **One page:** everything goes on "00 System" below the components, with no overlaps (`move_nodes`, then `update_styles` with `left`/`top`).

## Done when
- [ ] `get_tokens` matches the canon, name for name and value for value, including the fonts.
- [ ] "00 System" holds the token sheet, components (variant × state), patterns and state matrix, with no overlaps.
- [ ] Font audit: no literal font family left on the page.
- [ ] Literal colors on components equal the probe's drift list.
- [ ] Scratch pages are removed. Paper is closed when you're done (memory).
