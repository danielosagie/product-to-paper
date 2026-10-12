#!/usr/bin/env node
// One command: `npx github:danielosagie/product-to-paper` installs the skill.
// One copy lives in ~/.agents/skills; Claude and Codex get symlinks to it.
// `... pull <args>` runs paper-pull, so nothing else needs installing.
import { cp, mkdir, rm, symlink, lstat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SKILL = 'product-to-paper';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const [command = 'install', ...rest] = process.argv.slice(2);
const exists = path => lstat(path).then(() => true, () => false);

if (command === 'pull') {
  process.argv = [process.argv[0], 'paper-pull', ...rest];
  const { main } = await import('../cli/paper-pull.mjs');
  const { run } = await import('../cli/lib/cli.mjs');
  await run(main);
} else if (command === 'install') {
  const base = rest.includes('--project') ? process.cwd() : homedir();
  const canonical = join(base, '.agents/skills', SKILL);
  await rm(canonical, { recursive: true, force: true });
  await mkdir(dirname(canonical), { recursive: true });
  await cp(join(root, 'skills', SKILL), canonical, { recursive: true });
  console.log(`Installed ${SKILL} -> ${canonical}`);
  const agents = ['.claude'];
  if (await exists(join(base, '.codex'))) agents.push('.codex');
  for (const agent of agents) {
    const link = join(base, agent, 'skills', SKILL);
    await mkdir(dirname(link), { recursive: true });
    await rm(link, { recursive: true, force: true });
    await symlink(canonical, link, 'dir');
    console.log(`Linked ${link} -> ${canonical}`);
  }
  console.log(`
Next:
  1. Open Paper desktop with your file, then: export PAPER_FILE_ID=<id from app.paper.design/file/<id>>
  2. Sign in to your product in Chrome or Helium, and allow chrome://inspect/#remote-debugging
  3. Install the "Paper Snapshot" extension in that browser
  4. Ask your agent: "use product-to-paper on https://your.app"`);
} else {
  console.log(`Usage:
  npx github:danielosagie/product-to-paper                    install the skill (~/.agents/skills, linked into ~/.claude and ~/.codex)
  npx github:danielosagie/product-to-paper install --project  install into this project
  npx github:danielosagie/product-to-paper pull ...           run paper-pull`);
}
