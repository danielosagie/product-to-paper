#!/usr/bin/env node
// One command: `npx github:danielosagie/product-to-paper` installs the skills.
// `... pull <args>` runs paper-pull, so nothing else needs installing.
import { cp, mkdir, readdir, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const [command = 'install', ...rest] = process.argv.slice(2);
const exists = path => stat(path).then(() => true, () => false);

if (command === 'pull') {
  process.argv = [process.argv[0], 'paper-pull', ...rest];
  const { main } = await import('../cli/paper-pull.mjs');
  const { run } = await import('../cli/lib/cli.mjs');
  await run(main);
} else if (command === 'install') {
  const targets = [rest.includes('--project') ? join(process.cwd(), '.claude/skills') : join(homedir(), '.claude/skills')];
  if (!rest.includes('--project') && await exists(join(homedir(), '.codex'))) targets.push(join(homedir(), '.codex/skills'));
  const skills = await readdir(join(root, 'skills'));
  for (const target of targets) {
    await mkdir(target, { recursive: true });
    for (const skill of skills) await cp(join(root, 'skills', skill), join(target, skill), { recursive: true, force: true });
    console.log(`Installed ${skills.join(', ')} -> ${target}`);
  }
  console.log(`
Next:
  1. Open Paper desktop with your file, then: export PAPER_FILE_ID=<id from app.paper.design/file/<id>>
  2. Sign in to your product in Chrome or Helium, and allow chrome://inspect/#remote-debugging
  3. Install the "Paper Snapshot" extension in that browser
  4. Ask your agent: "use pull-live on https://your.app"

paper-pull runs as: npx -y github:danielosagie/product-to-paper pull --help`);
} else {
  console.log(`Usage:
  npx github:danielosagie/product-to-paper            install the skills (~/.claude/skills, and ~/.codex/skills if present)
  npx github:danielosagie/product-to-paper install --project   install into ./.claude/skills
  npx github:danielosagie/product-to-paper pull ...   run paper-pull`);
}
