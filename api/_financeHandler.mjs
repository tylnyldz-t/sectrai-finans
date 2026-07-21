import { FinanceStore } from '../server/financeStore.mjs'

const liveStore = new FinanceStore('/tmp/sectrai-finans-live.json')
function json(response, status, body) { response.statusCode = status; response.setHeader('content-type', 'application/json; charset=utf-8'); response.setHeader('cache-control', 'no-store'); response.end(status === 204 ? undefined : JSON.stringify(body)) }
async function body(request) { if (!(request.headers['content-type'] || '').toLowerCase().includes('application/json')) throw new Error('UNSUPPORTED_MEDIA_TYPE'); let content = ''; for await (const chunk of request) { content += chunk; if (content.length > 100_000) throw new Error('REQUEST_TOO_LARGE') } try { return JSON.parse(content || '{}') } catch { throw new Error('INVALID_JSON') } }
function ownerOnly(request, response) { if (request.headers['x-sectrai-role'] === 'OWNER') return true; json(response, 403, { error: 'OWNER_ONLY' }); return false }
function errorStatus(error) { return error?.message === 'REQUEST_TOO_LARGE' ? 413 : error?.message === 'UNSUPPORTED_MEDIA_TYPE' ? 415 : 400 }

export default async function financeHandler(request, response) {
  if (!ownerOnly(request, response)) return
  const url = new URL(request.url || '/', 'https://finance.local')
  const nestedPath = url.searchParams.get('__finance_path')
  const pathname = nestedPath ? `/api/finance/${nestedPath.replace(/^\/+/, '')}` : '/api/finance'
  try {
    if (request.method === 'GET' && pathname === '/api/finance') return json(response, 200, { state: await liveStore.snapshot(), persistence: 'ephemeral-serverless' })
    if (request.method === 'POST' && pathname === '/api/finance/cashflow-scenarios') return json(response, 201, { scenario: await liveStore.createScenario(await body(request)), persistence: 'ephemeral-serverless' })
    const caseMatch = pathname.match(/^\/api\/finance\/(collections|claims|aml)\/([\w-]+)\/(decision|briefing)$/)
    if (caseMatch && caseMatch[3] === 'decision' && request.method === 'PATCH') { const item = await liveStore.decide(caseMatch[1], caseMatch[2], await body(request)); return item ? json(response, 200, { item, persistence: 'ephemeral-serverless' }) : json(response, 404, { error: 'NOT_FOUND' }) }
    if (caseMatch && caseMatch[3] === 'briefing' && request.method === 'POST') { const briefing = await liveStore.briefing(caseMatch[1], caseMatch[2]); return briefing ? json(response, 200, { briefing }) : json(response, 404, { error: 'NOT_FOUND' }) }
    return json(response, 405, { error: 'METHOD_NOT_ALLOWED' })
  } catch (error) { return json(response, errorStatus(error), { error: error?.message || 'INVALID_REQUEST' }) }
}
