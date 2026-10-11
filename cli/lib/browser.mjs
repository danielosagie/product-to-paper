import { chromium } from 'playwright-core';
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { installedSerializer } from './serializer.mjs';
import { preserveGridSizing } from './expand.mjs';
import { httpUrl, widthValue } from './cli.mjs';
export const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
export const DEBUG_HELP = 'Chrome: open chrome://inspect/#remote-debugging and allow, or start it with\n--remote-debugging-port=9222. Then rerun, or pass --cdp.';
export const browserDirectories = ['Google/Chrome', 'net.imput.helium', 'BraveSoftware/Brave-Browser', 'Microsoft Edge', 'Arc/User Data', 'Chromium', 'Google/Chrome Beta'];
export async function discoverEndpoints(override = process.env.PAPER_PULL_CDP) {
  if (override) {
    const url = new URL(override);
    if (!['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol)) throw new Error('--cdp must be an HTTP(S) or WebSocket URL.');
    return [url.href];
  }
  const found = [];
  for (const browser of browserDirectories) {
    const data = await readFile(join(homedir(), 'Library/Application Support', browser, 'DevToolsActivePort'), 'utf8').catch(() => '');
    const [port, path] = data.trim().split(/\r?\n/);
    if (/^\d+$/.test(port) && Number(port) > 0 && Number(port) <= 65535 && path?.startsWith('/devtools/browser/')) found.push(`ws://127.0.0.1:${port}${path}`);
  }
  return [...new Set(found)];
}
export async function connectBrowser(endpoint) {
  const endpoints = await discoverEndpoints(endpoint);
  if (!endpoints.length) throw new Error(`No CDP endpoint found.\n${DEBUG_HELP}`);
  const failures = [];
  for (const endpoint of endpoints) {
    let browser;
    try {
      browser = await chromium.connectOverCDP(endpoint, { timeout: 10000, noDefaults: true });
      const root = await browser.newBrowserCDPSession();
      let closing = false;
      const owned = new Set();
      const connection = { browser, root, endpoint, dropped: false, owned,
        assertConnected() { if (this.dropped || !browser.isConnected()) throw new Error(`CDP connection dropped: ${endpoint}\n${DEBUG_HELP}`); },
        async close() {
          closing = true;
          for (const targetId of owned) await root.send('Target.closeTarget', { targetId }).catch(() => {});
          owned.clear();
          await root.detach().catch(() => {});
          // For connectOverCDP, close disconnects the client; it does not quit Chromium.
          await browser.close().catch(() => {});
        }
      };
      browser.on('disconnected', () => { if (!closing) connection.dropped = true; });
      return connection;
    } catch (error) {
      if (browser) await browser.close().catch(() => {});
      failures.push(`${endpoint}: ${error.message}`);
    }
  }
  throw new Error(`Could not connect to CDP:\n${failures.join('\n')}\n${DEBUG_HELP}`);
}
export async function withFreshTab(url, { width = 1280, height = width <= 600 ? 812 : 900, signedInText, connection: sharedConnection, cdp: endpoint } = {}, fn) {
  httpUrl(url); widthValue(width);
  const connection = sharedConnection || await connectBrowser(endpoint);
  let targetId, cdp;
  try {
    connection.assertConnected();
    ({ targetId } = await connection.root.send('Target.createTarget', { url: 'about:blank', background: true }));
    connection.owned.add(targetId);
    let page;
    const deadline = Date.now() + 10000;
    const inspected = new Set();
    while (!page && Date.now() < deadline) {
      for (const context of connection.browser.contexts()) for (const candidate of context.pages()) {
        if (inspected.has(candidate)) continue;
        inspected.add(candidate);
        const session = await context.newCDPSession(candidate).catch(() => null);
        if (!session) continue;
        const info = await session.send('Target.getTargetInfo').catch(() => null);
        if (info?.targetInfo.targetId === targetId) { page = candidate; cdp = session; break; }
        await session.detach();
      }
      if (!page) await sleep(50);
    }
    if (!page) throw new Error(`Could not attach to background target ${targetId}`);
    await cdp.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width <= 600, screenWidth: width, screenHeight: height });
    await cdp.send('Emulation.setFocusEmulationEnabled', { enabled: false });
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.locator('body').waitFor({ state: 'visible', timeout: 15000 });
    await sleep(2500);
    await page.evaluate(() => Promise.race([document.fonts.ready, new Promise(resolve => setTimeout(resolve, 3000))]));
    if (signedInText && !(await page.locator('body').innerText()).includes(signedInText)) throw new Error(`Not signed in: expected "${signedInText}" at ${page.url()}. Stopped without signing in.`);
    return await fn({ page, cdp, response, serialize: async (selector = 'body') => { await preserveGridSizing(page, selector); return serialize(cdp, selector); } });
  } catch (error) {
    connection.assertConnected();
    throw error;
  } finally {
    if (cdp) await cdp.detach().catch(() => {});
    if (targetId) { await connection.root.send('Target.closeTarget', { targetId }).catch(() => {}); connection.owned.delete(targetId); }
    if (!sharedConnection) await connection.close();
  }
}
export async function serialize(cdp, selector = 'body') {
  const extension = await installedSerializer();
  const frame = await cdp.send('Page.getFrameTree');
  const { executionContextId } = await cdp.send('Page.createIsolatedWorld', { frameId: frame.frameTree.frame.id, worldName: 'paper-snapshot' });
  await cdp.send('Emulation.setFocusEmulationEnabled', { enabled: false });
  try {
    const start = await cdp.send('Runtime.evaluate', { contextId: executionContextId, expression: `globalThis.paperSnapResult = null; (() => {
      const savedRAF = globalThis.requestAnimationFrame, savedCancelRAF = globalThis.cancelAnimationFrame;
      globalThis.paperRestoreRAF = () => { globalThis.requestAnimationFrame = savedRAF; globalThis.cancelAnimationFrame = savedCancelRAF; };
      globalThis.requestAnimationFrame = cb => setTimeout(() => cb(performance.now()), 16);
      globalThis.cancelAnimationFrame = clearTimeout;
      Promise.resolve().then(() => (${extension.source})(${JSON.stringify(selector)}))
        .then(r => globalThis.paperSnapResult = r).catch(e => globalThis.paperSnapResult = {status:'error',error:String(e)})
        .finally(() => globalThis.paperRestoreRAF());
      return 'started'; })()`, returnByValue: true });
    if (start.exceptionDetails) throw new Error(`Snapshot exception: ${start.exceptionDetails.text}`);
    const deadline = Date.now() + 60000;
    while (Date.now() < deadline) {
      await sleep(250);
      const polled = await cdp.send('Runtime.evaluate', { contextId: executionContextId, expression: 'globalThis.paperSnapResult', returnByValue: true });
      if (polled.exceptionDetails) throw new Error(`Snapshot exception: ${polled.exceptionDetails.text}`);
      const result = polled.result.value;
      if (!result) continue;
      if (result.status !== 'success' || !result.html) throw new Error(`Snapshot failed: ${result.error || result.status}`);
      return { ...result, extensionVersion: extension.version };
    }
    throw new Error('Snapshot serializer timed out after 60 seconds.');
  } finally {
    await cdp.send('Runtime.evaluate', { contextId: executionContextId, expression: 'globalThis.paperRestoreRAF?.()' }).catch(() => {});
  }
}
