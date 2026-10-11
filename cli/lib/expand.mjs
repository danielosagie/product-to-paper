// Mutates only our newly opened capture tab. Its DOM is discarded when the tab closes.
export async function expandPage(page) {
  return page.evaluate(async () => {
    // Offscreen accessibility copy must not become visible layers in Paper.
    document.querySelectorAll('.sr-only, .visually-hidden, [class~="screen-reader-only"], a[href^="#"]').forEach(el => {
      const style = getComputedStyle(el);
      if (el.matches('.sr-only, .visually-hidden, [class~="screen-reader-only"]') || /skip (to|navigation|main)/i.test(el.textContent)) el.style.setProperty('display', 'none', 'important');
    });
    const expanded = [];
    let inlineSvgCount = 0;
    // Preserve SVG media as editable vectors; Paper's remote-image import can lose SVG transforms.
    const svgCache = new Map();
    const images = [...document.images];
    await Promise.all(images.map(async (img, index) => {
      const src = img.currentSrc || img.src;
      if (!/\.svg(?:[?#]|$)/i.test(src) || img.getBoundingClientRect().width === 0) return;
      try {
        if (!svgCache.has(src)) svgCache.set(src, fetch(src, { signal: AbortSignal.timeout(5000) }).then(r => {
          if (!r.ok) throw new Error('SVG unavailable'); return r.text();
        }));
        const text = await svgCache.get(src);
        const svg = new DOMParser().parseFromString(text, 'image/svg+xml').documentElement;
        if (svg.localName !== 'svg') return;
        const rect = img.getBoundingClientRect();
        svg.querySelectorAll('script, foreignObject').forEach(el => el.remove());
        const ids = new Map([...svg.querySelectorAll('[id]')].map(el => [el.id, `paper-snap-svg-${index}-${el.id}`]));
        for (const el of [svg, ...svg.querySelectorAll('*')]) {
          for (const attr of [...el.attributes]) {
            if (attr.name.startsWith('on')) el.removeAttribute(attr.name);
            else {
              let value = attr.value;
              for (const [id, replacement] of ids) value = value.replaceAll(`url(#${id})`, `url(#${replacement})`).replaceAll(`url("#${id}")`, `url("#${replacement}")`);
              if (attr.name === 'id') value = ids.get(value) || value;
              if ((attr.name === 'href' || attr.name === 'xlink:href') && value.startsWith('#')) value = `#${ids.get(value.slice(1)) || value.slice(1)}`;
              el.setAttribute(attr.name, value);
            }
          }
        }
        svg.setAttribute('class', img.className);
        svg.style.cssText = img.style.cssText;
        svg.style.width = `${rect.width}px`; svg.style.height = `${rect.height}px`;
        svg.style.flexShrink = getComputedStyle(img).flexShrink;
        svg.setAttribute('aria-label', img.alt || 'Image');
        img.replaceWith(document.importNode(svg, true));
        inlineSvgCount++;
      } catch { /* Keep the original image if it cannot be inlined. */ }
    }));
    const set = (el, key, value) => el.style.setProperty(key, value, 'important');
    const expandedPanes = new Set();
    const expandContainers = () => {
    for (let pass = 0; pass < 4; pass++) {
      const all = [...document.body.querySelectorAll('*')].reverse();
      let changes = 0;
      for (const el of all) {
        if (!(el instanceof HTMLElement)) continue;
        const style = getComputedStyle(el);
        if (style.display === 'none' || el.clientHeight < 4 || el.clientWidth < 4 || style.clip !== 'auto' || style.clipPath !== 'none' || (style.webkitLineClamp !== 'none' && Number(style.webkitLineClamp) > 0)) continue;
        if ((/auto|scroll/.test(style.overflowY) || expandedPanes.has(el)) && el.scrollHeight > el.clientHeight + 2) {
          const height = el.scrollHeight;
          const paneWidth = el.getBoundingClientRect().width;
          expanded.push({ tag: el.tagName.toLowerCase(), height, before: el.clientHeight });
          expandedPanes.add(el);
          el.scrollTop = 0;
          set(el, 'max-height', 'none'); set(el, 'height', `${height}px`);
          set(el, 'min-height', `${height}px`); set(el, 'overflow', 'visible');
          set(el, 'width', `${paneWidth}px`); set(el, 'min-width', `${paneWidth}px`); set(el, 'max-width', `${paneWidth}px`);
          set(el, 'flex-basis', `${paneWidth}px`); set(el, 'flex-grow', '0'); set(el, 'flex-shrink', '0');
          // Let viewport-constrained ancestors grow around expanded content.
          for (let parent = el.parentElement; parent; parent = parent.parentElement) {
            set(parent, 'height', 'auto'); set(parent, 'max-height', 'none');
            set(parent, 'overflow-y', 'visible');
            if (parent === document.body || parent === document.documentElement) set(parent, 'min-height', `${innerHeight}px`);
          }
          changes++;
        }
      }
      if (!changes) break;
    }
    };
    expandContainers();
    // Keep the responsive main-column width when Paper re-evaluates flex sizing.
    for (const main of document.querySelectorAll('main')) {
      const width = main.getBoundingClientRect().width;
      if (!width) continue;
      set(main, 'width', `${width}px`); set(main, 'min-width', `${width}px`); set(main, 'max-width', `${width}px`);
      set(main, 'flex-basis', `${width}px`); set(main, 'flex-grow', '0'); set(main, 'flex-shrink', '0');
    }
    // Visit the whole expanded document so IntersectionObserver-driven media loads.
    const scrollHeight = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
    for (let y = 0; y < scrollHeight; y += Math.max(1, innerHeight * 0.8)) {
      window.scrollTo(0, y); await new Promise(resolve => setTimeout(resolve, 200));
    }
    window.scrollTo(0, 0);
    await Promise.all([...document.querySelectorAll('video')].map(video => {
      if (video.readyState >= 2) return;
      video.muted = true; video.preload = 'metadata'; video.load();
      return new Promise(resolve => {
        video.addEventListener('loadeddata', resolve, { once: true }); setTimeout(resolve, 2000);
      });
    }));
    // Force lazy images and skipped rendering to materialize over the complete document.
    document.querySelectorAll('img[loading="lazy"]').forEach(img => { img.loading = 'eager'; });
    document.querySelectorAll('*').forEach(el => {
      if (getComputedStyle(el).contentVisibility === 'auto') set(el, 'content-visibility', 'visible');
    });
    await Promise.race([document.fonts.ready, new Promise(resolve => setTimeout(resolve, 3000))]);
    await Promise.race([Promise.all([...document.images].map(img => img.decode().catch(() => {}))), new Promise(resolve => setTimeout(resolve, 3000))]);
    // Lazy/infinite grids can grow after scrolling; expand again until their height settles.
    let previousHeight = 0, stable = 0;
    for (let pass = 0; pass < 12 && stable < 2; pass++) {
      expandContainers();
      const height = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
      stable = height === previousHeight ? stable + 1 : 0; previousHeight = height;
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    const clipped = [...document.querySelectorAll('main, [style]')].filter(el =>
      el.clientHeight > 4 && el.clientWidth > 4 && getComputedStyle(el).clipPath === 'none' && !(Number(getComputedStyle(el).webkitLineClamp) > 0) && /auto|scroll/.test(getComputedStyle(el).overflowY) && el.scrollHeight > el.clientHeight + 2);
    if (clipped.length) throw new Error(`Unexpanded scroll containers: ${clipped.length}`);
    return { width: innerWidth, height: Math.max(innerHeight, document.body.scrollHeight, document.documentElement.scrollHeight),
      expanded, inlineSvgCount, mediaReady: [...document.querySelectorAll('video')].filter(v => v.readyState >= 2).length, fonts: [...new Set([...document.querySelectorAll('body, h1, h2, p, button')].map(el => getComputedStyle(el).fontFamily))] };
  });
}


// Paper re-evaluates fractional grid tracks without Chromium's min-content
// sizing. Preserve the measured tracks and item widths in the capture tab.
export async function preserveGridSizing(page, selector = 'body') {
  return page.evaluate(selector => {
    const root = document.querySelector(selector);
    if (!root) throw new Error('Capture root disappeared before sizing.');
    const grids = [root, ...root.querySelectorAll('*')].filter(el => getComputedStyle(el).display === 'grid');
    const measured = grids.map(grid => ({ grid, columns: getComputedStyle(grid).gridTemplateColumns,
      children: [...grid.children].map(el => ({ el, width: el.getBoundingClientRect().width })) }));
    const set = (el, property, value) => el.style.setProperty(property, value, 'important');
    for (const { grid, columns, children } of measured) {
      if (columns !== 'none' && !/subgrid/.test(columns)) set(grid, 'grid-template-columns', columns);
      for (const { el, width } of children) {
        if (width <= 0) continue;
        set(el, 'width', `${width}px`); set(el, 'min-width', `${width}px`); set(el, 'max-width', `${width}px`);
        set(el, 'flex-basis', `${width}px`); set(el, 'flex-grow', '0'); set(el, 'flex-shrink', '0');
      }
    }
    return measured.length;
  }, selector);
}
