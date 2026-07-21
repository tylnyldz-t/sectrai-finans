import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { createFinanceAIProvider } from './aiProvider.mjs'

export const ROLES = Object.freeze({
  L1_ADMIN: { level: 'L1', label: 'Yönetici Ortak', scope: 'Tüm konteyner, masa ve denetim kayıtları' },
  L2_CHECKER: { level: 'L2', label: 'Proje / Hesap Müdürü', scope: 'Departman görevi, kanıt inceleme ve karar' },
  L3_WORKER: { level: 'L3', label: 'Mali Müşavir / Danışman', scope: 'Kendisine atanan görev ve kanıt' },
  L4_FIELD: { level: 'L4', label: 'Dokümantasyon Destek', scope: 'Basit saha/doküman görevi ve kanıt' },
})

export const CARD_CATALOG = Object.freeze({
  workflow: { title: 'İş akışı', detail: 'Kanıt, onay kilidi ve revizyon durumu' },
  ledger: { title: 'Kayıt defterleri', detail: 'Sentetik finans inceleme kayıtları' },
  roles: { title: 'Ekip & roller', detail: 'Profesyonel hizmetler hiyerarşisi' },
  audit: { title: 'Denetim izi', detail: 'Append-only işlem günlüğü' },
})

const roleNames = new Set(Object.keys(ROLES))
const cardTypes = new Set(Object.keys(CARD_CATALOG))
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
const proofTypes = new Set(['PDF', 'FOTOĞRAF', 'GPS', 'DİJİTAL_İMZA', 'BARKOD'])
const taskStatuses = new Set(['LOCKED', 'READY', 'PENDING_REVIEW', 'REJECTED', 'APPROVED'])
const STORE_KEY = 'sectrai:finans:store'
const EVIDENCE_KEY_PREFIX = 'sectrai:finans:evidence:'

function defaultMasaLayout() {
  return [
    { id: 'workflow', x: 30, y: 28, w: 350, h: 240, z: 1, pinned: false, collapsed: false },
    { id: 'ledger', x: 405, y: 28, w: 350, h: 240, z: 2, pinned: false, collapsed: false },
    { id: 'roles', x: 30, y: 298, w: 350, h: 240, z: 3, pinned: false, collapsed: false },
    { id: 'audit', x: 405, y: 298, w: 350, h: 240, z: 4, pinned: false, collapsed: false },
  ]
}

const actors = {
  L1_ADMIN: { id: 'usr-admin-001', name: 'Sentetik Yönetici Ortak', role: 'Yönetici Ortak', department: 'Yönetim', level: 'L1' },
  L2_CHECKER: { id: 'usr-checker-001', name: 'Sentetik Proje Müdürü', role: 'Proje / Hesap Müdürü', department: 'Finans ve Muhasebe', level: 'L2' },
  L3_WORKER: { id: 'usr-worker-001', name: 'Sentetik Mali Müşavir', role: 'Mali Müşavir', department: 'Danışmanlık', level: 'L3' },
  L4_FIELD: { id: 'usr-field-001', name: 'Sentetik Dokümantasyon Desteği', role: 'Dokümantasyon Elemanı', department: 'İdari Destek', level: 'L4' },
}

const now = () => new Date().toISOString()
const clone = (value) => structuredClone(value)
const isObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value)
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key)

function assertText(value, error, max = 240) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw new Error(error)
  return value.trim()
}
function assertAllowed(value, allowed) {
  if (!isObject(value)) throw new Error('INVALID_PAYLOAD')
  for (const key of Object.keys(value)) if (!allowed.has(key)) throw new Error(`UNEXPECTED_FIELD:${key}`)
}
function assertRole(role) {
  if (typeof role !== 'string' || !roleNames.has(role)) throw new Error('RBAC_ROLE_REQUIRED')
  return role
}
function actorFor(role) { return actors[assertRole(role)] }
function roleCanViewTask(role, task) {
  if (role === 'L1_ADMIN') return true
  const actor = actorFor(role)
  return role === 'L2_CHECKER' ? task.checkerId === actor.id : task.workerId === actor.id
}
function requestMeta(context = {}) {
  return {
    ip: typeof context.ip === 'string' && context.ip.length <= 120 ? context.ip : 'unavailable',
    gps: typeof context.gps === 'string' && context.gps.length <= 120 ? context.gps : null,
  }
}

