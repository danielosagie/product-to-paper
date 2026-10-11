import { readdir, readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parse } from 'acorn';
const EXTENSION_ID = 'lidfahaahiogmnlccifabccgplofocck';
let cachedSerializer;
export async function installedSerializer() {
  if (!cachedSerializer) cachedSerializer = readInstalledSerializer().catch(error => { cachedSerializer = null; throw error; });
  return cachedSerializer;
}
async function readInstalledSerializer() {
  const candidates = [];
  if (process.env.PAPER_SNAPSHOT_DIR) candidates.push(process.env.PAPER_SNAPSHOT_DIR);
  else for (const browser of ['net.imput.helium', 'Google/Chrome', 'Google/Chrome Beta', 'BraveSoftware/Brave-Browser', 'Arc/User Data', 'Microsoft Edge', 'Chromium']) {
    const root = join(homedir(), 'Library/Application Support', browser);
    for (const profile of await readdir(root).catch(() => [])) if (profile === 'Default' || /^Profile /.test(profile)) candidates.push(join(root, profile, 'Extensions', EXTENSION_ID));
  }
  for (const root of candidates) {
    const versions = (await readdir(root).catch(() => [])).filter(v => /^\d/.test(v)).sort((a,b) => b.localeCompare(a, undefined, { numeric: true }));
    for (const dir of [root, ...versions.map(v => join(root, v))]) {
      let manifest; try { manifest = JSON.parse(await readFile(join(dir, 'manifest.json'), 'utf8')); } catch { continue; }
      if (!manifest.background?.service_worker) continue;
      const source = await readFile(join(dir, manifest.background.service_worker), 'utf8');
      const ast = parse(source, { ecmaVersion: 'latest', sourceType: manifest.background.type === 'module' ? 'module' : 'script' });
      const fn = ast.body.find(n => n.type === 'FunctionDeclaration' && n.async && source.slice(n.start,n.end).includes('paper-snapshot-original-tag'));
      if (!fn) throw new Error('Installed Paper Snapshot serializer not found; extension format changed.');
      return { source: source.slice(fn.start, fn.end), version: manifest.version };
    }
  }
  throw new Error('Paper Snapshot extension is missing from macOS Chromium Default/Profile * profiles. Install extension lidfahaahiogmnlccifabccgplofocck or set PAPER_SNAPSHOT_DIR to its version directory.');
}
