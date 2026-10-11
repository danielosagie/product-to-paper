# paper-pull

One CLI for importing live pages and selected elements into Paper as editable,
token-bound layers. Requires Node 20+, Paper Desktop, and the Paper Snapshot
extension installed in any local Chromium profile.

```sh
npm install
npm link
paper-pull https://example.com/ --file <paper-file-id>
paper-pull --base https://example.com --routes routes.txt --widths 1280,375 --file <id>
paper-pull --scan --base https://example.com --max 5 --file <id>
paper-pull --base https://example.com --spec elements.example.json --file <id>
```

Set `PAPER_FILE_ID` instead of passing `--file`. `--page` defaults to `Live screens`
for pages and `Components` for elements. `--max` defaults to 10 new artboards;
already imported names on that page are skipped. Use `--dry-run` to inspect the
plan without creating tabs or Paper nodes. Route files accept one path per line,
blank lines, and `#` comment lines. Routes must remain on the base origin.

Connect to an already running Chromium browser with remote debugging enabled.
The CLI reads `DevToolsActivePort` from common macOS Chromium user-data directories.
Override discovery with `--cdp http://127.0.0.1:9222` or `PAPER_PULL_CDP` (HTTP or
WebSocket URL). It creates targets with `background:true`, never activates them,
and closes only its own targets in `finally`. Closing the client disconnects it
without quitting Chromium. Existing user tabs are never navigated or closed.

If discovery fails:

> Chrome: open chrome://inspect/#remote-debugging and allow, or start it with
> --remote-debugging-port=9222. Then rerun, or pass --cdp.

The extension need not be enabled in the connected browser: its installed
serializer is read from disk. `PAPER_SNAPSHOT_DIR` can identify an extension
version directory. `PAPER_MCP_URL` overrides the local Paper MCP endpoint.

Every serialization uses a fresh tab and an isolated world, disables focus
emulation, and temporarily substitutes a 16 ms timer for animation frames.
Measured grid tracks and item widths preserve Chromium’s column sizing during
Paper import. Pages expand scrolling panes, preserve line clamps, hide accessibility-only
copy, materialize lazy media, and inline SVG images when possible. The tab is
closed before importing into Paper.

Element specs contain `name`, `route`, `pick`, and optional `states`. A pick is a
trusted JavaScript expression returning one DOM element. Edit the text in
`elements.example.json` to match your site. Supported states are `default`,
`hover`, `focus-visible`, `active`, and `disabled`; each gets its own fresh tab
and artboard. Pseudo states are forced over CDP, while disabled also sets DOM
attributes. `--signed-in-text` requires visible body text before capture; the
CLI never signs in or reads credentials.

`--scan` visits paths found in a supplied JavaScript bundle's `path:"..."`
properties. `--bundle` accepts a public URL or a local JS file. Without a bundle,
it discovers same-origin page links and script bundles. Static routes are
classified as render, redirect, 404, or other HTTP error; parameterized routes
are excluded. It writes rendering paths to `routes.txt`, with redirects and 404s
reported on stdout. Scanning does not create artboards.

The resource preflight refuses to start with less than 5 GB of free disk, because
swap filled the disk mid-run on a 16 GB Mac. `--force` overrides it. Paper connectivity and the requested
file are checked once before starting.

Values bind against current Paper tokens at import time: colors, font sizes,
weights, radius, spacing, and matching font families. After HTML import, matching
literal text colors and font families are rebound within the new artboard,
including beyond Paper's 200-match search cap. Foreign fonts and values with no
matching token remain unchanged.

Each successful import verifies artboard dimensions and editable Text nodes,
then prints:

```text
<name> · <nodes> nodes · <bound%> bound · drift: <top literal values>
```

The percentage is the share of visible, eligible serialized style declarations
that matched live tokens, not a pixel-fidelity score. Inherited/inert typography,
invisible borders, transparent colors, and zero spacing do not inflate drift.
Timings and post-import rebind counts are written to stderr. Failed partial
artboards are removed so retries cannot mistake them for completed imports.

Run `npm start` for command help and `npm test` for regression checks.
