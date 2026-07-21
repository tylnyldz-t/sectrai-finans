import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { FinanceStore, ROLES } from '../server/financeStore.mjs'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const liveStore = new FinanceStore(process.env.SECTRAI_FINANS_DATA_FILE ?? join(root, 'data', 'finance.json'))
function json(response, status, body) { response.statusCode = status; response.setHeader('content-type', 'application/json; charset=utf-8'); response.setHeader('cache-control', 'no-store'); response.end(status === 204 ? undefined : JSON.stringify(body)) }
async function body(request) { if (!(request.headers['content-type'] || '').toLowerCase().includes('application/json')) throw new Error('UNSUPPORTED_MEDIA_TYPE'); let content = ''; for await (const chunk of request) { content += chunk; if (content.length > 100_000) throw new Error('REQUEST_TOO_LARGE') } try { return JSON.parse(content || '{}') } catch { throw new Error('INVALID_JSON') } }
function roleFor(request, response) {
  const role = request.headers['x-sectrai-role']
  if (typeof role === 'string' && Object.hasOwn(ROLES, role)) return role
  json(response, 403, { error: 'RBAC_ROLE_REQUIRED' })
  return null
}
function contextFor(request) {
  const forwarded = request.headers['x-forwarded-for']
  const ip = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : request.socket?.remoteAddress || 'unavailable'
  return { ip }
}
function errorStatus(error) {
  if (Number.isInteger(error?.status) && error.status >= 400 && error.status < 600) return error.status
  if (error?.message === 'REQUEST_TOO_LARGE') return 413
  if (error?.message === 'UNSUPPORTED_MEDIA_TYPE') return 415
  if (typeof error?.message === 'string' && (error.message === 'RBAC_DENIED' || error.message === 'RBAC_ROLE_REQUIRED')) return 403
  return 400
}

export default async function financeHandler(request, response) {
  const url = new URL(request.url || '/', 'https://finance.local')
  const nestedPath = url.searchParams.get('__finance_path')
  const pathname = nestedPath ? `/api/finance/${nestedPath.replace(/^\/+/, '')}` : url.pathname
  if (request.method === 'GET' && pathname === '/api/health') {
    try {
      const state = await liveStore.snapshot('L1_ADMIN')
      return json(response, 200, { ok: true, app: 'finans', persistence: liveStore.persistence.kind, actors: state.team.length, modules: state.cards.length })
    } catch (error) { return json(response, errorStatus(error), { error: error?.message || 'SERVICE_UNAVAILABLE' }) }
  }
  if (!pathname.startsWith('/api/finance')) return json(response, 404, { error: 'NOT_FOUND' })
  const role = roleFor(request, response)
  if (!role) return
  const context = contextFor(request)
  try {
    if (request.method === 'GET' && pathname === '/api/finance') return json(response, 200, { state: await liveStore.snapshot(role), persistence: liveStore.persistence.kind })
    if (request.method === 'POST' && pathname === '/api/finance/cashflow-scenarios') return json(response, 201, { scenario: await liveStore.createScenario(role, await body(request), context), persistence: liveStore.persistence.kind })
    if (request.method === 'PUT' && pathname === '/api/finance/cards') return json(response, 200, { cards: await liveStore.saveCards(role, await body(request), context), persistence: liveStore.persistence.kind })
    if (request.method === 'PUT' && pathname === '/api/finance/masa-layout') return json(response, 200, { layout: await liveStore.saveMasaLayout(role, await body(request), context), persistence: liveStore.persistence.kind })
    const taskMatch = pathname.match(/^\/api\/finance\/tasks\/(task-[\w-]+)\/(evidence|submit|review|risk-briefing)$/)
    if (taskMatch && taskMatch[2] === 'evidence' && request.method === 'POST') { const result = await liveStore.uploadEvidence(role, taskMatch[1], await body(request), context); return result ? json(response, 201, { ...result, persistence: liveStore.persistence.kind }) : json(response, 404, { error: 'NOT_FOUND' }) }
    if (taskMatch && taskMatch[2] === 'submit' && request.method === 'POST') { const task = await liveStore.submitTask(role, taskMatch[1], await body(request), context); return task ? json(response, 200, { task, persistence: liveStore.persistence.kind }) : json(response, 404, { error: 'NOT_FOUND' }) }
    if (taskMatch && taskMatch[2] === 'review' && request.method === 'PATCH') { const task = await liveStore.reviewTask(role, taskMatch[1], await body(request), context); return task ? json(response, 200, { task, persistence: liveStore.persistence.kind }) : json(response, 404, { error: 'NOT_FOUND' }) }
    if (taskMatch && taskMatch[2] === 'risk-briefing' && request.method === 'POST') { await body(request); const briefing = await liveStore.riskBriefing(role, taskMatch[1], context); return briefing ? json(response, 200, { briefing, persistence: liveStore.persistence.kind }) : json(response, 404, { error: 'NOT_FOUND' }) }
    return json(response, 405, { error: 'METHOD_NOT_ALLOWED' })
  } catch (error) { return json(response, errorStatus(error), { error: error?.message || 'INVALID_REQUEST' }) }
}
