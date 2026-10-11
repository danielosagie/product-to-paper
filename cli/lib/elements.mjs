import { sleep } from './browser.mjs';
export const STATES = ['default', 'hover', 'focus-visible', 'active', 'disabled'];
export function validateSpecs(specs) {
  if (!Array.isArray(specs) || !specs.length) throw new Error('--spec must contain a non-empty JSON array.');
  for (const spec of specs) {
    if (!spec || typeof spec.name !== 'string' || !spec.name.trim() || typeof spec.route !== 'string' || typeof spec.pick !== 'string' || !spec.pick.trim()) throw new Error('Each element requires name, route, and a pick JavaScript expression.');
    if (spec.states !== undefined && (!Array.isArray(spec.states) || !spec.states.length || spec.states.some(state => !STATES.includes(state)))) throw new Error(`States must be one or more of: ${STATES.join(', ')}.`);
  }
  return specs;
}
export async function captureElement({ page, cdp, serialize }, spec, state) {
  const selector = '[data-paper-pull-element="capture"]';
  const forcedPseudoClasses = state === 'default' ? [] : state === 'focus-visible' ? ['focus', 'focus-visible'] : [state];
  await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
  let nodeId, found;
  try {
    // Hydrating pages can replace the picked node while CDP is attaching its
    // DOM agent. Re-pick a bounded number of times before serializing once.
    for (let attempt = 0; attempt < 3; attempt++) {
      found = await page.evaluate(({ pick, state }) => {
        document.querySelectorAll('[data-paper-pull-element]').forEach(el => el.removeAttribute('data-paper-pull-element'));
        const element = (0, eval)(`(() => (${pick}))()`);
        if (!(element instanceof Element)) throw new Error('pick did not return a DOM element.');
        element.setAttribute('data-paper-pull-element', 'capture');
        if (state === 'disabled') { element.setAttribute('disabled', ''); element.setAttribute('aria-disabled', 'true'); }
        element.scrollIntoView({ block: 'center' });
        return { family: getComputedStyle(element).fontFamily };
      }, { pick: spec.pick, state });
      const { root } = await cdp.send('DOM.getDocument', { depth: 0 });
      ({ nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector }));
      try {
        if (!nodeId) throw new Error('Picked element disappeared before capture.');
        await cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses });
        break;
      } catch (error) {
        if (attempt === 2 || !/node|disappeared/i.test(error.message)) throw error;
        await sleep(150);
      }
    }
    await sleep(350);
    const size = await page.locator(selector).evaluate(el => {
      const rect = el.getBoundingClientRect();
      return { width: Math.ceil(rect.width), height: Math.ceil(rect.height) };
    });
    if (!size.width || !size.height) throw new Error('Picked element has zero size.');
    return { ...size, fonts: [found.family], ...(await serialize(selector)) };
  } finally { if (nodeId) await cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: [] }).catch(() => {}); }
}
