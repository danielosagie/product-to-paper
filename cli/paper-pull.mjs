#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { args, run, isMain, httpUrl, widthValue } from './lib/cli.mjs';
import { connectPaper, ensurePage } from './lib/paper.mjs';
import { connectBrowser } from './lib/browser.mjs';
import { checkResources } from './lib/resources.mjs';
import { validateSpecs } from './lib/elements.mjs';
import { importJob, importName } from './lib/import.mjs';
import { scanRoutes } from './lib/scan.mjs';
export const HELP = `Usage:
  paper-pull <url ...>
  paper-pull --base <url> --routes routes.txt
  paper-pull --scan --base <url> [--bundle <js url or file>]
  paper-pull --base <url> --spec elements.json

Options:
  --cdp <ws or http url>       Existing Chromium debug endpoint (or PAPER_PULL_CDP)
  --file <id>                 Paper file ID (or PAPER_FILE_ID; required)
  --widths 1280,375            Capture widths (default: 1280)
  --page <name>               Paper page (default: Live screens; spec: Components)
  --signed-in-text <text>     Require this visible text; never signs in
  --max <number>              Maximum new imports or scan visits (default: 10)
  --force                    Run even when free disk is under 5 GB
  --dry-run                  List planned imports/scan without writes
  --help, -h                 Show this help

Install Paper Snapshot in any local Chromium profile; it need not be enabled
in the debugged browser. Every serialization uses a fresh background tab.
Element picks are trusted JavaScript expressions returning a DOM Element.`;
export function parseRoutes(text) { return text.split(/\r?\n/).map(s => s.trim()).filter(s => s && !s.startsWith('#')); }
function routeUrl(route, base) {
  const url = httpUrl(new URL(route, base).href);
  if (url.origin !== base.origin) throw new Error('Routes must stay on --base origin.');
  return url.href;
}
export async function main() {
  const { values: v, positionals } = args({ base: { type: 'string' }, routes: { type: 'string' }, scan: { type: 'boolean' }, bundle: { type: 'string' }, spec: { type: 'string' }, widths: { type: 'string', default: '1280' }, page: { type: 'string' }, cdp: { type: 'string' }, max: { type: 'string', default: '10' }, force: { type: 'boolean' }, 'dry-run': { type: 'boolean' }, 'signed-in-text': { type: 'string' } });
  if (v.help) return console.log(HELP);
  const modes = Number(!!positionals.length) + Number(!!v.routes) + Number(!!v.scan) + Number(!!v.spec);
  if (modes !== 1) throw new Error('Choose exactly one mode: URLs, --routes, --scan, or --spec. Use --help.');
  if ((v.routes || v.spec || v.scan) && !v.base) throw new Error('--base is required for --routes, --spec, or --scan.');
  if (v.bundle && !v.scan) throw new Error('--bundle requires --scan.');
  if (positionals.length && v.base) throw new Error('Use positional URLs without --base.');
  const max = Number(v.max);
  if (!Number.isInteger(max) || max < 1) throw new Error('--max must be a positive integer.');
  const widths = [...new Set(v.widths.split(',').map(widthValue))];
  const base = v.base ? httpUrl(v.base) : null;
  const pageName = v.page || (v.spec ? 'Components' : 'Live screens');
  if (!pageName.trim()) throw new Error('--page must not be empty.');
  const jobs = [];
  if (v.spec) {
    const specs = validateSpecs(JSON.parse(await readFile(v.spec, 'utf8')));
    for (const spec of specs) for (const width of widths) for (const state of new Set(spec.states || ['default'])) jobs.push({ url: routeUrl(spec.route, base), width, spec, state });
  } else if (!v.scan) {
    const urls = v.routes ? parseRoutes(await readFile(v.routes, 'utf8')).map(route => routeUrl(route, base)) : positionals.map(value => httpUrl(value).href);
    for (const url of new Set(urls)) for (const width of widths) jobs.push({ url, width });
  }
  let paper, connection;
  try {
    paper = await connectPaper({ fileId: v.file });
    checkResources(v.force);
    if (v.scan) {
      if (v['dry-run']) { console.log(`Would scan ${base.href}, up to ${max} routes, and write routes.txt`); return []; }
      connection = await connectBrowser(v.cdp);
      const scanned = await scanRoutes(base.href, { bundle: v.bundle, connection, max, signedInText: v['signed-in-text'] });
      connection.assertConnected();
      return scanned;
    }
    const info = await paper.call('get_basic_info');
    const existingPage = info.pages.find(p => p.name === pageName);
    const existing = new Set(existingPage ? (await paper.call('get_basic_info', { pageId: existingPage.id })).artboards.map(a => a.name) : []);
    const selected = [];
    for (const job of jobs) {
      const name = importName(job);
      if (existing.has(name)) { console.error(`Skip already imported: ${name}`); continue; }
      existing.add(name);
      if (selected.length >= max) break;
      selected.push(job);
    }
    if (v['dry-run']) { selected.forEach(job => console.log(`Would import: ${importName(job)} → ${pageName}`)); return []; }
    if (!selected.length) { console.log('No new imports.'); return []; }
    connection = await connectBrowser(v.cdp);
    const pageId = existingPage?.id || await ensurePage(paper, pageName);
    const results = [];
    for (const job of selected) {
      connection.assertConnected();
      results.push(await importJob(job, { paper, pageId, connection, signedInText: v['signed-in-text'] }));
    }
    connection.assertConnected();
    return results;
  } finally {
    if (connection) await connection.close();
    if (paper) await paper.close();
  }
}
if (isMain(import.meta.url)) await run(main);
