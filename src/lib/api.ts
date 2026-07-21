export type Role = 'L1_ADMIN' | 'L2_CHECKER' | 'L3_WORKER' | 'L4_FIELD'
export type CardType = 'workflow' | 'ledger' | 'roles' | 'audit'
export type ProofType = 'PDF' | 'FOTOĞRAF' | 'GPS' | 'DİJİTAL_İMZA' | 'BARKOD'
export type TaskStatus = 'LOCKED' | 'READY' | 'PENDING_REVIEW' | 'REJECTED' | 'APPROVED'

export type TeamMember = { id: string; name: string; role: string; department: string; level: 'L1' | 'L2' | 'L3' | 'L4' }
export type Evidence = { id: string; type: ProofType; fileName: string; mimeType: string; size: number; sha256: string; storageKey: string; uploadedAt: string }
export type Task = { id: string; title: string; module: 'collections' | 'claims' | 'aml'; workerId: string; checkerId: string; proofTypes: ProofType[]; evidence: Evidence[]; dependsOn: string[]; status: TaskStatus; rejectionReason: string | null; submittedAt: string | null; approvedAt: string | null }
export type AuditEvent = { id: string; at: string; action: string; taskId: string | null; actorId: string; actorName: string; role: string; ip: string; gps: string | null; detail: string }
export type RiskBriefing = { label: 'AI-ASSISTED · SENTETİK DEMO'; taskId: string; signals: string[]; decision: 'HUMAN_REVIEW_REQUIRED' }
export type CashflowScenario = { id: string; templateId: string; title: string; horizon: string; opening: number; inflow: number; outflow: number; closing: number; createdAt: string }
export type FinanceCase = { id: string; title: string; amount: number; confidence: number; evidenceIds: string[]; evidence: string[]; status: string }
export type FinanceState = {
  synthetic: true
  workspace: { id: string; sector: 'PROFESSIONAL_SERVICES'; sectorLabel: string; containerTerm: 'Müvekkil / Danışmanlık Proje Dosyası'; container: { id: string; title: string; client: string; status: string } }
  cards: Array<{ type: CardType }>
  team: TeamMember[]
  tasks: Task[]
  auditTrail: AuditEvent[]
  cashflowScenarios: CashflowScenario[]
  collections: FinanceCase[]
  claims: FinanceCase[]
  aml: FinanceCase[]
}

const headers = (role: Role) => ({ 'content-type': 'application/json', 'x-sectrai-role': role })
async function request<T>(role: Role, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...init, headers: { ...headers(role), ...init?.headers } })
  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as { error?: string }
    throw new Error(payload.error || `API_${response.status}`)
  }
  return response.json() as Promise<T>
}

export async function getFinance(role: Role): Promise<FinanceState> { return (await request<{ state: FinanceState }>(role, '/api/finance')).state }
export async function createScenario(role: Role, templateId: string): Promise<CashflowScenario> { return (await request<{ scenario: CashflowScenario }>(role, '/api/finance/cashflow-scenarios', { method: 'POST', body: JSON.stringify({ templateId }) })).scenario }
export async function saveCards(role: Role, cards: Array<{ type: CardType }>): Promise<Array<{ type: CardType }>> { return (await request<{ cards: Array<{ type: CardType }> }>(role, '/api/finance/cards', { method: 'PUT', body: JSON.stringify({ cards }) })).cards }
export async function uploadEvidence(role: Role, taskId: string, payload: { type: ProofType; file: { name: string; mimeType: string; base64: string; sha256: string }; gps?: string }): Promise<{ task: Task; evidence: Evidence }> { return request(role, `/api/finance/tasks/${encodeURIComponent(taskId)}/evidence`, { method: 'POST', body: JSON.stringify(payload) }) }
export async function submitTask(role: Role, taskId: string, gps?: string): Promise<Task> { return (await request<{ task: Task }>(role, `/api/finance/tasks/${encodeURIComponent(taskId)}/submit`, { method: 'POST', body: JSON.stringify(gps ? { gps } : {}) })).task }
export async function reviewTask(role: Role, taskId: string, decision: 'APPROVE' | 'REJECT', reason?: string, gps?: string): Promise<Task> {
  const body: { decision: 'APPROVE' | 'REJECT'; reason?: string; gps?: string } = { decision }
  if (decision === 'REJECT') body.reason = reason ?? ''
  if (gps) body.gps = gps
  return (await request<{ task: Task }>(role, `/api/finance/tasks/${encodeURIComponent(taskId)}/review`, { method: 'PATCH', body: JSON.stringify(body) })).task
}
export async function riskBriefing(role: Role, taskId: string): Promise<RiskBriefing> { return (await request<{ briefing: RiskBriefing }>(role, `/api/finance/tasks/${encodeURIComponent(taskId)}/risk-briefing`, { method: 'POST', body: '{}' })).briefing }
