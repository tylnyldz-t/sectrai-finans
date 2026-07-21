import { createReadStream } from 'node:fs'
import { access } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { FinanceStore, ROLES } from './financeStore.mjs'

const root = resolve(import.meta.dirname, '..')
const port = Number(process.env.PORT || 8788)
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' }
function json(response, status, body) { response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' }); response.end(status === 204 ? undefined : JSON.stringify(body)) }
async function body(request) { if (!(request.headers['content-type'] || '').toLowerCase().includes('application/json')) throw new Error('UNSUPPORTED_MEDIA_TYPE'); let content = ''; for await (const chunk of request) { content += chunk; if (content.length > 100_000) throw new Error('REQUEST_TOO_LARGE') } try { return JSON.parse(content || '{}') } catch { throw new Error('INVALID_JSON') } }
function roleFor(request, response) {
  const role = request.headers['x-sectrai-role']
  if (typeof role === 'string' && Object.hasOwn(ROLES, role)) return role
  json(response, 403, { error: 'RBAC_ROLE_REQUIRED' })
  return null
}
function contextFor(request) {
  const forwarded = request.headers['x-forwarded-for']
  const ip = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : request.socket.remoteAddress || 'unavailable'
  return { ip }
}
function status(error) {
  if (error?.message === 'REQUEST_TOO_LARGE') return 413
  if (error?.message === 'UNSUPPORTED_MEDIA_TYPE') return 415
  if (typeof error?.message === 'string' && (error.message === 'RBAC_DENIED' || error.message === 'RBAC_ROLE_REQUIRED')) return 403
  return 400
}

async function api(request, response, pathname, store) {
  if (!pathname.startsWith('/api/finance')) return false
  const role = roleFor(request, response)
  if (!role) return true
  const context = contextFor(request)
  try {
    if (request.method === 'GET' && pathname === '/api/finance') return json(response, 200, { state: await store.snapshot(role) }), true
    if (request.method === 'POST' && pathname === '/api/finance/cashflow-scenarios') return json(response, 201, { scenario: await store.createScenario(role, await body(request), context) }), true
    if (request.method === 'PUT' && pathname === '/api/finance/cards') return json(response, 200, { cards: await store.saveCards(role, await body(request), context) }), true
    const taskMatch = pathname.match(/^\/api\/finance\/tasks\/(task-[\w-]+)\/(evidence|submit|review|risk-briefing)$/)
    if (taskMatch && taskMatch[2] === 'evidence' && request.method === 'POST') { const result = await store.uploadEvidence(role, taskMatch[1], await body(request), context); return result ? (json(response, 201, result), true) : (json(response, 404, { error: 'NOT_FOUND' }), true) }
    if (taskMatch && taskMatch[2] === 'submit' && request.method === 'POST') { const task = await store.submitTask(role, taskMatch[1], await body(request), context); return task ? (json(response, 200, { task }), true) : (json(response, 404, { error: 'NOT_FOUND' }), true) }
    if (taskMatch && taskMatch[2] === 'review' && request.method === 'PATCH') { const task = await store.reviewTask(role, taskMatch[1], await body(request), context); return task ? (json(response, 200, { task }), true) : (json(response, 404, { error: 'NOT_FOUND' }), true) }
    if (taskMatch && taskMatch[2] === 'risk-briefing' && request.method === 'POST') { await body(request); const briefing = await store.riskBriefing(role, taskMatch[1], context); return briefing ? (json(response, 200, { briefing }), true) : (json(response, 404, { error: 'NOT_FOUND' }), true) }
    return json(response, 405, { error: 'METHOD_NOT_ALLOWED' }), true
  } catch (error) { return json(response, status(error), { error: error?.message || 'INVALID_REQUEST' }), true }
}
async function staticFile(request, response, pathname, directory) { const dist = join(directory, 'dist'); let file = resolve(dist, `.${pathname === '/' ? '/index.html' : pathname}`); if (!file.startsWith(`${dist}/`)) file = join(dist, 'index.html'); try { await access(file) } catch { file = join(dist, 'index.html') } try { await access(file); response.writeHead(200, { 'content-type': mime[extname(file)] || 'application/octet-stream', 'x-content-type-options': 'nosniff' }); if (request.method === 'HEAD') return response.end(); createReadStream(file).pipe(response) } catch { json(response, 503, { error: 'BUILD_REQUIRED' }) } }
export function createFinansServer({ dataFile = process.env.SECTRAI_FINANS_DATA_FILE || join(root, 'data', 'finance.json'), rootDirectory = root } = {}) { const store = new FinanceStore(dataFile); return createServer(async (request, response) => { const pathname = new URL(request.url || '/', 'http://localhost').pathname; if (await api(request, response, pathname, store)) return; if (pathname.startsWith('/api/')) return json(response, 404, { error: 'NOT_FOUND' }); await staticFile(request, response, pathname, rootDirectory) }) }
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) createFinansServer().listen(port, () => console.log(`Sectrai Finans API + static server listening on http://localhost:${port}`))
