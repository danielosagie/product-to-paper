import test from 'node:test';
import assert from 'node:assert/strict';
import { tokenValues, fontTokens } from '../lib/tokens.mjs';
import { tokenize } from '../lib/tokenize.mjs';
import { bindLiteral } from '../lib/rebind.mjs';
import { discoverEndpoints, DEBUG_HELP } from '../lib/browser.mjs';
import { bundleRoutes } from '../lib/scan.mjs';
import { validateSpecs } from '../lib/elements.mjs';
import { parseRoutes } from '../paper-pull.mjs';

test('aliases resolve transitively and cycles fail', () => {
  assert.equal(tokenValues(':root { --color-a: #16181a; --color-b: var(--color-a); --color-c: var(--color-b); }')['--color-c'], '#16181a');
  assert.throws(() => tokenValues('--a: var(--b); --b: var(--a);'), /Unresolvable/);
});
test('live token binding preserves foreign fonts and off-token values', () => {
  const css = '--color-grey: #16181a; --color-foreground: var(--color-grey); --font-sans: Example Sans; --text-base: 16px; --font-weight-normal: 400; --radius-md: 6px; --spacing-2: 8px;';
  const source = '<div style="color: rgb(22, 24, 26); font-family: &quot;Example Sans&quot;, sans-serif; font-size: 16px; font-weight: 400; border-radius: 6px; padding: 8px;">Hello</div><p style="font-family: Foreign Serif; color: rgb(255, 0, 0);">Evidence</p>';
  const { html, report } = tokenize(source, css);
  for (const name of ['--color-foreground', '--font-sans', '--text-base', '--font-weight-normal', '--radius-md', '--spacing-2']) assert.ok(html.includes(`var(${name})`));
  assert.ok(html.includes('Foreign Serif'));
  assert.ok(html.includes('rgb(255, 0, 0)'));
  assert.equal(report.bound, 6);
  assert.equal(report.drift, 2);
  assert.equal(fontTokens(css).map.get('example sans'), '--font-sans');
});
test('inert inherited styles and transparent colors do not inflate drift', () => {
  const { report } = tokenize('<div style="font-family: Foreign; color: rgb(255,0,0); border-top-color: rgb(255,0,0); border-top-width: 0px; border-top-style: solid; background-color: rgba(0,0,0,0); padding: 0px;"><span style="font-size: 17px;">Text</span></div>', '--text-base:16px;');
  assert.equal(report.bound, 0);
  assert.equal(report.drift, 1);
});
test('post-import binding reaches literals hidden behind 200 token matches', async () => {
  const groups = ['a', 'b', 'c'];
  const nodes = Array.from({ length: 451 }, (_, i) => ({ id: String(i), component: 'Text', group: groups[Math.floor(i / 200)], value: i < 200 ? 'var(--color-foreground)' : '#16181a' }));
  const paper = { async call(name, args) {
    if (name === 'find_nodes') return { nodes: nodes.filter(n => args.nodeId === 'root' || n.group === args.nodeId || n.id === args.nodeId).slice(0, 200).map(n => ({ ...n, matched: [{ styleName: 'color', styleValue: n.value }] })) };
    if (name === 'get_children') return { children: args.nodeId === 'root' ? groups.map(id => ({ id })) : nodes.filter(n => n.group === args.nodeId).map(n => ({ id: n.id })) };
    if (name === 'update_styles') { for (const update of args.updates) for (const id of update.nodeIds) nodes.find(n => n.id === id).value = update.styles.color; return {}; }
    throw new Error(name);
  } };
  assert.equal(await bindLiteral(paper, 'root', 'color', '#16181a', '--color-foreground', true), 251);
  assert.ok(nodes.every(n => n.value === 'var(--color-foreground)'));
});
test('a failed Paper binding cannot loop forever', async () => {
  const paper = { async call(name) {
    if (name === 'find_nodes') return { nodes: [{ id: 'x', component: 'Text', matched: [{ styleName: 'color', styleValue: '#16181a' }] }] };
    return {};
  } };
  await assert.rejects(bindLiteral(paper, 'root', 'color', '#16181a', '--color-foreground'), /did not retain/);
});
test('route and element inputs reject ambiguous or invalid values', () => {
  assert.deepEqual(parseRoutes('# comment\r\n/\r\n\r\n/pricing\n'), ['/', '/pricing']);
  assert.deepEqual(bundleRoutes('path:"/",path:"/a",path:"/a",path:"/user/:id",path:"/*",path:"relative"'), ['/', '/a']);
  assert.throws(() => validateSpecs([{ name: 'Button', route: '/', pick: 'document.body', states: ['invalid'] }]), /States/);
  assert.throws(() => validateSpecs([]), /non-empty/);
});
test('explicit CDP endpoints bypass discovery, and help is exact', async () => {
  assert.deepEqual(await discoverEndpoints('http://127.0.0.1:9222'), ['http://127.0.0.1:9222/']);
  assert.deepEqual(await discoverEndpoints('ws://127.0.0.1:9222/devtools/browser/example'), ['ws://127.0.0.1:9222/devtools/browser/example']);
  await assert.rejects(discoverEndpoints('file:///tmp/debug'), /HTTP/);
  assert.equal(DEBUG_HELP, 'Chrome: open chrome://inspect/#remote-debugging and allow, or start it with\n--remote-debugging-port=9222. Then rerun, or pass --cdp.');
});

test('failed Paper file preflight closes its MCP session', async () => {
  const { createServer } = await import('node:http');
  const { connectPaper } = await import('../lib/paper.mjs');
  let deleted = false;
  const server = createServer(async (req, res) => {
    if (req.method === 'DELETE') { deleted = true; res.writeHead(200).end(); return; }
    let text = ''; for await (const part of req) text += part;
    const request = JSON.parse(text);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('mcp-session-id', 'unit-test-session');
    if (!request.id) { res.writeHead(202).end(); return; }
    res.end(JSON.stringify({ jsonrpc: '2.0', id: request.id, result: request.method === 'initialize' ? { protocolVersion: '2024-11-05', capabilities: {}, serverInfo: { name: 'test', version: '1' } } : { content: [{ type: 'text', text: JSON.stringify({ file: { id: 'wrong-file' } }) }] } }));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    await assert.rejects(connectPaper({ fileId: 'requested-file', endpoint: `http://127.0.0.1:${server.address().port}/mcp` }), /Wrong Paper file/);
    assert.equal(deleted, true);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