function audit(state, { action, actor, taskId = null, context, detail }) {
  const meta = requestMeta(context)
  state.auditTrail.push({
    id: `audit-${randomUUID()}`,
    at: now(),
    action,
    taskId,
    actorId: actor.id,
    actorName: actor.name,
    role: actor.level,
    ip: meta.ip,
    gps: meta.gps,
    detail,
  })
}

export const financeSeed = Object.freeze({
  synthetic: true,
  workspace: {
    id: 'finance-professional-services',
    sector: 'PROFESSIONAL_SERVICES',
    sectorLabel: 'Profesyonel Hizmetler · Muhasebe ve Danışmanlık',
    containerTerm: 'Müvekkil / Danışmanlık Proje Dosyası',
    container: { id: 'eng-2026-001', title: 'Atlas Ltd. · Temmuz mutabakatı', client: 'Atlas Ltd.', status: 'ACTIVE' },
    masaLayout: defaultMasaLayout(),
  },
  cards: [
    { type: 'workflow' },
    { type: 'ledger' },
    { type: 'roles' },
    { type: 'audit' },
  ],
  team: Object.values(actors),
  tasks: [
    {
      id: 'task-001',
      title: 'Gecikmiş tahsilat mutabakatını hazırla',
      module: 'collections',
      workerId: 'usr-worker-001',
      checkerId: 'usr-checker-001',
      proofTypes: ['PDF'],
      evidence: [],
      dependsOn: [],
      status: 'READY',
      rejectionReason: null,
      submittedAt: null,
      approvedAt: null,
    },
    {
      id: 'task-002',
      title: 'Müvekkil takip aksiyonunu kayda al',
      module: 'collections',
      workerId: 'usr-worker-001',
      checkerId: 'usr-checker-001',
      proofTypes: ['DİJİTAL_İMZA'],
      evidence: [],
      dependsOn: ['task-001'],
      status: 'LOCKED',
      rejectionReason: null,
      submittedAt: null,
      approvedAt: null,
    },
    {
      id: 'task-003',
      title: 'Eksik evrak indeksini oluştur',
      module: 'claims',
      workerId: 'usr-field-001',
      checkerId: 'usr-checker-001',
      proofTypes: ['FOTOĞRAF'],
      evidence: [],
      dependsOn: [],
      status: 'READY',
      rejectionReason: null,
      submittedAt: null,
      approvedAt: null,
    },
  ],
  auditTrail: [{
    id: 'audit-seed-001', at: '2026-07-21T09:00:00.000Z', action: 'CONTAINER_CREATED', taskId: null,
    actorId: 'usr-admin-001', actorName: 'Sentetik Yönetici Ortak', role: 'L1', ip: 'seed', gps: null,
    detail: 'Sentetik müvekkil/danışmanlık proje dosyası oluşturuldu.',
  }],
  cashflowScenarios: [{ id: 'cash-baseline', templateId: 'baseline', ...scenarioTemplates.baseline, createdAt: '2026-07-21T09:00:00.000Z' }],
  collections: [{ id: 'col-001', title: 'Atlas Ltd. · 31 gün gecikme', amount: 184000, confidence: 0.78, evidenceIds: ['ev-col-001', 'ev-col-002'], evidence: ['Sentetik mutabakat kaydı 31 gün gecikme gösteriyor.', 'İki önceki sentetik ödeme döngüsü zamanında kapanmış.'], status: 'PENDING_REVIEW' }],
  claims: [{ id: 'clm-001', title: 'POL-2048 · Eksik belge incelemesi', amount: 96000, confidence: 0.71, evidenceIds: ['ev-clm-001', 'ev-clm-002'], evidence: ['Sentetik dosyada iki zorunlu belge işaretli değil.', 'Teminat sınırı sentetik poliçe kaydında görünür.'], status: 'PENDING_REVIEW' }],
  aml: [{ id: 'aml-001', title: 'AML-77 · Olağandışı örüntü uyarısı', amount: 215000, confidence: 0.67, evidenceIds: ['ev-aml-001', 'ev-aml-002'], evidence: ['Sentetik işlem kümesinde saat dışı hareket görünümü var.', 'Kimlik/nihai karar verisi bu demoda yer almıyor.'], status: 'PENDING_REVIEW' }],
})

