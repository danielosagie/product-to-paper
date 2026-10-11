#!/usr/bin/env node
// creao-check: static half of the Creao design gate (design-system-guideline.md, section 8).
//   node creao-check.mjs --diff --cached            only lines added in this commit, limit zero (pre-commit)
//   node creao-check.mjs --diff origin/main...HEAD  only lines added by this PR, limit zero (CI)
//   node creao-check.mjs --src src/                 whole-tree count against the ratchet baseline (CI)
//   node creao-check.mjs --css dist/assets/index.css census the shipped bundle against the ratchet baseline
//   add --write-baseline to record today's counts; counts may only go down after that.
// Zero dependencies. Exit 1 on any new violation. Messages name the rule, the limit, the ask and the fix,
// because the reader of a failure is usually a coding agent.
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { execFileSync } from 'node:child_process';

const SRC_GLOBS = ['*.tsx', '*.ts', '*.jsx', '*.js', '*.mdx'];

const PALETTE = 'red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone';
const COLOR_UTIL = 'bg|text|border|ring|fill|stroke|from|to|via|outline|divide|decoration|placeholder|caret|accent|shadow';
const RULES = [
  { id: 'T1', name: 'type-scale', re: /(?<![\w-])text-\[\d+(?:\.\d+)?(?:px|rem|em)\]/g,
    fix: 'use text-xs|sm|base|lg|xl|2xl|3xl|4xl (12/14/16/18/20/24/30/36px)' },
  { id: 'T2', name: 'color-token', re: new RegExp(`(?<![\\w-])(?:${COLOR_UTIL})-(?:(?:${PALETTE})-\\d{2,3}|\\[(?:#|rgb|hsl|oklch|color-mix)[^\\]]*\\])(?:\\/\\d+)?`, 'g'),
    fix: 'use a canon semantic token (bg-surface, text-muted-foreground, border-border, text-destructive, bg-success, ...)' },
  { id: 'T3', name: 'radius-scale', re: /(?<![\w-])rounded(?:-[trblse]{1,2})?-\[[^\]]+\]/g,
    fix: 'use rounded-sm|md|lg|xl|2xl|3xl|full (4/6/8/12/16/24px)' },
  { id: 'T5', name: 'font-weight', re: /(?<![\w-])font-\[\d+\]/g, fix: 'use font-normal|medium|semibold (400/500/600)' },
  { id: 'T7', name: 'motion-token', re: /(?<![\w-])(?:duration|ease|delay)-\[[^\]]+\]/g,
    fix: 'use duration-150|200|300 with ease-out (enter) or ease-in-out (move)' },
  { id: 'T8', name: 'elevation-token', re: /(?<![\w-])shadow-\[[^\]]+\]/g, fix: 'use shadow-xs (controls), shadow-card-hover (cards), shadow-lg (popovers/dialogs)' },
  { id: 'T9', name: 'z-layer', re: /(?<![\w-])-?z-\[[^\]]+\]/g, fix: 'use z-10 (sticky) z-20 (header) z-30 (drawer) z-40 (popover) z-50 (dialog/toast)' },
  { id: 'T10', name: 'spacing-scale', re: /(?<![\w-])-?(?:p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|gap|gap-x|gap-y|space-x|space-y)-\[\d+(?:\.\d+)?px\]/g,
    fix: 'use the 4px scale: 1 2 3 4 6 8 12 (4..48px)' },
  { id: 'T4', name: 'font-family', re: /(?<![\w-])font-(?:ox-ui|ox-mono|ui-fallback|\[(?!\d)[^\]]+\])/g, fix: 'use font-sans|display|serif|mono|data' },
];
const ALLOW = /creao-allow\s+(T\d+|L\d+|A\d+)\s*:\s*\S/; // inline exception: // creao-allow T2: brand illustration, DS-123

const fmt = (r, where, value) => `${where}  ${r.id} ${r.name}: "${value}" is off the canon. Limit: canon tokens only. Fix: ${r.fix}.`;

function walk(dir, out = []) {
  for (const f of readdirSync(dir)) {
    if (f === 'node_modules' || f.startsWith('.')) continue;
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (['.tsx', '.ts', '.jsx', '.js', '.mdx'].includes(extname(p))) out.push(p);
  }
  return out;
}

