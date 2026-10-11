# paper-pull validation

Completed October 11, 2026, before the 30-minute stop (started 16:09:19 PDT).

The package now exposes one executable, `paper-pull`, using `playwright-core` and `acorn`. It connects to an existing Chromium CDP endpoint, creates background targets, and closes its own targets. All legacy executables were removed. The original BRIEF.md was retained as supplied.

The live tests used the specified Paper file and `zz paper-pull test` page, the public marketing site, and the existing Chrome remote-debugging endpoint discovered from DevToolsActivePort. No login, credential access, foreground activation, or temporary browser launch was used. No --force override was used.

## Final live import results

| Import | Nodes | Text nodes | Bound | Capture/import time | Rebound text colors |
|---|---:|---:|---:|---:|---:|
| Home, 1280 | 1291 | 357 | 44% | 36.51 s | 116 |
| Pricing, 375 | 636 | 131 | 35% | 26.09 s | 24 |
| Public button · default | 3 | 1 | 55% | 5.37 s | 1 |
| Public button · hover | 3 | 1 | 55% | 4.91 s | 1 |
| Public card · default | 9 | 3 | 50% | 4.96 s | 2 |

Total: 1942 imported nodes, including 493 editable Text nodes, across five test artboards. Font rebinding found no remaining matching literal fonts. Foreign fonts remained unchanged.

Bound percentages measure visible eligible serialized declarations matching the live Paper tokens, rather than pixel fidelity. Timings above are those printed by the CLI and exclude its initial connection/preflight setup.

## Drift lines

- **https://creao.ai/ · 1280 · full page**: color: rgb(108, 112, 116), font-size: 15px, color: rgb(60, 64, 67), font-size: 10px, border-top-color: rgba(20, 24, 26, 0.14)
- **https://creao.ai/pricing · 375 · full page**: column-gap: 9px, row-gap: 9px, font-size: 12.5px, margin-top: 3px, background-color: rgb(255, 255, 255)
- **Public button · https://creao.ai/ · 1280 · default**: border-top-color: rgba(20, 24, 26, 0.14), font-size: 15px, padding-bottom: 13px, padding-top: 13px, background-color: rgb(255, 255, 255)
- **Public button · https://creao.ai/ · 1280 · hover**: border-top-color: rgba(20, 24, 26, 0.14), font-size: 15px, padding-bottom: 13px, padding-top: 13px, background-color: rgb(255, 255, 255)
- **Public card · https://creao.ai/ · 1280 · default**: background-color: rgb(244, 235, 233), padding-left: 20px, padding-right: 20px, padding-top: 18px, font-weight: 800

## Scan and repeated runs

The actual CLI invocation `--scan --base https://creao.ai/ --max 5` exited 0 in 20.98 seconds and wrote routes.txt. All five visited routes rendered; none redirected or returned 404:

```text
/ · render
/video-studio · render
/integrations · render
/blog/we-built-an-agent-platform.-then-the-agents-rebuilt-it. · render
/blog/the-self-healing-agent-harness · render
```

A repeated --spec invocation skipped all three existing artboard names, printed `No new imports.`, and exited 0 in 0.403 seconds.

A separate shared-connection integration batch also scanned five public routes and verified that every existing Chrome page retained its target ID and URL, with zero owned capture targets left open.

## Visual review and fixes

The button and card screenshots preserve readable typography, spacing, contrast, alignment, and artboard fit. Full-page screenshots contain the page sections through the footer.

Live testing exposed two issues that were corrected: selecting elements before the CDP DOM agent had settled could yield an invalid node ID; the capture now enables the agents first and re-picks a bounded number of times before serialization. Paper also recalculated fractional grid columns without Chromium’s min-content sizing; the capture now preserves measured grid tracks and item widths.

On mobile pricing, the source enterprise heading was 126.516 px wide within a 238.516 px grid item. Applying the grid fix left those source dimensions unchanged and removed the additional narrow-word wrapping in the Paper import. The source page itself still has a narrow mobile enterprise section. Font metrics and line wrapping can differ between Chromium and Paper; pixel fidelity was not measured.

[Desktop screenshot](images/paper-pull-validation-desktop.png) · [Mobile screenshot](images/paper-pull-validation-mobile.png)

## Validation and cleanup

- npm test: 8 regression checks passed, including token alias handling, foreign-font preservation, rebinding beyond the 200-match cap, bounded binding failure, input validation, endpoint validation, and MCP cleanup after wrong-file preflight.
- npm start: executed successfully and displayed the single-command help.
- npm pack --dry-run: package contains only the intended executable, libraries, examples, and documentation.
- Product CLI files and dependencies contain no legacy browser-extension automation references or user-specific paths/marketing-site identifiers. The supplied BRIEF.md is excluded from this product-code check.
- The resource check refused runs below 1000 MB free swap and recovered without an override. CDP failures printed the attempted endpoint and the required remote-debugging instructions.
- Every test artboard created in all batches was deleted. Final get_basic_info on the test page confirmed zero artboards. Paper and the user’s existing Chrome tabs remained open.
