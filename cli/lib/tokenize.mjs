import { tokenValues, fontTokens, familyName } from "./tokens.mjs";
export function tokenize(html, css) {

// --- token table ------------------------------------------------------------
const tokens = tokenValues(css);

// --- color normalization (hex, rgb[a], oklch) -> "r,g,b" + alpha ---------------
const clamp = (x) => Math.max(0, Math.min(255, Math.round(x)));
function oklchToRgb(L, C, h) {
  const a = C * Math.cos((h * Math.PI) / 180), b = C * Math.sin((h * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3, m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const lin = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
  return lin.map((c) => clamp(255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)));
}
function parseColor(v) {
  v = v.trim().toLowerCase();
  let m;
  if ((m = v.match(/^#([0-9a-f]{3,8})$/))) {
    let h = m[1]; if (![3,4,6,8].includes(h.length)) return null; if (h.length <= 4) h = [...h].map((c) => c + c).join('');
    const n = (i) => parseInt(h.slice(i, i + 2), 16);
    return { rgb: [n(0), n(2), n(4)], a: h.length === 8 ? n(6) / 255 : 1 };
  }
  if ((m = v.match(/^rgba?\(([^)]+)\)$/))) {
    const parts = m[1].split(/[\s,/]+/).filter(Boolean);
    const p = parts.map((s,i) => parseFloat(s) * (s.endsWith('%') ? (i < 3 ? 2.55 : 0.01) : 1));
    return { rgb: p.slice(0, 3).map(clamp), a: p[3] ?? 1 };
  }
  if ((m = v.match(/^oklch\(([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\)$/))) {
    const L = parseFloat(m[1]) / (m[2] ? 100 : 1);
    const a = m[5] ? parseFloat(m[5]) / (m[5].endsWith('%') ? 100 : 1) : 1;
    return { rgb: oklchToRgb(L, parseFloat(m[3]), parseFloat(m[4])), a };
  }
  return null;
}
const key = (rgb) => rgb.join(',');
const colorTokens = new Map(); // "r,g,b" -> [token names]
for (const [k, v] of Object.entries(tokens)) {
  if (!k.startsWith('--color-')) continue;
  const c = parseColor(v); if (!c) continue;
  if (!colorTokens.has(key(c.rgb) + ':' + c.a)) colorTokens.set(key(c.rgb) + ':' + c.a, []);
  colorTokens.get(key(c.rgb) + ':' + c.a).push(k);
}
// Prefer the most semantic name for the property; fall back to any token with that value.
const PREFER = {
  color: ['--color-foreground', '--color-muted-foreground', '--color-primary-foreground', '--color-destructive', '--color-success', '--color-petrol', '--color-warning'],
  'background-color': ['--color-background', '--color-surface', '--color-surface-alt', '--color-surface-elevated', '--color-surface-raised', '--color-chrome', '--color-primary', '--color-secondary', '--color-destructive', '--color-success'],
  border: ['--color-border'],
};
const pick = (prop, names) => (PREFER[prop] || PREFER[prop.startsWith('border') ? 'border' : 'color']).find((n) => names.includes(n)) || names[0];

const byPx = (prefix) => new Map(Object.entries(tokens).filter(([k, v]) => k.startsWith(prefix) && /px$/.test(v)).map(([k, v]) => [parseFloat(v), k]));
const TEXT = byPx('--text-'), RADIUS = byPx('--radius-'), SPACE = byPx('--spacing-');
const WEIGHT = new Map(Object.entries(tokens).filter(([k]) => k.startsWith('--font-weight-')).map(([k, v]) => [String(parseFloat(v)), k]));
const FAMILY = fontTokens(css).map;

// --- rewrite ------------------------------------------------------------------
const drift = {}; const bound = {};
let note = (bucket, prop, value) => { bucket[`${prop}: ${value}`] = (bucket[`${prop}: ${value}`] || 0) + 1; };
const COLOR_PROPS = /^(color|background-color|border(-top|-right|-bottom|-left)?-color|fill|stroke|outline-color)$/;
const SPACE_PROPS = /^(gap|row-gap|column-gap|(?:padding|margin)(-top|-right|-bottom|-left)?)$/;

function rewriteDecl(prop, value) {
  const p = prop.trim().toLowerCase(); const v = value.trim();
  if (COLOR_PROPS.test(p)) {
    const c = parseColor(v); if (!c || c.a === 0) return v;
    const names = colorTokens.get(key(c.rgb) + ':' + c.a); 
    if (!names) { note(drift, p, v); return v; }
    const t = pick(p, names); note(bound, p, t);
    return `var(${t})`;
  }
  if (p === 'font-size') { const t = TEXT.get((/^[-\d.]+px$/.test(v) ? parseFloat(v) : NaN)); if (t) { note(bound, p, t); return `var(${t})`; } note(drift, p, v); return v; }
  if (/^border(-top|-bottom)?(-left|-right)?-radius$/.test(p)) {
    const n = /^[-\d.]+px$/.test(v) ? parseFloat(v) : NaN; if (!n || /%/.test(v) || n >= 999) return v;
    const t = RADIUS.get(n); if (t) { note(bound, p, t); return `var(${t})`; } note(drift, 'border-radius', v); return v;
  }
  if (p === 'font-weight') { const t = WEIGHT.get(String(parseFloat(v))); if (t) { note(bound, p, t); return `var(${t})`; } note(drift, p, v); return v; }
  if (p === 'font-family') { const f = familyName(v); const t = FAMILY.get(f); if (t) { note(bound, p, t); return `var(${t})`; } note(drift, p, f); return v; }
  if (SPACE_PROPS.test(p) && /^\d+(\.\d+)?px$/.test(v)) { const t = SPACE.get(parseFloat(v)); if (t) { note(bound, p, t); return `var(${t})`; } if (parseFloat(v)) note(drift, p, v); return v; }
  return v;
}

// The serializer writes every computed property on every element, so most values are inherited or inert
// (a border color on a zero-width border, a font weight on a wrapper with no text). Those are bound when they
// match a token but only *counted* when they are visible: text props on elements with their own text,
// border colors on sides with width, outline color when an outline is drawn. The four border sides count once.
const TEXT_PROPS = /^(color|font-size|font-weight|font-family)$/;
let counting = true;
const realNote = note;
const out = html.replace(/style="([^"]*)"([^>]*)>([^<]*)/g, (_, body, rest, after) => {
  const decls = body.replace(/&quot;/g, '"').split(/;(?![^(]*\))/).filter((d) => d.includes(':'))
    .map((d) => { const i = d.indexOf(':'); return [d.slice(0, i).trim().toLowerCase(), d.slice(i + 1).trim()]; });
  const map = Object.fromEntries(decls);
  const ownText = after.trim().length > 0;
  const sideWidth = (s) => parseFloat(map[`border-${s}-width`] || '0') > 0 && (map[`border-${s}-style`] || 'none') !== 'none';
  const visible = (p) => {
    if (TEXT_PROPS.test(p)) return ownText;
    const side = p.match(/^border-(top|right|bottom|left)-color$/); if (side) return side[1] === 'top' ? sideWidth('top') : false;
    if (/^border-(top-right|bottom-right|bottom-left)-radius$/.test(p)) return false; // corners count once, via top-left
    if (/^border-(block|inline)/.test(p) || /^(caret|column-rule|text-decoration)-color$/.test(p)) return false;
    if (p === 'outline-color') return (map['outline-style'] || 'none') !== 'none' && parseFloat(map['outline-width'] || '0') > 0;
    return true;
  };
  const next = decls.map(([p, v]) => {
    counting = visible(p);
    note = counting ? realNote : () => {};
    return `${p}: ${rewriteDecl(p, v)}`;
  });
  note = realNote;
  return `style="${next.join('; ').replace(/"/g, '&quot;')}"${rest}>${after}`;
});

const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
const top = (o) => Object.entries(o).sort((a, b) => b[1] - a[1]);
const CATS = { color: /color|fill|stroke/, type: /^font-/, radius: /radius/, spacing: /gap|padding|margin/ };
const cat = (o, re) => Object.fromEntries(Object.entries(o).filter(([k]) => re.test(k.split(':')[0])));
const byCategory = Object.fromEntries(Object.entries(CATS).map(([name, re]) => {
  const b = sum(cat(bound, re)), d = sum(cat(drift, re));
  return [name, { bound: b, drift: d, onCanon: +(b / Math.max(1, b + d)).toFixed(3), driftTop: top(cat(drift, re)).slice(0, 8) }];
}));
return { html: out, report: { bound: sum(bound), drift: sum(drift), driftTop: top(drift).slice(0, 5), byCategory } };
}
