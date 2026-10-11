// Streamable HTTP MCP client. Every file operation is pinned to the requested file.
export async function connectPaper({ fileId = process.env.PAPER_FILE_ID, endpoint = process.env.PAPER_MCP_URL || 'http://127.0.0.1:29979/mcp', discovery = false } = {}) {
  if (!fileId && !discovery) throw new Error('Paper file ID required: pass --file <id> or set PAPER_FILE_ID. Use Paper get_basic_info to find it.');
  let session, id = 0;
  async function rpc(method, params, notification = false) {
    const requestId = ++id;
    const response = await fetch(endpoint, { method: 'POST', signal: AbortSignal.timeout(60000), headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', ...(session ? { 'mcp-session-id': session } : {}) }, body: JSON.stringify({ jsonrpc: '2.0', ...(notification ? {} : { id: requestId }), method, params }) });
    session = response.headers.get('mcp-session-id') || session;
    const body = await response.text();
    if (!response.ok) throw new Error(`Paper HTTP ${response.status}: ${body.slice(0, 300)}`);
    if (notification) return;
    const result = body.trimStart().startsWith('{') ? JSON.parse(body) : body.split('\n').filter(line => line.startsWith('data:')).map(line => JSON.parse(line.slice(5).trim())).find(message => message.id === requestId);
    if (!result || result.error) throw new Error(`Paper RPC: ${JSON.stringify(result?.error || body)}`);
    return result.result;
  }
  async function raw(name, arguments_ = {}) {
    if (arguments_.fileId && fileId && arguments_.fileId !== fileId) throw new Error('Wrong Paper file');
    const result = await rpc('tools/call', { name, arguments: { ...(fileId ? { fileId } : {}), ...arguments_ } });
    if (result.isError) throw new Error(`Paper ${name}: ${result.content.map(c => c.text || '').join('\n')}`);
    for (const block of result.content.filter(c => c.type === 'text')) {
      let data; try { data = JSON.parse(block.text); } catch { continue; }
      if (fileId && (data.file?.id || data.fileId) && (data.file?.id || data.fileId) !== fileId) throw new Error('Wrong Paper file');
    }
    return result;
  }
  const paper = { fileId, raw, async close() { if (session) await fetch(endpoint, { method: 'DELETE', headers: { 'mcp-session-id': session }, signal: AbortSignal.timeout(5000) }).catch(() => {}); }, async call(name, args = {}) { const result = await raw(name, args); const text = result.content.filter(c => c.type === 'text').at(-1)?.text; try { return JSON.parse(text); } catch { return text; } } };
  try {
    await rpc('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'paper-pull', version: '0.1.0' } });
    await rpc('notifications/initialized', {}, true);
    await raw('get_guide', { topic: 'paper-mcp-instructions' });
    // Fail before creating anything when Paper returns a different file.
    if (fileId) await paper.call('get_basic_info');
    return paper;
  } catch (error) { await paper.close(); throw error; }
}
export async function ensurePage(paper, name) { const info = await paper.call('get_basic_info'); const page = info.pages.find(p => p.name === name) || await paper.call('create_page', { name }); return page.id || page.pageId; }
export async function liveTokens(paper) { const r = await paper.call('get_tokens', { format: 'css' }); if (typeof r === 'string') return r; for (const k of ['css', 'tokensCss', 'content']) if (typeof r?.[k] === 'string') return r[k]; throw new Error('Paper get_tokens did not return CSS.'); }