function scanSrc(dir) {
  const hits = [];
  for (const file of walk(dir)) {
    readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
      if (ALLOW.test(line)) return;
      for (const r of RULES) for (const m of line.matchAll(r.re)) hits.push({ rule: r, where: `${file}:${i + 1}`, value: m[0] });
    });
  }
  return hits;
}

function censusCss(file) {
  const css = readFileSync(file, 'utf8');
  const classes = new Set([...css.matchAll(/\.((?:[a-zA-Z0-9_-]|\\.)+)(?=[\s,{:>[.)~+])/g)].map((m) => m[1].replace(/\\/g, '').split(':').pop().replace(/^!/, '')));
  const counts = {};
  const examples = {};
  for (const r of RULES) {
    const re = new RegExp(`^${r.re.source.replace('(?<![\\w-])', '')}$`);
    const found = [...classes].filter((c) => re.test(c));
    counts[`${r.id} ${r.name}`] = found.length;
    examples[`${r.id} ${r.name}`] = found.slice(0, 8);
  }
  return { counts, examples };
}

const args = process.argv.slice(2);
const flag = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const baselinePath = flag('--baseline') || '.creao-baseline.json';
const baseline = existsSync(baselinePath) ? JSON.parse(readFileSync(baselinePath, 'utf8') || '{}') : {};
let failed = false;

// --diff <git range>: only lines this change adds are checked, against a limit of zero.
// Pre-commit: --diff --cached   CI: --diff origin/main...HEAD
if (flag('--diff')) {
  const out = execFileSync('git', ['diff', '-U0', ...flag('--diff').split(' '), '--', ...SRC_GLOBS], { encoding: 'utf8' });
  let file = null, line = 0;
  const hits = [];
  for (const l of out.split('\n')) {
    if (l.startsWith('+++ ')) file = l.slice(6);
    else if (l.startsWith('@@')) line = Number(l.match(/\+(\d+)/)[1]);
    else if (l.startsWith('+') && file) {
      const text = l.slice(1);
      if (!ALLOW.test(text)) for (const r of RULES) for (const m of text.matchAll(r.re)) hits.push({ rule: r, where: `${file}:${line}`, value: m[0] });
      line += 1;
    }
  }
  for (const h of hits) console.error('FAIL ' + fmt(h.rule, h.where, h.value));
  if (hits.length) failed = true;
  console.log(`diff: ${hits.length} off-canon class uses added`);
}

if (flag('--src')) {
  const hits = scanSrc(flag('--src'));
  const byRule = {};
  for (const h of hits) byRule[`${h.rule.id} ${h.rule.name}`] = (byRule[`${h.rule.id} ${h.rule.name}`] || 0) + 1;
  for (const [k, n] of Object.entries(byRule)) {
    const limit = baseline.src?.[k] ?? 0;
    if (n > limit) {
      failed = true;
      console.error(`FAIL ${k}: ${n} uses, ratchet limit ${limit} (asked for ${n - limit} more). New ones:`);
      hits.filter((h) => `${h.rule.id} ${h.rule.name}` === k).slice(-(n - limit)).forEach((h) => console.error('  ' + fmt(h.rule, h.where, h.value)));
    }
  }
  if (args.includes('--write-baseline')) baseline.src = byRule;
  console.log(`src: ${hits.length} off-canon class uses across ${Object.keys(byRule).length} rules`);
}

if (flag('--css')) {
  const { counts, examples } = censusCss(flag('--css'));
  for (const [k, n] of Object.entries(counts)) {
    const limit = baseline.css?.[k];
    const status = limit === undefined ? 'new' : n > limit ? 'FAIL' : n < limit ? 'down' : 'ok';
    if (status === 'FAIL') failed = true;
    console.log(`${status.padEnd(4)} ${k.padEnd(20)} ${String(n).padStart(4)}${limit !== undefined ? ` (limit ${limit})` : ''}  e.g. ${examples[k].slice(0, 5).join(' ')}`);
  }
  if (args.includes('--write-baseline')) baseline.css = counts;
}

if (args.includes('--write-baseline')) writeFileSync(baselinePath, JSON.stringify(baseline, null, 2) + '\n');
process.exit(failed ? 1 : 0);
