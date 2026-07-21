import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { createFinansServer } from './index.mjs'
import { FinanceStore } from './financeStore.mjs'

test('finance store persists scenario creation and owner decisions across a cold restart', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'sectrai-finans-store-'))
  const dataFile = join(directory, 'finance.json')
  try {
    const first = new FinanceStore(dataFile)
    const scenario = await first.createScenario({ templateId: 'stress' })
    const decision = await first.decide('aml', 'aml-001', { status: 'ESCALATE_REVIEW' })
    assert.equal(scenario.templateId, 'stress')
    assert.equal(decision.status, 'ESCALATE_REVIEW')
    const restarted = new FinanceStore(dataFile)
    const state = await restarted.snapshot()
    assert.ok(state.cashflowScenarios.some((item) => item.id === scenario.id))
    assert.equal(state.aml[0].status, 'ESCALATE_REVIEW')
  } finally { await rm(directory, { recursive: true, force: true }) }
})

test('finance store fails closed for unknown templates, unsupported decisions, repeat decisions, and invalid AI responses', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'sectrai-finans-store-'))
  try {
    const store = new FinanceStore(join(directory, 'finance.json'))
    await assert.rejects(() => store.createScenario({ templateId: 'real-market-data' }), /UNKNOWN_SCENARIO_TEMPLATE/)
    await assert.rejects(() => store.decide('claims', 'clm-001', { status: 'ESCALATE_REVIEW' }), /INVALID_DECISION/)
    await store.decide('claims', 'clm-001', { status: 'REQUEST_EVIDENCE' })
    await assert.rejects(() => store.decide('claims', 'clm-001', { status: 'CLOSE_REVIEW' }), /DECISION_ALREADY_RECORDED/)
    const unsafeAI = { explain: async () => ({ label: 'AI-GENERATED · SENTETİK DEMO', text: 'bad', evidenceIds: [] }) }
    await assert.rejects(() => new FinanceStore(join(directory, 'unsafe.json'), undefined, unsafeAI).briefing('collections', 'col-001'), /AI_RESPONSE_INVALID/)
  } finally { await rm(directory, { recursive: true, force: true }) }
})

test('owner-only HTTP API persists all module actions and rejects anonymous access', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'sectrai-finans-api-'))
  const server = createFinansServer({ dataFile: join(directory, 'finance.json') })
  await new Promise((resolve) => server.listen(0, resolve))
  const base = `http://127.0.0.1:${server.address().port}`
  const owner = { 'content-type': 'application/json', 'x-sectrai-role': 'OWNER' }
  try {
    assert.equal((await fetch(`${base}/api/finance`)).status, 403)
    const created = await fetch(`${base}/api/finance/cashflow-scenarios`, { method: 'POST', headers: owner, body: JSON.stringify({ templateId: 'delayed' }) })
    assert.equal(created.status, 201)
    const scenario = (await created.json()).scenario
    assert.equal(scenario.templateId, 'delayed')
    for (const [module, id, status] of [['collections', 'col-001', 'FOLLOW_UP'], ['claims', 'clm-001', 'REQUEST_EVIDENCE'], ['aml', 'aml-001', 'ESCALATE_REVIEW']]) {
      const response = await fetch(`${base}/api/finance/${module}/${id}/decision`, { method: 'PATCH', headers: owner, body: JSON.stringify({ status }) })
      assert.equal(response.status, 200)
    }
    const brief = await fetch(`${base}/api/finance/collections/col-001/briefing`, { method: 'POST', headers: owner, body: '{}' })
    assert.equal(brief.status, 200)
    assert.equal((await brief.json()).briefing.label, 'AI-GENERATED · SENTETİK DEMO')
    const restarted = await new FinanceStore(join(directory, 'finance.json')).snapshot()
    assert.equal(restarted.cashflowScenarios.some((item) => item.id === scenario.id), true)
    assert.equal(restarted.collections[0].status, 'FOLLOW_UP')
  } finally { await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); await rm(directory, { recursive: true, force: true }) }
})
