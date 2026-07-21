import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { access, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
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
  await new Promise((resolve) => server.listen(0, resolve))
  const base = `http://127.0.0.1:${server.address().port}`
  const headers = (role) => ({ 'content-type': 'application/json', 'x-sectrai-role': role })
  try {
    assert.equal((await fetch(`${base}/api/finance`)).status, 403)
    assert.equal((await fetch(`${base}/api/finance`, { headers: headers('OWNER') })).status, 403)
    assert.equal((await fetch(`${base}/api/finance`, { headers: headers('L3_WORKER') })).status, 200)

    const proofResponse = await fetch(`${base}/api/finance/tasks/task-001/evidence`, { method: 'POST', headers: headers('L3_WORKER'), body: JSON.stringify(proof) })
    assert.equal(proofResponse.status, 201)
    assert.equal((await fetch(`${base}/api/finance/tasks/task-001/submit`, { method: 'POST', headers: headers('L3_WORKER'), body: '{}' })).status, 200)
    assert.equal((await fetch(`${base}/api/finance/tasks/task-001/review`, { method: 'PATCH', headers: headers('L1_ADMIN'), body: JSON.stringify({ decision: 'APPROVE' }) })).status, 403)
    assert.equal((await fetch(`${base}/api/finance/tasks/task-001/review`, { method: 'PATCH', headers: headers('L2_CHECKER'), body: JSON.stringify({ decision: 'APPROVE' }) })).status, 200)
    assert.equal((await fetch(`${base}/api/finance/cards`, { method: 'PUT', headers: headers('L1_ADMIN'), body: JSON.stringify({ cards: [{ type: 'audit' }, { type: 'workflow' }] }) })).status, 200)

    const restarted = await new FinanceStore(dataFile).snapshot('L1_ADMIN')
    assert.equal(restarted.tasks.find((task) => task.id === 'task-001')?.status, 'APPROVED')
    assert.deepEqual(restarted.cards.map((card) => card.type), ['audit', 'workflow'])
  } finally { await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); await rm(directory, { recursive: true, force: true }) }
})
