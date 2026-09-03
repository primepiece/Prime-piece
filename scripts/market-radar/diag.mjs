// Tiny diagnostic script — isolates WHERE an Anthropic call is hanging/failing,
// separately from the real research pipeline. Deliberately has NO retry logic (unlike
// run.mjs's fetchWithRetry) — retries would smear three attempts' worth of signal
// together and hide exactly what we're trying to see: does a single request succeed,
// and if not, at what elapsed time and with what error.
//
// Two modes, each exactly ONE Anthropic API call, no Redis involved:
//   DIAG_MODE=basic  -> bare Messages API call, no tools, "Reply only with OK", 30s timeout
//   DIAG_MODE=search -> same call + web_search tool (max_uses: 1), narrow prompt, 90s timeout
const MODEL = 'claude-sonnet-5';
const ANTHROPIC_VERSION = '2023-06-01';
const MODE = process.env.DIAG_MODE || 'basic';

function log(...args) {
  console.log('[market-radar-diag]', ...args);
}

function safeSnippet(text, max = 500) {
  if (!text) return '(empty)';
  return text.length > max ? text.slice(0, max) + '…' : text;
}

async function callAnthropic({ prompt, maxTokens, tools, timeoutMs }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set.');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();

  let res;
  try {
    res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
        ...(tools ? { tools } : {}),
      }),
      signal: controller.signal,
    });
  } catch (err) {
    const elapsed = Date.now() - startedAt;
    const cause = err?.cause ? (err.cause.code || err.cause.message || String(err.cause)) : null;
    if (err.name === 'AbortError') {
      throw new Error(`Timed out after ${elapsed}ms (limit ${timeoutMs}ms) — no response received before the abort.`);
    }
    throw new Error(`Network error after ${elapsed}ms: ${err.message}${cause ? ` (cause: ${cause})` : ''}`);
  } finally {
    clearTimeout(timer);
  }

  const elapsed = Date.now() - startedAt;
  const bodyText = await res.text();
  let data = null;
  try { data = JSON.parse(bodyText); } catch { /* handled below */ }

  if (!res.ok || !data) {
    throw new Error(`HTTP ${res.status} after ${elapsed}ms — body: ${safeSnippet(bodyText)}`);
  }

  log(`Response received in ${elapsed}ms. stop_reason=${data.stop_reason}. usage=${JSON.stringify(data.usage)}`);
  return data;
}

async function runBasic() {
  log('STEP 1 — basic connectivity: 1 Anthropic call, no tools, max_tokens=10, 30s timeout.');
  const data = await callAnthropic({
    prompt: 'Reply only with OK',
    maxTokens: 10,
    tools: null,
    timeoutMs: 30_000,
  });
  const text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
  log(`Model replied: "${text.trim()}"`);
  if (!text.trim()) throw new Error('Got a response but no text content — inspect the raw response above.');
  log('STEP 1 RESULT: PASS');
}

async function runSearch() {
  log('STEP 2 — web search: 1 Anthropic call, web_search max_uses=1, max_tokens=500, 90s timeout.');
  const data = await callAnthropic({
    prompt: 'Find one current public source for Stone Wall Mirror competitors in Australia. Return only source title + URL.',
    maxTokens: 500,
    tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 1 }],
    timeoutMs: 90_000,
  });
  const text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n');
  const searchesUsed = (data.content || []).filter((b) => b.type === 'server_tool_use' && b.name === 'web_search').length;
  log(`Searches used: ${searchesUsed}`);
  log(`Model replied:\n${text}`);
  if (searchesUsed === 0) log('WARNING: no web_search tool call was made — the model may have answered from memory instead of searching.');
  if (!text.trim()) throw new Error('Got a response but no text content.');
  log('STEP 2 RESULT: PASS');
}

async function main() {
  log(`Mode: ${MODE}`);
  if (MODE === 'basic') await runBasic();
  else if (MODE === 'search') await runSearch();
  else throw new Error(`Unknown DIAG_MODE "${MODE}" — expected "basic" or "search".`);
}

main().catch((err) => {
  console.error(`[market-radar-diag] ${MODE.toUpperCase()} RESULT: FAIL —`, err.message);
  process.exit(1);
});
