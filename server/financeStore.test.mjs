import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { access, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import test from 'node:test'
import { createFinansServer } from './index.mjs'
import { FinanceStore } from './financeStore.mjs'

const proofBytes = Buffer.from('sentetik-mutabakat-kaniti')
const proof = {
  type: 'PDF',
  file: {
    name: 'mutabakat.pdf',
    mimeType: 'application/pdf',
    base64: proofBytes.toString('base64'),
    sha256: createHash('sha256').update(proofBytes).digest('hex'),
  },
}

async function request(server, path, { method = 'GET', headers = {}, body } = {}) {
  return new Promise((resolve) => {
    const requestStream = Readable.from(body === undefined ? [] : [body])
    Object.assign(requestStream, { method, url: path, headers, socket: { remoteAddress: '127.0.0.1' } })
    let status = 200
    let responseHeaders = {}
    const response = {
      writeHead(nextStatus, nextHeaders = {}) { status = nextStatus; responseHeaders = nextHeaders },
      setHeader(name, value) { responseHeaders[name.toLowerCase()] = value },
      end(chunk) {
        const text = chunk ? String(chunk) : ''
        resolve({ status, headers: responseHeaders, body: text ? JSON.parse(text) : undefined })
      },
    }
    server.emit('request', requestStream, response)
  })
}

test('worker kanıt yükler, checker onaylar ve bağımlı görev sırayla açılır', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'sectrai-finans-workflow-'))
  const dataFile = join(directory, 'finance.json')
  try {
    const store = new FinanceStore(dataFile)
    const uploaded = await store.uploadEvidence('L3_WORKER', 'task-001', proof, { ip: '127.0.0.1' })
    assert.equal(uploaded.task.evidence.length, 1)
    await access(join(directory, 'proofs', uploaded.evidence.storageKey))

    const submitted = await store.submitTask('L3_WORKER', 'task-001', {}, { ip: '127.0.0.1' })
    assert.equal(submitted.status, 'PENDING_REVIEW')
    const risk = await store.riskBriefing('L2_CHECKER', 'task-001', { ip: '127.0.0.1' })
    assert.equal(risk.decision, 'HUMAN_REVIEW_REQUIRED')
    assert.ok(risk.signals.some((signal) => signal.includes('Checker incelemesi')))
    const approved = await store.reviewTask('L2_CHECKER', 'task-001', { decision: 'APPROVE' }, { ip: '127.0.0.1' })
    assert.equal(approved.status, 'APPROVED')

    const after = await store.snapshot('L3_WORKER')
    assert.equal(after.tasks.find((task) => task.id === 'task-002')?.status, 'READY')
    assert.ok(after.auditTrail.some((event) => event.action === 'PROOF_UPLOADED' && event.ip === '127.0.0.1'))
    assert.ok(after.auditTrail.some((event) => event.action === 'SEQUENTIAL_GATE_OPENED' && event.taskId === 'task-002'))
  } finally { await rm(directory, { recursive: true, force: true }) }
})

test('kanıtsız gönderim, yetkisiz geçiş ve gerekçesiz red fail-closed reddedilir', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'sectrai-finans-closed-'))
  try {
    const store = new FinanceStore(join(directory, 'finance.json'))
    await assert.rejects(() => store.submitTask('L3_WORKER', 'task-001', {}, {}), /PROOF_REQUIRED/)
    await assert.rejects(() => store.uploadEvidence('L2_CHECKER', 'task-001', proof, {}), /RBAC_DENIED/)
    await assert.rejects(() => store.reviewTask('L2_CHECKER', 'task-001', { decision: 'REJECT' }, {}), /REJECTION_REASON_REQUIRED/)
    await assert.rejects(() => store.riskBriefing('L3_WORKER', 'task-001', {}), /RBAC_DENIED/)
    await assert.rejects(() => store.saveCards('L3_WORKER', { cards: [{ type: 'workflow' }] }, {}), /RBAC_DENIED/)

    const worker = await store.snapshot('L3_WORKER')
    const field = await store.snapshot('L4_FIELD')
    assert.deepEqual(worker.tasks.map((task) => task.id), ['task-001', 'task-002'])
    assert.deepEqual(field.tasks.map((task) => task.id), ['task-003'])
  } finally { await rm(directory, { recursive: true, force: true }) }
})

test('checker red döngüsü gerekçe ve append-only audit olayıyla worker’a döner', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'sectrai-finans-reject-'))
  try {
    const store = new FinanceStore(join(directory, 'finance.json'))
    const fieldProof = { ...proof, type: 'FOTOĞRAF', file: { ...proof.file, name: 'evrak.jpg', mimeType: 'image/jpeg' } }
    await store.uploadEvidence('L4_FIELD', 'task-003', fieldProof, {})
    await store.submitTask('L4_FIELD', 'task-003', {}, {})
    const rejected = await store.reviewTask('L2_CHECKER', 'task-003', { decision: 'REJECT', reason: 'Belge tarihi görünmüyor.' }, {})
    assert.equal(rejected.status, 'REJECTED')
    assert.equal(rejected.rejectionReason, 'Belge tarihi görünmüyor.')
    const after = await store.snapshot('L4_FIELD')
    assert.equal(after.tasks[0].status, 'REJECTED')
    assert.equal(after.auditTrail.at(-1)?.action, 'PROOF_REJECTED')
  } finally { await rm(directory, { recursive: true, force: true }) }
})

