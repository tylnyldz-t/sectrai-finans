import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { createFinanceAIProvider } from './aiProvider.mjs'

const moduleNames = new Set(['collections', 'claims', 'aml'])
const decisions = {
  collections: new Set(['FOLLOW_UP', 'HOLD']),
  claims: new Set(['REQUEST_EVIDENCE', 'CLOSE_REVIEW']),
  aml: new Set(['ESCALATE_REVIEW', 'CLOSE_ALERT']),
}
const scenarioTemplates = {
  baseline: { title: 'Baz senaryo · 90 gün', horizon: '90 gün', opening: 820000, inflow: 510000, outflow: 465000, closing: 865000 },
  delayed: { title: 'Gecikmiş tahsilat · 90 gün', horizon: '90 gün', opening: 820000, inflow: 385000, outflow: 465000, closing: 740000 },
  stress: { title: 'Stres senaryosu · 90 gün', horizon: '90 gün', opening: 820000, inflow: 325000, outflow: 515000, closing: 630000 },
}

export const financeSeed = {
  synthetic: true,
  cashflowScenarios: [{ id: 'cash-baseline', templateId: 'baseline', ...scenarioTemplates.baseline, createdAt: '2026-07-21T09:00:00.000Z' }],
  collections: [{ id: 'col-001', title: 'Atlas Ltd. · 31 gün gecikme', amount: 184000, confidence: 0.78, evidenceIds: ['ev-col-001', 'ev-col-002'], evidence: ['Son sentetik mutabakat kaydı 31 gün gecikme gösteriyor.', 'İki önceki sentetik ödeme döngüsü zamanında kapanmış.'], status: 'PENDING_REVIEW' }],
  claims: [{ id: 'clm-001', title: 'POL-2048 · Eksik belge incelemesi', amount: 96000, confidence: 0.71, evidenceIds: ['ev-clm-001', 'ev-clm-002'], evidence: ['Sentetik dosyada iki zorunlu belge işaretli değil.', 'Teminat sınırı sentetik poliçe kaydında görünür.'], status: 'PENDING_REVIEW' }],
  aml: [{ id: 'aml-001', title: 'AML-77 · Olağandışı örüntü uyarısı', amount: 215000, confidence: 0.67, evidenceIds: ['ev-aml-001', 'ev-aml-002'], evidence: ['Sentetik işlem kümesinde saat dışı hareket görünümü var.', 'Kimlik/nihai karar verisi bu demoda yer almıyor.'], status: 'PENDING_REVIEW' }],
}

const clone = (value) => structuredClone(value)
const isObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value)
function assertText(value, error, max = 240) { if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw new Error(error); return value.trim() }
function assertAllowed(value, allowed) { if (!isObject(value)) throw new Error('INVALID_PAYLOAD'); for (const key of Object.keys(value)) if (!allowed.has(key)) throw new Error(`UNEXPECTED_FIELD:${key}`) }

function validateCase(item, module) {
  if (!isObject(item) || !/^([a-z]+)-[\w-]+$/.test(assertText(item.id, 'INVALID_CASE_ID', 80))) throw new Error('INVALID_CASE')
  assertText(item.title, 'INVALID_CASE_TITLE')
  if (!Number.isFinite(item.amount) || item.amount < 0 || item.amount > 1_000_000_000) throw new Error('INVALID_CASE_AMOUNT')
  if (typeof item.confidence !== 'number' || item.confidence < 0 || item.confidence > 1) throw new Error('INVALID_CASE_CONFIDENCE')
  if (!Array.isArray(item.evidenceIds) || item.evidenceIds.length < 1 || new Set(item.evidenceIds).size !== item.evidenceIds.length || !Array.isArray(item.evidence) || item.evidence.length < 1) throw new Error('EVIDENCE_CHAIN_REQUIRED')
  if (item.status !== 'PENDING_REVIEW' && !decisions[module].has(item.status)) throw new Error('INVALID_CASE_STATUS')
  if (item.status === 'PENDING_REVIEW' && item.ownerDecision) throw new Error('INVALID_PENDING_DECISION')
  if (item.status !== 'PENDING_REVIEW' && (!isObject(item.ownerDecision) || !assertText(item.ownerDecision.by, 'INVALID_OWNER'))) throw new Error('OWNER_DECISION_REQUIRED')
}

