---
name: pull-live
description: Pull a live web product into Paper as editable, token-bound layers (every route at desktop and mobile widths), never screenshots, using paper-pull, which runs the Paper Snapshot import over plain CDP (the same browser session browser-use uses) in background tabs. Use before redesigning, auditing or building on an existing product.
---

# pull-live

`paper-pull` below is `npx -y github:danielosagie/product-to-paper pull` (installed by `npx github:danielosagie/product-to-paper`).

The result is a Paper page, "Live screens", holding every real route at 1280 and 375. Each one is full height, editable and bound to the product's tokens.

## Preflight (stop if any fails)
1. Paper desktop is open with the target file, and `PAPER_FILE_ID` is set.
2. The browser is signed in to the product and has remote debugging on. In Chrome, use `chrome://inspect/#remote-debugging`, or a session browser-use already attached to. `paper-pull` finds it from the browser's `DevToolsActivePort`; otherwise pass `--cdp http://127.0.0.1:9222`.
3. Nobody else is automating that browser right now.
4. `paper-pull` refuses to start with less than 5 GB of free disk, because swap filled the disk mid-run on a 16 GB Mac. Don't override that with `--force` while a screen recorder or other heavy app is running.

## 1. Find every route
```bash
paper-pull --scan --base https://app.example.com --bundle https://app.example.com/assets/index-XXXX.js
```
- The bundle's router lists every path. `--scan` visits each one and writes `routes.txt` with the ones that **render**. Paths that **redirect** (feature-flagged off for this account) or **404** are listed separately.
- Put the redirects in your report; never drop them silently.
- Creao: about 35 paths, of which 21 render and 8 redirect to `/chat`.

## 2. Import
```bash
paper-pull --base https://app.example.com --routes routes.txt --widths 1280,375 --max 10 --signed-in-text "Settings"
```
- Run it again for the next batch; already-imported routes are skipped.
- `--signed-in-text` is text that only shows when you're signed in. The import stops without it. It never signs in for you.
- Each import prints one line: `<name> · <nodes> nodes · <bound%> bound · drift: <values that matched no token>`. That drift line is the product's real off-system values.

## 3. Check the result (yourself, with Paper MCP)
- **Size:** `get_basic_info(pageId)`. Every artboard has non-zero width and height.
- **Looks:** `get_screenshot` on one artboard per width, next to the live page. Expect text anti-aliasing differences only. Creao `/apps` measured 0.36% of pixels off.
- **Values:** `find_nodes` for a value you know is on the page. On Creao's Agents page, `borderRadius 10px` returned exactly the one view toggle the DOM probe found.

## Rules
- **Editable layers only.** If a page won't import, report it. Never fall back to a screenshot.
- **Background only.**
  - No full-screen control, OS keystrokes or bringing apps forward.
  - On the Creao run, taking over the screen paused a screen recorder.
  - The extension's toolbar button can't be clicked headlessly, so `paper-pull` runs its serializer over CDP in background tabs it creates and closes itself.
- **Never sign in for the user.** Never read cookies, credentials or `.env` files.
- **Foreign fonts on a live pull are evidence.** Don't rebind them. Creao's marketing site uses Inter and Frank Ruhl Libre while the app uses Instrument Sans and EB Garamond.

## When it fails

| Symptom | Cause | Fix |
|---|---|---|
| An import hangs, then times out | Hidden tabs get throttled the longer they work | Already handled: one fresh tab per import. If it persists, rerun just that route. |
| `No CDP endpoint found` | Remote debugging is off | Chrome: `chrome://inspect/#remote-debugging`, or start it with `--remote-debugging-port=9222`. Then rerun, or pass `--cdp`. |
| Page far taller than live | Line-clamped text unclamped | Already handled (clamps kept). Report it if you see it. |
| "Open a Paper file to use this tool" | Paper lost its active file while several writers ran | Run fewer writers; rerun the route |
| "No space left on device" | Swap filled the disk | Stop. Free memory, then import in smaller batches. |

## Done when
- [ ] Every rendering route × {1280, 375} has a full-page artboard on "Live screens".
- [ ] Redirects and 404s are listed in your report.
- [ ] One artboard per width has been compared with live.
- [ ] No test or scratch artboards are left behind.