function validateEvidence(item) {
  if (!isObject(item) || !/^proof-[\w-]+$/.test(assertText(item.id, 'INVALID_PROOF_ID', 100))) throw new Error('INVALID_PROOF')
  if (!proofTypes.has(assertText(item.type, 'INVALID_PROOF_TYPE', 40))) throw new Error('INVALID_PROOF_TYPE')
  assertText(item.fileName, 'INVALID_PROOF_NAME', 180)
  assertText(item.mimeType, 'INVALID_PROOF_MIME', 120)
  if (!Number.isInteger(item.size) || item.size < 1 || item.size > 2_000_000) throw new Error('INVALID_PROOF_SIZE')
  if (!/^[a-f0-9]{64}$/.test(assertText(item.sha256, 'INVALID_PROOF_HASH', 64))) throw new Error('INVALID_PROOF_HASH')
  assertText(item.storageKey, 'INVALID_PROOF_STORAGE', 240)
  assertText(item.uploadedAt, 'INVALID_PROOF_TIME', 40)
}
function validateTask(item) {
  if (!isObject(item) || !/^task-[\w-]+$/.test(assertText(item.id, 'INVALID_TASK_ID', 100))) throw new Error('INVALID_TASK')
  assertText(item.title, 'INVALID_TASK_TITLE', 180)
  if (!moduleNames.has(assertText(item.module, 'INVALID_TASK_MODULE', 40))) throw new Error('INVALID_TASK_MODULE')
  if (!Object.values(actors).some((actor) => actor.id === item.workerId)) throw new Error('INVALID_TASK_WORKER')
  if (actors.L2_CHECKER.id !== item.checkerId) throw new Error('INVALID_TASK_CHECKER')
  if (!Array.isArray(item.proofTypes) || item.proofTypes.length < 1 || item.proofTypes.some((type) => !proofTypes.has(type))) throw new Error('INVALID_TASK_PROOF_TYPES')
  if (!Array.isArray(item.evidence)) throw new Error('INVALID_TASK_EVIDENCE')
  item.evidence.forEach(validateEvidence)
  if (!Array.isArray(item.dependsOn) || item.dependsOn.some((id) => typeof id !== 'string')) throw new Error('INVALID_TASK_DEPENDENCIES')
  if (!taskStatuses.has(item.status)) throw new Error('INVALID_TASK_STATUS')
  if (item.status === 'LOCKED' && item.dependsOn.length === 0) throw new Error('INVALID_UNLOCKED_LOCK')
  if (item.status === 'PENDING_REVIEW' && item.evidence.length === 0) throw new Error('PROOF_REQUIRED')
  if (item.status === 'REJECTED' && !assertText(item.rejectionReason, 'REJECTION_REASON_REQUIRED', 1000)) throw new Error('REJECTION_REASON_REQUIRED')
  if (item.status !== 'REJECTED' && item.rejectionReason !== null) throw new Error('INVALID_REJECTION_REASON')
}
function validateAudit(item) {
  if (!isObject(item) || !/^audit-[\w-]+$/.test(assertText(item.id, 'INVALID_AUDIT_ID', 100))) throw new Error('INVALID_AUDIT')
  for (const key of ['at', 'action', 'actorId', 'actorName', 'role', 'ip', 'detail']) assertText(item[key], 'INVALID_AUDIT_FIELD', 1200)
  if (item.taskId !== null && typeof item.taskId !== 'string') throw new Error('INVALID_AUDIT_TASK')
  if (item.gps !== null && typeof item.gps !== 'string') throw new Error('INVALID_AUDIT_GPS')
}
function validateLegacyCase(item, module) {
  if (!isObject(item) || !/^([a-z]+)-[\w-]+$/.test(assertText(item.id, 'INVALID_CASE_ID', 80))) throw new Error('INVALID_CASE')
  assertText(item.title, 'INVALID_CASE_TITLE')
  if (!Number.isFinite(item.amount) || item.amount < 0 || item.amount > 1_000_000_000) throw new Error('INVALID_CASE_AMOUNT')
  if (typeof item.confidence !== 'number' || item.confidence < 0 || item.confidence > 1) throw new Error('INVALID_CASE_CONFIDENCE')
  if (!Array.isArray(item.evidenceIds) || item.evidenceIds.length < 1 || !Array.isArray(item.evidence) || item.evidence.length < 1) throw new Error('EVIDENCE_CHAIN_REQUIRED')
  if (item.status !== 'PENDING_REVIEW' && !decisions[module].has(item.status)) throw new Error('INVALID_CASE_STATUS')
}
function validateMasaLayout(layout) {
  if (!Array.isArray(layout) || layout.length !== cardTypes.size) throw new Error('INVALID_MASA_LAYOUT')
  const seen = new Set()
  for (const item of layout) {
    if (!isObject(item) || !cardTypes.has(item.id) || seen.has(item.id)) throw new Error('INVALID_MASA_LAYOUT')
    seen.add(item.id)
    for (const key of ['x', 'y', 'w', 'h', 'z']) if (!Number.isSafeInteger(item[key])) throw new Error('INVALID_MASA_LAYOUT')
    if (item.x < 0 || item.y < 0 || item.x > 1600 || item.y > 1200 || item.w < 270 || item.w > 620 || item.h < 130 || item.h > 470 || item.z < 1 || item.z > 1000) throw new Error('INVALID_MASA_LAYOUT')
    if (typeof item.pinned !== 'boolean' || typeof item.collapsed !== 'boolean') throw new Error('INVALID_MASA_LAYOUT')
  }
  return layout.map((item) => ({ ...item }))
}

