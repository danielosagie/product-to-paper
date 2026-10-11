import { parseArgs } from 'node:util';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
export const isMain = url => process.argv[1] && resolve(process.argv[1]) === fileURLToPath(url);
export function args(options = {}) { return parseArgs({ allowPositionals: true, options: { file: { type: 'string' }, help: { type: 'boolean', short: 'h' }, ...options } }); }
export async function run(fn) { try { await fn(); } catch (e) { console.error(e.message); process.exitCode = 1; } }
export function httpUrl(value) { const url = new URL(value); if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Use an HTTP(S) URL.'); return url; }
export function widthValue(value) { const n = Number(value); if (!Number.isInteger(n) || n < 320 || n > 4096) throw new Error('Width must be an integer from 320 to 4096.'); return n; }
export const escapeHtml = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
