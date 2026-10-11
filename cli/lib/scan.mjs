import { readFile, writeFile } from 'node:fs/promises';
import { withFreshTab } from './browser.mjs';
import { httpUrl } from './cli.mjs';
export function bundleRoutes(source) {
  return [...new Set([...source.matchAll(/\bpath\s*:\s*(["'`])([^"'`]+)\1/g)].map(m => m[2]).filter(p => p.startsWith('/') && !/[*:]/.test(p)))];
}
const routeKey = url => { const u = new URL(url); return u.origin + (u.pathname.replace(/\/$/, '') || '/') + u.search; };
export async function scanRoutes(base, { bundle, connection, max = 10, signedInText, output = 'routes.txt' } = {}) {
  const origin = httpUrl(base).origin;
  const routes = new Set(['/']);
  const bundles = new Set();
  if (bundle) {
    const source = /^https?:\/\//.test(bundle) ? await fetch(bundle, { signal: AbortSignal.timeout(30000) }).then(r => { if (!r.ok) throw new Error(`Bundle HTTP ${r.status}`); return r.text(); }) : await readFile(bundle, 'utf8');
    bundleRoutes(source).forEach(route => routes.add(route));
  } else {
    await withFreshTab(base, { connection, signedInText }, async ({ page }) => {
      const discovered = await page.evaluate(() => ({ links: [...document.querySelectorAll('a[href]')].map(a => a.href), scripts: [...document.querySelectorAll('script[src]')].map(s => s.src) }));
      for (const link of discovered.links) { const u = new URL(link); if (u.origin === origin && !u.hash) routes.add(u.pathname + u.search); }
      for (const script of discovered.scripts) if (new URL(script).origin === origin) bundles.add(script);
    });
    for (const url of bundles) {
      const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (response.ok) bundleRoutes(await response.text()).forEach(route => routes.add(route));
    }
  }
  const results = [];
  for (const route of routes) {
    if (results.length >= max) break;
    const url = new URL(route, base).href;
    if (new URL(url).origin !== origin) continue;
    const result = await withFreshTab(url, { connection, signedInText }, async ({ page, response }) => {
      const finalUrl = page.url();
      const body = await page.locator('body').innerText();
      const status = response?.status();
      const notFound = status === 404 || /^(?:404|page not found|not found)(?:\s|$)/i.test(body.trim()) || await page.locator('h1').allTextContents().then(t => t.some(s => /^(?:404|page not found|not found)$/i.test(s.trim())));
      return { route, finalUrl, status, result: notFound ? '404' : routeKey(finalUrl) !== routeKey(url) ? 'redirect' : status >= 400 ? 'error' : 'render' };
    });
    results.push(result);
    console.log(`${route} · ${result.result}${result.result === 'redirect' ? ` → ${result.finalUrl}` : ''}`);
  }
  await writeFile(output, results.filter(r => r.result === 'render').map(r => r.route).join('\n') + '\n');
  return results;
}