export function validateFinance(state) {
  if (!isObject(state) || state.synthetic !== true || !isObject(state.workspace) || !Array.isArray(state.cards) || !Array.isArray(state.team) || !Array.isArray(state.tasks) || !Array.isArray(state.auditTrail) || !Array.isArray(state.cashflowScenarios)) throw new Error('INVALID_FINANCE_STATE')
  if (state.workspace.sector !== 'PROFESSIONAL_SERVICES' || state.workspace.containerTerm !== 'Müvekkil / Danışmanlık Proje Dosyası' || !isObject(state.workspace.container)) throw new Error('INVALID_WORKSPACE')
  if (!Array.isArray(state.workspace.masaLayout)) state.workspace.masaLayout = defaultMasaLayout()
  state.workspace.masaLayout = validateMasaLayout(state.workspace.masaLayout)
  if (state.cards.length < 1 || state.cards.some((card) => !isObject(card) || !cardTypes.has(card.type)) || new Set(state.cards.map((card) => card.type)).size !== state.cards.length) throw new Error('INVALID_CARDS')
  if (state.team.length !== 4 || state.team.some((member) => !isObject(member) || typeof member.id !== 'string')) throw new Error('INVALID_TEAM')
  state.tasks.forEach(validateTask)
  const taskIds = new Set(state.tasks.map((task) => task.id))
  for (const task of state.tasks) if (task.dependsOn.some((dependency) => !taskIds.has(dependency) || dependency === task.id)) throw new Error('INVALID_TASK_DEPENDENCY_REFERENCE')
  state.auditTrail.forEach(validateAudit)
  for (const scenario of state.cashflowScenarios) {
    if (!isObject(scenario) || !scenarioTemplates[scenario.templateId] || !/^cash-[\w-]+$/.test(assertText(scenario.id, 'INVALID_SCENARIO_ID', 80))) throw new Error('INVALID_CASHFLOW_SCENARIO')
    for (const key of ['opening', 'inflow', 'outflow', 'closing']) if (!Number.isFinite(scenario[key])) throw new Error('INVALID_CASHFLOW_VALUE')
  }
  for (const module of moduleNames) {
    if (!Array.isArray(state[module])) throw new Error('INVALID_MODULE_QUEUE')
    state[module].forEach((item) => validateLegacyCase(item, module))
  }
  return state
}

