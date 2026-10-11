import { execFileSync } from 'node:child_process';
// Receipt (2026-10-11, 16 GB M1): macOS grows swap on demand, so "free swap" sat under 1 GB through
// healthy runs. The failure that actually happened was swap filling the disk to zero. Disk is the tripwire.
export const MIN_FREE_DISK_GB = 5;
export function checkResources(force = false) {
  let diskFreeGB = NaN;
  try { diskFreeGB = Number(execFileSync('df', ['-k', '.'], { encoding: 'utf8' }).trim().split('\n').at(-1).trim().split(/\s+/)[3]) / 1024 ** 2; }
  catch {}
  if (!Number.isFinite(diskFreeGB)) {
    if (!force) throw new Error('Cannot measure free disk with df. Override with --force.');
    return {};
  }
  if (diskFreeGB < MIN_FREE_DISK_GB && !force) throw new Error(`Refusing to start: free disk ${diskFreeGB.toFixed(1)} GB, limit ${MIN_FREE_DISK_GB} GB. Swap can fill the disk mid-run. Free space, or override with --force.`);
  return { diskFreeGB };
}
