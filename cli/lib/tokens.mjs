export function tokenValues(css) {
  const raw = Object.fromEntries([...css.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map(m => [m[1],m[2].trim()]));
  function resolve(v, seen = new Set()) { const m = v?.match(/^var\((--[\w-]+)\)$/); if (!m) return v; if (seen.has(m[1]) || !raw[m[1]]) throw new Error(`Unresolvable token ${m[1]}`); return resolve(raw[m[1]], new Set([...seen,m[1]])); }
  return Object.fromEntries(Object.entries(raw).map(([k,v]) => [k,resolve(v)]));
}
export const familyName = value => String(value).split(',')[0].replace(/["']/g,'').trim().toLowerCase().replace(/ variable$/, '');
export function fontTokens(css) {
  const tokens = tokenValues(css); const map = new Map();
  for (const [token,value] of Object.entries(tokens)) if (token.startsWith('--font-') && !token.startsWith('--font-weight-')) { const name = familyName(value); if (!map.has(name) || token === '--font-sans') map.set(name,token); }
  const ui = tokens['--font-sans'] ? '--font-sans' : ['--font-ui','--font-body','--font-default'].find(k=>tokens[k]) || map.values().next().value;
  return { map, ui, tokens };
}