function visibleState(state, role) {
  const copy = clone(state)
  if (role === 'L1_ADMIN') return copy
  copy.tasks = copy.tasks.filter((task) => roleCanViewTask(role, task))
  const visibleTasks = new Set(copy.tasks.map((task) => task.id))
  copy.auditTrail = copy.auditTrail.filter((entry) => entry.taskId === null || visibleTasks.has(entry.taskId))
  if (role !== 'L2_CHECKER') {
    copy.cashflowScenarios = []
    copy.collections = []
    copy.claims = []
    copy.aml = []
  }
  return copy
}

function validateBase64(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9+/]*={0,2}$/.test(value) || value.length % 4 !== 0) throw new Error('INVALID_PROOF_FILE')
  const bytes = Buffer.from(value, 'base64')
  if (bytes.length < 1 || bytes.length > 2_000_000) throw new Error('INVALID_PROOF_SIZE')
  return bytes
}
function safeFileName(value) { return assertText(value, 'INVALID_PROOF_NAME', 180).replace(/[^a-zA-Z0-9._-]/g, '_') }
function validateRiskBriefing(result, taskId) {
  if (!isObject(result) || result.label !== 'AI-ASSISTED · SENTETİK DEMO' || result.taskId !== taskId || result.decision !== 'HUMAN_REVIEW_REQUIRED' || !Array.isArray(result.signals) || result.signals.length < 1 || result.signals.some((signal) => typeof signal !== 'string' || !signal.trim() || signal.length > 600)) throw new Error('AI_RESPONSE_INVALID')
  return result
}

function persistenceError(action, cause) {
  const detail = cause instanceof Error && cause.message ? ` (${cause.message})` : ''
  const error = new Error(`Upstash KV ${action} başarısız; yerel depoya fallback yapılmadı${detail}`)
  error.status = 503
  return error
}