export function validateFinance(state) {
  if (!isObject(state) || state.synthetic !== true || !Array.isArray(state.cashflowScenarios)) throw new Error('INVALID_FINANCE_STATE')
  for (const scenario of state.cashflowScenarios) {
    if (!isObject(scenario) || !scenarioTemplates[scenario.templateId] || !/^cash-[\w-]+$/.test(assertText(scenario.id, 'INVALID_SCENARIO_ID', 80))) throw new Error('INVALID_CASHFLOW_SCENARIO')
    for (const key of ['opening', 'inflow', 'outflow', 'closing']) if (!Number.isFinite(scenario[key])) throw new Error('INVALID_CASHFLOW_VALUE')
  }
  for (const module of moduleNames) { if (!Array.isArray(state[module])) throw new Error('INVALID_MODULE_QUEUE'); state[module].forEach((item) => validateCase(item, module)) }
  return state
}

export class FinanceStore {
  constructor(dataFile, initial = financeSeed, aiProvider = createFinanceAIProvider()) { this.dataFile = dataFile; this.initial = clone(initial); this.aiProvider = aiProvider; this.writeQueue = Promise.resolve() }
  async read() { try { return validateFinance(JSON.parse(await readFile(this.dataFile, 'utf8'))) } catch (error) { if (error?.code !== 'ENOENT') throw error; const initial = validateFinance(clone(this.initial)); await this.write(initial); return initial } }
  async write(state) { await mkdir(dirname(this.dataFile), { recursive: true }); const temporary = `${this.dataFile}.${process.pid}.${randomUUID()}.tmp`; await writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`, 'utf8'); await rename(temporary, this.dataFile) }
  async mutate(operation) { const next = this.writeQueue.then(operation, operation); this.writeQueue = next.catch(() => undefined); return next }
  async snapshot() { return this.read() }
  async createScenario(input) {
    assertAllowed(input, new Set(['templateId']))
    if (!Object.hasOwn(scenarioTemplates, input.templateId)) throw new Error('UNKNOWN_SCENARIO_TEMPLATE')
    return this.mutate(async () => { const state = await this.read(); const scenario = { id: `cash-${randomUUID().slice(0, 8)}`, templateId: input.templateId, ...scenarioTemplates[input.templateId], createdAt: new Date().toISOString() }; state.cashflowScenarios.unshift(scenario); await this.write(state); return scenario })
  }
  async decide(module, id, input) {
    if (!moduleNames.has(module)) throw new Error('UNKNOWN_MODULE')
    assertAllowed(input, new Set(['status']))
    if (!decisions[module].has(input.status)) throw new Error('INVALID_DECISION')
    return this.mutate(async () => { const state = await this.read(); const item = state[module].find((candidate) => candidate.id === id); if (!item) return null; if (item.status !== 'PENDING_REVIEW') throw new Error('DECISION_ALREADY_RECORDED'); item.status = input.status; item.ownerDecision = { by: 'Finans demo owner', at: new Date().toISOString() }; await this.write(state); return item })
  }
  async briefing(module, id) {
    if (!moduleNames.has(module)) throw new Error('UNKNOWN_MODULE')
    const item = (await this.read())[module].find((candidate) => candidate.id === id)
    if (!item) return null
    const result = await this.aiProvider.explain({ module, item })
    if (!isObject(result) || result.label !== 'AI-GENERATED · SENTETİK DEMO' || typeof result.text !== 'string' || !Array.isArray(result.evidenceIds) || result.evidenceIds.length === 0 || result.evidenceIds.some((evidenceId) => !item.evidenceIds.includes(evidenceId))) throw new Error('AI_RESPONSE_INVALID')
    return result
  }
}