test('HTTP API dört katmanlı rolü zorlar ve worker-checker zincirini kalıcılaştırır', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'sectrai-finans-api-'))
  const dataFile = join(directory, 'finance.json')
  const server = createFinansServer({ dataFile })
  const headers = (role) => ({ 'content-type': 'application/json', 'x-sectrai-role': role })
  try {
    assert.equal((await request(server, '/api/finance')).status, 403)
    assert.equal((await request(server, '/api/finance', { headers: headers('OWNER') })).status, 403)
    assert.equal((await request(server, '/api/finance', { headers: headers('L3_WORKER') })).status, 200)

    const proofResponse = await request(server, '/api/finance/tasks/task-001/evidence', { method: 'POST', headers: headers('L3_WORKER'), body: JSON.stringify(proof) })
    assert.equal(proofResponse.status, 201)
    assert.equal((await request(server, '/api/finance/tasks/task-001/submit', { method: 'POST', headers: headers('L3_WORKER'), body: '{}' })).status, 200)
    assert.equal((await request(server, '/api/finance/tasks/task-001/review', { method: 'PATCH', headers: headers('L1_ADMIN'), body: JSON.stringify({ decision: 'APPROVE' }) })).status, 403)
    assert.equal((await request(server, '/api/finance/tasks/task-001/review', { method: 'PATCH', headers: headers('L2_CHECKER'), body: JSON.stringify({ decision: 'APPROVE' }) })).status, 200)
    assert.equal((await request(server, '/api/finance/cards', { method: 'PUT', headers: headers('L1_ADMIN'), body: JSON.stringify({ cards: [{ type: 'audit' }, { type: 'workflow' }] }) })).status, 200)

    const restarted = await new FinanceStore(dataFile).snapshot('L1_ADMIN')
    assert.equal(restarted.tasks.find((task) => task.id === 'task-001')?.status, 'APPROVED')
    assert.deepEqual(restarted.cards.map((card) => card.type), ['audit', 'workflow'])
  } finally { await rm(directory, { recursive: true, force: true }) }
})

test('Upstash KV sağlık uç noktası RBAC, Masa kaydı ve kanıtı namespaced kalıcılaştırır', async () => {
  const values = new Map()
  const fetchImpl = async (url, init = {}) => {
    const [command, encodedKey] = new URL(url).pathname.split('/').filter(Boolean)
    const key = decodeURIComponent(encodedKey)
    if (command === 'get') return Response.json({ result: values.get(key) ?? null })
    if (command === 'set') { values.set(key, init.body); return Response.json({ result: 'OK' }) }
    return Response.json({ error: 'unknown command' }, { status: 400 })
  }
  const server = createFinansServer({
    dataFile: '/unused-in-kv-mode.json',
    storeOptions: { env: { KV_REST_API_URL: 'https://mock-kv.example', KV_REST_API_TOKEN: 'test-token' }, fetchImpl },
  })
  const headers = { 'content-type': 'application/json', 'x-sectrai-role': 'L1_ADMIN' }
  {
    const health = await request(server, '/api/health')
    assert.equal(health.status, 200)
    assert.deepEqual(health.body, { ok: true, app: 'finans', persistence: 'upstash-kv', actors: 4, modules: 4 })
    assert.equal(typeof values.get('sectrai:finans:store'), 'string')

    const snapshot = await request(server, '/api/finance', { headers })
    const state = snapshot.body.state
    assert.equal(state.workspace.masaLayout.length, 4)
    const layout = state.workspace.masaLayout.map((card) => card.id === 'workflow' ? { ...card, x: 88 } : card)
    const saved = await request(server, '/api/finance/masa-layout', { method: 'PUT', headers, body: JSON.stringify({ layout }) })
    assert.equal(saved.status, 200)

    const evidenceResponse = await request(server, '/api/finance/tasks/task-001/evidence', { method: 'POST', headers: { ...headers, 'x-sectrai-role': 'L3_WORKER' }, body: JSON.stringify(proof) })
    assert.equal(evidenceResponse.status, 201)
    const evidence = evidenceResponse.body.evidence
    assert.match(evidence.storageKey, /^sectrai:finans:evidence:proof-/)
    assert.equal(typeof values.get(evidence.storageKey), 'string')
  }
})

test('yarım Upstash yapılandırması dosya fallback yerine 503 ile fail-closed kalır', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'sectrai-finans-kv-closed-'))
  try {
    const store = new FinanceStore(join(directory, 'finance.json'), undefined, undefined, { env: { KV_REST_API_URL: 'https://configured.example' } })
    await assert.rejects(() => store.snapshot('L1_ADMIN'), /KV_REST_API_URL ve KV_REST_API_TOKEN birlikte zorunludur/)
  } finally { await rm(directory, { recursive: true, force: true }) }
})

test('Vercel üretiminde KV değişkenleri yoksa health 503 fail-closed döner', async () => {
  const server = createFinansServer({ dataFile: '/unused-in-vercel-mode.json', storeOptions: { env: { VERCEL: '1' } } })
  const health = await request(server, '/api/health')
  assert.equal(health.status, 503)
  assert.match(health.body.error, /KV_REST_API_URL ve KV_REST_API_TOKEN zorunludur/)
})
