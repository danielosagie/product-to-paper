// creao-ui-probe.js
// Runtime check for the Creao product design guideline (design-system-guideline.md).
// Paste into any browser context (browser-use `js(...)`, Playwright `page.evaluate`, DevTools)
// on a rendered screen. Returns a JSON report; a non-empty `fail` list blocks the merge.
// Rule ids match the guideline: T* = token rules, L* = layout rules, A* = access rules.
(() => {
  const TYPE_SCALE = [12, 14, 16, 18, 20, 24, 30, 36, 48, 60, 72];
  const RADIUS_SCALE = [0, 2, 4, 6, 8, 12, 16, 24];
  const FONT_FAMILIES = ['instrument sans', 'dm sans', 'eb garamond', 'jetbrains mono', 'dm mono', 'inter'];
  const LAYOUTS = ['chat', 'index', 'detail', 'builder', 'settings', 'auth', 'overlay'];
  const TOKEN_NAMES = [
    'background', 'foreground', 'surface', 'surface-alt', 'surface-elevated', 'surface-raised', 'chrome',
    'muted-foreground', 'border', 'primary', 'primary-foreground', 'secondary', 'destructive', 'success',
    'petrol', 'warning', 'ring', 'credit-plan', 'credit-purchased', 'credit-reward', 'credit-daily',
    'grey-0', 'grey-100', 'grey-200', 'grey-300', 'grey-400', 'grey-500', 'grey-600', 'grey-800', 'grey-950',
  ];
  const mobile = innerWidth < 768;

  // Normalize any CSS color (hex, oklch, oklab, color-mix output) to opaque sRGB through a canvas.
  // Alpha is dropped on purpose: bg-foreground/10 is still the foreground token (T2 checks hue, not opacity).
  const ctx = Object.assign(document.createElement('canvas'), { width: 1, height: 1 }).getContext('2d', { willReadFrequently: true });
  const alphaOf = (c) => { const m = c.match(/\/\s*([\d.]+%?)\s*\)$/) || c.match(/rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\)/); return m ? parseFloat(m[1]) / (m[1].endsWith('%') ? 100 : 1) : 1; };
  const channels = (c) => {
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = '#000';
    ctx.fillStyle = c.replace(/\s*\/\s*[\d.]+%?\s*\)$/, ')').replace(/^rgba\(([^,]+),([^,]+),([^,]+),[^)]+\)/, 'rgb($1,$2,$3)');
    ctx.fillRect(0, 0, 1, 1);
    return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3).join(',');
  };
  const isTransparent = (c) => c === 'transparent' || alphaOf(c) === 0;

  // Canon = TOKEN_NAMES. Any other --color-* the app defines is either a raw Tailwind palette step (T2 fail)
  // or a non-canon alias such as sidebar-fg / ox-ink / grey-900 (T6 warn: migrate to the canon name).
  const rootStyle = getComputedStyle(document.documentElement);
  const definedColorVars = new Set();
  for (const sheet of document.styleSheets) {
    let rules; try { rules = sheet.cssRules; } catch { continue; }
    const walk = (rs) => { for (const r of rs) { if (r.cssRules) walk(r.cssRules); if (r.style) for (const p of r.style) if (p.startsWith('--color-')) definedColorVars.add(p.slice(8)); } };
    walk(rules);
  }
  const canon = new Map(); // channels -> canon name
  const nonCanon = new Map(); // channels -> alias name
  const PALETTE = /^(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone)-\d+$/;
  for (const n of TOKEN_NAMES) { const v = rootStyle.getPropertyValue(`--color-${n}`).trim(); if (v) canon.set(channels(v), n); }
  for (const n of definedColorVars) {
    if (TOKEN_NAMES.includes(n) || PALETTE.test(n) || ['black', 'white'].includes(n)) continue;
    const v = rootStyle.getPropertyValue(`--color-${n}`).trim();
    const ch = v && channels(v);
    if (ch && !canon.has(ch) && !nonCanon.has(ch)) nonCanon.set(ch, n);
  }
  const classify = (c) => { const ch = channels(c); return canon.has(ch) ? 'canon' : nonCanon.has(ch) ? `alias --color-${nonCanon.get(ch)}` : 'off'; };

  const visible = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return false;
    const s = getComputedStyle(el);
    return s.visibility !== 'hidden' && s.display !== 'none' && Number(s.opacity) > 0;
  };
  const describe = (el) => {
    const id = el.id ? `#${el.id}` : '';
    const cls = typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : '';
    const text = (el.innerText || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 40);
    const r = el.getBoundingClientRect();
    const at = `@${Math.round(r.left)},${Math.round(r.top + scrollY)},${Math.round(r.width)}x${Math.round(r.height)}`;
    return `${el.tagName.toLowerCase()}${id}${cls === '.' ? '' : cls}${text ? ` "${text}"` : ''} ${at}`;
  };
  const bucket = new Map();
  const hit = (rule, severity, value, el) => {
    const key = `${rule}|${value}`;
    if (!bucket.has(key)) bucket.set(key, { rule, severity, value, count: 0, samples: [] });
    const b = bucket.get(key);
    b.count += 1;
    if (b.samples.length < 3) b.samples.push(describe(el));
  };

  // Luminance contrast for A1.
  const lum = (rgb) => {
    const [r, g, b] = (rgb.match(/[\d.]+/g) || [0, 0, 0]).slice(0, 3).map((v) => {
      const c = Number(v) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  // Returns null when the backdrop is translucent, an image or a gradient: contrast is then unmeasurable here
  // and belongs to the Paper review (G1), not this probe.
  const effectiveBg = (el) => {
    for (let n = el; n; n = n.parentElement) {
      const ns = getComputedStyle(n);
      if (ns.backgroundImage !== 'none' || n.tagName === 'IMG' || n.tagName === 'VIDEO') return null;
      const bg = ns.backgroundColor;
      if (isTransparent(bg)) continue;
      return alphaOf(bg) < 1 ? null : bg;
    }
    return rootStyle.getPropertyValue('--color-background').trim() || 'rgb(248, 246, 243)';
  };
  const colorHit = (what, c, el) => {
    if (isTransparent(c)) return;
    const k = classify(c);
    if (k === 'off') hit('T2 color-token', 'fail', `${what} ${c}`, el);
    else if (k !== 'canon') hit('T6 non-canon-alias', 'warn', `${what} ${k}`, el);
  };

  const all = [...document.querySelectorAll('body *')].filter(visible);
  for (const el of all) {
    const s = getComputedStyle(el);
    const ownText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());

    if (ownText) {
      const fs = Math.round(parseFloat(s.fontSize) * 2) / 2;
      if (!TYPE_SCALE.includes(fs)) hit('T1 type-scale', 'fail', `${fs}px`, el);
      const fam = s.fontFamily.split(',')[0].replace(/["']/g, '').toLowerCase().replace(/ variable$/, '');
      if (!FONT_FAMILIES.includes(fam)) hit('T4 font-family', 'fail', fam, el);
      if (!['400', '500', '600'].includes(s.fontWeight) && !/^h[1-3]$/i.test(el.tagName)) hit('T5 font-weight', 'warn', s.fontWeight, el);
      colorHit('text', s.color, el);
      const big = fs >= 18 || (fs >= 14 && Number(s.fontWeight) >= 700);
      const bg = effectiveBg(el);
      if (bg && alphaOf(s.color) === 1) {
        const l1 = lum(`rgb(${channels(s.color)})`), l2 = lum(`rgb(${channels(bg)})`);
        const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
        if (ratio < (big ? 3 : 4.5) && !el.closest('[aria-disabled="true"],:disabled,[aria-hidden="true"]')) hit('A1 contrast', 'fail', `${ratio.toFixed(2)}:1`, el);
      }
    }
    colorHit('bg', s.backgroundColor, el);
    if (parseFloat(s.borderTopWidth) > 0) colorHit('border', s.borderTopColor, el);
    const rad = parseFloat(s.borderTopLeftRadius);
    const r = el.getBoundingClientRect();
    const isPill = rad >= Math.min(r.width, r.height) / 2 - 1;
    if (rad && !isPill && !RADIUS_SCALE.includes(Math.round(rad))) hit('T3 radius-scale', 'fail', `${rad}px`, el);

    const interactive = el.matches('button, a[href], [role="button"], [role="tab"], [role="menuitem"], input:not([type="hidden"]), select, textarea, summary');
    if (interactive) {
      const name = (el.getAttribute('aria-label') || el.getAttribute('title') || el.innerText || el.getAttribute('aria-labelledby') || el.value || '').trim();
      if (!name && !el.matches('input, select, textarea')) hit('A2 accessible-name', 'fail', 'icon-only control without a name', el);
      const min = mobile ? 44 : 24;
      if ((r.width < min || r.height < min) && !el.closest('p, li > a:only-child')) hit('A3 target-size', mobile ? 'fail' : 'warn', `${Math.round(r.width)}x${Math.round(r.height)} < ${min}`, el);
      if (mobile && el.matches('input, textarea, select') && parseFloat(s.fontSize) < 16) hit('A4 ios-input-zoom', 'fail', `${s.fontSize} input on mobile`, el);
    }
  }

  // L1: every screen declares exactly one layout pattern.
  const roots = [...document.querySelectorAll('[data-layout]')];
  const pattern = roots.length === 1 ? roots[0].getAttribute('data-layout') : null;
  if (roots.length === 0) hit('L1 layout-declared', 'fail', 'no [data-layout] root', document.body);
  if (roots.length > 1) hit('L1 layout-declared', 'fail', `${roots.length} [data-layout] roots`, roots[1]);
  if (pattern && !LAYOUTS.includes(pattern)) hit('L1 layout-declared', 'fail', `unknown pattern "${pattern}"`, roots[0]);

  // A5: exactly one visible h1 per screen (the PageHeader title); a title is never a button.
  const h1s = [...document.querySelectorAll('h1')].filter(visible);
  if (h1s.length !== 1) hit('A5 one-h1', 'fail', `${h1s.length} visible h1`, h1s[1] || document.body);

  // L2: no horizontal page scroll at any width.
  const sw = document.scrollingElement.scrollWidth;
  if (sw > innerWidth + 1) hit('L2 no-page-hscroll', 'fail', `scrollWidth ${sw} > viewport ${innerWidth}`, document.body);

  // L3: one primary action per view (ink-filled buttons visible at once).
  const primaryCh = channels(rootStyle.getPropertyValue('--color-primary').trim() || '#16181a');
  const primaries = all.filter((el) => el.matches('button, a[role="button"], [role="button"]') && alphaOf(getComputedStyle(el).backgroundColor) === 1 && channels(getComputedStyle(el).backgroundColor) === primaryCh);
  if (primaries.length > 1) primaries.slice(1).forEach((el) => hit('L3 one-primary-action', 'warn', `${primaries.length} primary-filled buttons`, el));

  const findings = [...bucket.values()].sort((a, b) => (a.severity === b.severity ? b.count - a.count : a.severity === 'fail' ? -1 : 1));
  return {
    url: location.pathname + location.search,
    viewport: `${innerWidth}x${innerHeight}`,
    pattern,
    fail: findings.filter((f) => f.severity === 'fail'),
    warn: findings.filter((f) => f.severity === 'warn'),
  };
})();
