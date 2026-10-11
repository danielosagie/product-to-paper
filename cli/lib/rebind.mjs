import { fontTokens, tokenValues } from './tokens.mjs';
// Token-bound matches still occupy find_nodes' 200-result window. Descend into
// smaller subtrees at the cap, and keep rebinding until no literal is left.
export async function bindLiteral(paper, nodeId, property, value, token, textOnly = false) {
  const bound = new Set();
  const filters = [{ styleName: property, styleValue: value }];
  async function visit(scope) {
    for (;;) {
      const result = await paper.call('find_nodes', { nodeId: scope, filters });
      const nodes = result.nodes || [];
      const ids = nodes.filter(n => (!textOnly || n.component === 'Text') && (n.matched || []).some(m => m.styleName === property && !String(m.styleValue).startsWith('var('))).map(n => n.id);
      if (ids.some(id => bound.has(id))) throw new Error(`Paper did not retain ${property} token binding for ${value}.`);
      if (ids.length) {
        await paper.call('update_styles', { updates: [{ nodeIds: ids, styles: { [property]: `var(${token})` } }] });
        ids.forEach(id => bound.add(id));
      }
      if (nodes.length >= 200) {
        const children = await paper.call('get_children', { nodeId: scope });
        for (const child of children.children || []) await visit(child.id);
        break;
      }
      if (!ids.length) break;
    }
  }
  await visit(nodeId);
  return bound.size;
}
export async function rebindImported(paper, nodeId, css) {
  const tokens = tokenValues(css);
  const preferred = ['--color-foreground', '--color-muted-foreground', '--color-primary-foreground'];
  const colors = [...preferred.filter(k => tokens[k]), ...Object.keys(tokens).filter(k => k.startsWith('--color-') && !preferred.includes(k))];
  const seen = new Set();
  let colorsBound = 0, fontsBound = 0;
  for (const token of colors) {
    const value = tokens[token];
    if (seen.has(value.toLowerCase())) continue;
    seen.add(value.toLowerCase());
    colorsBound += await bindLiteral(paper, nodeId, 'color', value, token, true);
  }
  const { map } = fontTokens(css);
  for (const token of map.values()) {
    // Exact equivalent families only. Foreign source fonts remain evidence.
    fontsBound += await bindLiteral(paper, nodeId, 'fontFamily', tokens[token], token);
  }
  return { colorsBound, fontsBound };
}
