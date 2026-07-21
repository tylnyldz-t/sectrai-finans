export type ModuleName = 'collections' | 'claims' | 'aml'
export type Decision = 'FOLLOW_UP' | 'HOLD' | 'REQUEST_EVIDENCE' | 'CLOSE_REVIEW' | 'ESCALATE_REVIEW' | 'CLOSE_ALERT'
export type FinanceCase = { id: string; title: string; amount: number; confidence: number; evidenceIds: string[]; evidence: string[]; status: string; ownerDecision?: { by: string; at: string } }
export type CashflowScenario = { id: string; templateId: string; title: string; horizon: string; opening: number; inflow: number; outflow: number; closing: number; createdAt: string }
export type FinanceState = { synthetic: true; cashflowScenarios: CashflowScenario[]; collections: FinanceCase[]; claims: FinanceCase[]; aml: FinanceCase[] }
export type Briefing = { label: 'AI-GENERATED · SENTETİK DEMO'; text: string; evidenceIds: string[] }

const headers = { 'content-type': 'application/json', 'x-sectrai-role': 'OWNER' }
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...init, headers: { ...headers, ...init?.headers } })
  if (!response.ok) throw new Error(`API_${response.status}`)
  return response.json() as Promise<T>
}
export async function getFinance(): Promise<FinanceState> { return (await request<{ state: FinanceState }>('/api/finance')).state }
export async function createScenario(templateId: string): Promise<CashflowScenario> { return (await request<{ scenario: CashflowScenario }>('/api/finance/cashflow-scenarios', { method: 'POST', body: JSON.stringify({ templateId }) })).scenario }
export async function decide(module: ModuleName, id: string, status: Decision): Promise<FinanceCase> { return (await request<{ item: FinanceCase }>(`/api/finance/${module}/${encodeURIComponent(id)}/decision`, { method: 'PATCH', body: JSON.stringify({ status }) })).item }
export async function briefing(module: ModuleName, id: string): Promise<Briefing> { return (await request<{ briefing: Briefing }>(`/api/finance/${module}/${encodeURIComponent(id)}/briefing`, { method: 'POST', body: '{}' })).briefing }
