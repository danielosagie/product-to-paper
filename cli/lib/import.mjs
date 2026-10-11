import { withFreshTab } from './browser.mjs';
import { expandPage } from './expand.mjs';
import { captureElement } from './elements.mjs';
import { liveTokens } from './paper.mjs';
import { tokenize } from './tokenize.mjs';
import { rebindImported } from './rebind.mjs';
export function importName(job) {
  return job.spec ? `${job.spec.name} · ${job.url} · ${job.width} · ${job.state}` : `${job.url} · ${job.width} · full page`;
}
export async function importJob(job, { paper, pageId, connection, signedInText }) {
  const started = performance.now();
  const name = importName(job);
  let artboard;
  try {
    console.error(`Capturing ${name}…`);
    const capture = await withFreshTab(job.url, { width: job.width, signedInText, connection }, async browser => {
      if (job.spec) return captureElement(browser, job.spec, job.state);
      const dimensions = await expandPage(browser.page);
      if (dimensions.width !== job.width || dimensions.height <= 0) throw new Error('Captured page has invalid dimensions.');
      return { ...dimensions, ...(await browser.serialize('body')) };
    });
    connection.assertConnected();
    const css = await liveTokens(paper);
    const { html, report } = tokenize(capture.html, css);
    const familyNames = [...new Set(capture.fonts.map(f => f.split(',')[0].replace(/["']/g, '').trim()))];
    await paper.call('get_font_family_info', { familyNames });
    artboard = await paper.call('create_artboard', { pageId, name, styles: { width: `${job.spec ? capture.width : job.width}px`, height: `${Math.ceil(capture.height)}px`, position: 'relative' } });
    console.error(`Importing ${name} into Paper…`);
    const inserted = await paper.call('write_html', { targetNodeId: artboard.id, mode: 'insert-children', html: `<x-paper-html>${html}</x-paper-html>` });
    const rebound = await rebindImported(paper, artboard.id, css);
    const info = await paper.call('get_basic_info', { pageId });
    const verified = info.artboards.find(a => a.id === artboard.id);
    const nodes = inserted.createdNodes || [];
    const textNodes = nodes.filter(n => n.component === 'Text').length;
    if (!verified || Number(verified.width) <= 0 || Number(verified.height) <= 0 || !textNodes) throw new Error('Paper verification failed: non-zero artboard size and editable Text nodes required.');
    const boundPercent = Math.round(100 * report.bound / Math.max(1, report.bound + report.drift));
    const result = { name, nodeId: artboard.id, pageId, nodes: nodes.length, textNodes, width: verified.width, height: verified.height, boundPercent, report, rebound, elapsedMs: Math.round(performance.now() - started) };
    console.log(`${name} · ${result.nodes} nodes · ${boundPercent}% bound · drift: ${report.driftTop.map(([value]) => value).join(', ') || 'none'}`);
    console.error(`${name} · ${(result.elapsedMs / 1000).toFixed(2)}s · ${textNodes} Text nodes · rebound ${rebound.colorsBound} colors, ${rebound.fontsBound} fonts`);
    return result;
  } catch (error) {
    // A failed partial import must not make the next run skip the item.
    if (artboard) await paper.call('delete_nodes', { nodeIds: [artboard.id] }).catch(() => {});
    throw error;
  } finally {
    if (artboard) await paper.call('finish_working_on_nodes', { nodeIds: [artboard.id] }).catch(() => {});
  }
}