function createFilePersistence(filePath) {
  async function atomicWrite(state) {
    await mkdir(dirname(filePath), { recursive: true })
    const temporary = `${filePath}.${process.pid}.${randomUUID()}.tmp`
    await writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`, 'utf8')
    await rename(temporary, filePath)
  }

  return {
    kind: 'json-file',
    async readState() {
      try { return JSON.parse(await readFile(filePath, 'utf8')) }
      catch (error) {
        if (error?.code === 'ENOENT') return null
        const failure = new Error('Kalıcı veri dosyası okunamıyor; dosya korunarak müdahale bekleniyor')
        failure.status = 503
        throw failure
      }
    },
    writeState: atomicWrite,
    async writeEvidence({ taskId, safeFileName, evidenceId, bytes }) {
      const storageKey = `${taskId}/${evidenceId}-${safeFileName}`
      const target = join(dirname(filePath), 'proofs', storageKey)
      await mkdir(dirname(target), { recursive: true })
      await writeFile(target, bytes, { flag: 'wx' })
      return storageKey
    },
  }
}

function createUpstashPersistence({ url, token, fetchImpl }) {
  const baseUrl = url.replace(/\/+$/, '')
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'text/plain; charset=utf-8' }

  async function request(command, key, body) {
    let response
    try {
      response = await fetchImpl(`${baseUrl}/${command}/${encodeURIComponent(key)}`, {
        method: command === 'get' ? 'GET' : 'POST', headers, ...(body === undefined ? {} : { body }),
      })
    } catch (error) { throw persistenceError('erişimi', error) }
    if (!response.ok) throw persistenceError('erişimi', new Error(`HTTP ${response.status}`))
    let payload
    try { payload = await response.json() } catch (error) { throw persistenceError('yanıtı', error) }
    if (payload?.error) throw persistenceError('yanıtı', new Error(String(payload.error)))
    return payload?.result
  }

  return {
    kind: 'upstash-kv',
    async readState() {
      const serialized = await request('get', STORE_KEY)
      if (serialized == null) return null
      if (typeof serialized !== 'string') throw persistenceError('verisi', new Error('State değeri metin değil'))
      try { return JSON.parse(serialized) } catch (error) { throw persistenceError('verisi', error) }
    },
    async writeState(state) { await request('set', STORE_KEY, JSON.stringify(state)) },
    async writeEvidence({ evidenceId, bytes }) {
      const storageKey = `${EVIDENCE_KEY_PREFIX}${evidenceId}`
      await request('set', storageKey, bytes.toString('base64'))
      return storageKey
    },
  }
}

function unavailablePersistence(message) {
  const error = new Error(message)
  error.status = 503
  return { kind: 'upstash-misconfigured', async readState() { throw error }, async writeState() { throw error }, async writeEvidence() { throw error } }
}

function createPersistence(filePath, env, fetchImpl) {
  const url = typeof env?.KV_REST_API_URL === 'string' ? env.KV_REST_API_URL.trim() : ''
  const token = typeof env?.KV_REST_API_TOKEN === 'string' ? env.KV_REST_API_TOKEN.trim() : ''
  const deployedOnVercel = env?.VERCEL === '1'
  if (url || token) {
    if (!url || !token) {
      return unavailablePersistence('Upstash KV için KV_REST_API_URL ve KV_REST_API_TOKEN birlikte zorunludur; yerel depoya fallback yapılmadı')
    }
    if (typeof fetchImpl !== 'function') {
      return unavailablePersistence('Upstash KV için fetch kullanılabilir olmalıdır; yerel depoya fallback yapılmadı')
    }
    return createUpstashPersistence({ url, token, fetchImpl })
  }
  if (deployedOnVercel) return unavailablePersistence('Vercel üretiminde KV_REST_API_URL ve KV_REST_API_TOKEN zorunludur; yerel depoya fallback yapılmadı')
  return createFilePersistence(filePath)
}

export class FinanceStore {
  constructor(dataFile, initial = financeSeed, aiProvider = createFinanceAIProvider(), { env = process.env, fetchImpl = globalThis.fetch } = {}) {
    this.dataFile = dataFile
    this.initial = clone(initial)
    this.aiProvider = aiProvider
    this.persistence = createPersistence(dataFile, env, fetchImpl)
    this.writeQueue = Promise.resolve()
  }

  async read() {
    const state = await this.persistence.readState()
    if (state == null) {
      const initial = validateFinance(clone(this.initial))
      await this.write(initial)
      return initial
    }
    return validateFinance(state)
  }
  async write(state) { await this.persistence.writeState(state) }
  async mutate(operation) {
    const next = this.writeQueue.then(operation, operation)
    this.writeQueue = next.catch(() => undefined)
    return next
  }
  async snapshot(role) { return visibleState(await this.read(), assertRole(role)) }

  async createScenario(role, input, context) {
    if (assertRole(role) !== 'L1_ADMIN') throw new Error('RBAC_DENIED')
    assertAllowed(input, new Set(['templateId']))
    if (!Object.hasOwn(scenarioTemplates, input.templateId)) throw new Error('UNKNOWN_SCENARIO_TEMPLATE')
    return this.mutate(async () => {
      const state = await this.read()
      const scenario = { id: `cash-${randomUUID().slice(0, 8)}`, templateId: input.templateId, ...scenarioTemplates[input.templateId], createdAt: now() }
      state.cashflowScenarios.unshift(scenario)
      audit(state, { action: 'SCENARIO_CREATED', actor: actorFor(role), context, detail: `Sentetik ${input.templateId} nakit akışı senaryosu oluşturuldu.` })
      await this.write(state)
      return scenario
    })
  }

  async saveCards(role, input, context) {
    if (assertRole(role) !== 'L1_ADMIN') throw new Error('RBAC_DENIED')
    assertAllowed(input, new Set(['cards']))
    if (!Array.isArray(input.cards) || input.cards.length < 1 || input.cards.length > cardTypes.size) throw new Error('INVALID_CARDS')
    const cards = input.cards.map((card) => {
      if (!isObject(card) || !cardTypes.has(card.type) || Object.keys(card).some((key) => key !== 'type')) throw new Error('INVALID_CARD')
      return { type: card.type }
    })
    if (new Set(cards.map((card) => card.type)).size !== cards.length) throw new Error('DUPLICATE_CARD')
    return this.mutate(async () => {
      const state = await this.read()
      state.cards = cards
      audit(state, { action: 'PUCK_CARDS_SAVED', actor: actorFor(role), context, detail: `${cards.length} izinli masa kartı kaydedildi.` })
      await this.write(state)
      return state.cards
    })
  }

  async saveMasaLayout(role, input, context) {
    if (assertRole(role) !== 'L1_ADMIN') throw new Error('RBAC_DENIED')
    assertAllowed(input, new Set(['layout']))
    const layout = validateMasaLayout(input.layout)
    return this.mutate(async () => {
      const state = await this.read()
      state.workspace.masaLayout = layout
      audit(state, { action: 'MASA_LAYOUT_SAVED', actor: actorFor(role), context, detail: 'Masa kart konumları ve boyutları kalıcı kayda alındı.' })
      await this.write(state)
      return state.workspace.masaLayout
    })
  }

  async uploadEvidence(role, taskId, input, context) {
    const normalizedRole = assertRole(role)
    if (normalizedRole !== 'L3_WORKER' && normalizedRole !== 'L4_FIELD') throw new Error('RBAC_DENIED')
    assertAllowed(input, new Set(['type', 'file', 'gps']))
    if (!proofTypes.has(assertText(input.type, 'INVALID_PROOF_TYPE', 40)) || !isObject(input.file)) throw new Error('INVALID_PROOF')
    assertAllowed(input.file, new Set(['name', 'mimeType', 'base64', 'sha256']))
    const actor = actorFor(normalizedRole)
    const meta = requestMeta({ ...context, gps: input.gps })
    return this.mutate(async () => {
      const state = await this.read()
      const task = state.tasks.find((candidate) => candidate.id === taskId)
      if (!task) return null
      if (task.workerId !== actor.id || !roleCanViewTask(normalizedRole, task)) throw new Error('RBAC_DENIED')
      if (task.status === 'LOCKED' || task.status === 'APPROVED' || task.status === 'PENDING_REVIEW') throw new Error('TASK_NOT_ACCEPTING_PROOF')
      if (!task.proofTypes.includes(input.type)) throw new Error('UNREQUESTED_PROOF_TYPE')
      const bytes = validateBase64(input.file.base64)
      const hash = createHash('sha256').update(bytes).digest('hex')
      if (hash !== assertText(input.file.sha256, 'INVALID_PROOF_HASH', 64)) throw new Error('PROOF_HASH_MISMATCH')
      const fileName = safeFileName(input.file.name)
      const mimeType = assertText(input.file.mimeType, 'INVALID_PROOF_MIME', 120)
      const evidenceId = `proof-${randomUUID()}`
      const storageKey = await this.persistence.writeEvidence({ evidenceId, taskId, safeFileName: fileName, bytes })
      const evidence = { id: evidenceId, type: input.type, fileName, mimeType, size: bytes.length, sha256: hash, storageKey, uploadedAt: now() }
      task.evidence.push(evidence)
      audit(state, { action: 'PROOF_UPLOADED', actor, taskId, context: meta, detail: `${input.type} kanıtı SHA-256 ile kayda alındı: ${fileName}` })
      await this.write(state)
      return { task, evidence }
    })
  }

  async submitTask(role, taskId, input, context) {
    const normalizedRole = assertRole(role)
    if (normalizedRole !== 'L3_WORKER' && normalizedRole !== 'L4_FIELD') throw new Error('RBAC_DENIED')
    assertAllowed(input, new Set(['gps']))
    const actor = actorFor(normalizedRole)
    return this.mutate(async () => {
      const state = await this.read()
      const task = state.tasks.find((candidate) => candidate.id === taskId)
      if (!task) return null
      if (task.workerId !== actor.id || task.status !== 'READY' && task.status !== 'REJECTED') throw new Error('TASK_NOT_SUBMITTABLE')
      if (!task.proofTypes.every((type) => task.evidence.some((proof) => proof.type === type))) throw new Error('PROOF_REQUIRED')
      task.status = 'PENDING_REVIEW'
      task.rejectionReason = null
      task.submittedAt = now()
      audit(state, { action: 'SUBMITTED_FOR_REVIEW', actor, taskId, context: { ...context, gps: input.gps }, detail: 'Worker kanıt zinciriyle checker incelemesine gönderdi.' })
      await this.write(state)
      return task
    })
  }

  async reviewTask(role, taskId, input, context) {
    if (assertRole(role) !== 'L2_CHECKER') throw new Error('RBAC_DENIED')
    assertAllowed(input, new Set(['decision', 'reason', 'gps']))
    if (input.decision !== 'APPROVE' && input.decision !== 'REJECT') throw new Error('INVALID_REVIEW_DECISION')
    if (input.decision === 'REJECT') assertText(input.reason, 'REJECTION_REASON_REQUIRED', 1000)
    if (input.decision === 'APPROVE' && own(input, 'reason')) throw new Error('UNEXPECTED_FIELD:reason')
    const actor = actorFor(role)
    return this.mutate(async () => {
      const state = await this.read()
      const task = state.tasks.find((candidate) => candidate.id === taskId)
      if (!task) return null
      if (task.checkerId !== actor.id || task.status !== 'PENDING_REVIEW') throw new Error('TASK_NOT_REVIEWABLE')
      if (input.decision === 'REJECT') {
        task.status = 'REJECTED'
        task.rejectionReason = assertText(input.reason, 'REJECTION_REASON_REQUIRED', 1000)
        audit(state, { action: 'PROOF_REJECTED', actor, taskId, context: { ...context, gps: input.gps }, detail: task.rejectionReason })
      } else {
        task.status = 'APPROVED'
        task.approvedAt = now()
        audit(state, { action: 'PROOF_APPROVED', actor, taskId, context: { ...context, gps: input.gps }, detail: 'Checker kanıt zincirini onayladı.' })
        for (const dependent of state.tasks.filter((candidate) => candidate.status === 'LOCKED' && candidate.dependsOn.includes(task.id))) {
          if (dependent.dependsOn.every((dependency) => state.tasks.find((candidate) => candidate.id === dependency)?.status === 'APPROVED')) {
            dependent.status = 'READY'
            audit(state, { action: 'SEQUENTIAL_GATE_OPENED', actor, taskId: dependent.id, context, detail: `${task.id} onayıyla sonraki görev açıldı.` })
          }
        }
      }
      await this.write(state)
      return task
    })
  }

  async riskBriefing(role, taskId, context) {
    const normalizedRole = assertRole(role)
    if (normalizedRole !== 'L1_ADMIN' && normalizedRole !== 'L2_CHECKER') throw new Error('RBAC_DENIED')
    return this.mutate(async () => {
      const state = await this.read()
      const task = state.tasks.find((candidate) => candidate.id === taskId)
      if (!task) return null
      if (!roleCanViewTask(normalizedRole, task)) throw new Error('RBAC_DENIED')
      const result = validateRiskBriefing(await this.aiProvider.assess({ task: clone(task) }), taskId)
      audit(state, { action: 'AI_RISK_BRIEFING_REQUESTED', actor: actorFor(normalizedRole), taskId, context, detail: 'Sentetik AI ön-denetim sonucu hazırlandı; insan incelemesi zorunlu.' })
      await this.write(state)
      return result
    })
  }
}
