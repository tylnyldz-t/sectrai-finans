// API istemcisi — token localStorage'da; her hata Türkçe mesajla fırlatılır.

import type { Conversation, Entitlements, GovernanceEvent, ModuleRecord, PublicUser, Purpose, Workspace } from '@shared/types.ts';
import type { ModuleSchema } from '@shared/types.ts';
import type { DashboardDesign } from '@shared/dashboard-design.ts';
import type { ProviderStatus } from '@shared/providers.ts';
import type { ModuleDefinitionV2, ModuleRevisionV2, WorkflowInstanceBundle, WorkflowStepStatus } from '@shared/adaptive-modules.ts';
import { closeAdminGateSession, resolveAdminGateUser } from './admin-gate';

const TOKEN_KEY = 'sectrai.token';

export const getToken = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};
export const setToken = (t: string | null): void => {
  try {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* no-op */
  }
};

export interface ConversationSummary {
  id: string;
  title: string;
  purpose: Purpose | null;
  hasWorkspace: boolean;
  pinned: boolean;
  archived: boolean;
  assigned: boolean;
  updatedAt: string;
}

export interface AdaptiveModuleStudioItem {
  definition: ModuleDefinitionV2;
  activeRevision: ModuleRevisionV2 | null;
  revisions: ModuleRevisionV2[];
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(path, {
    // same-origin (varsayılan): oturum çerezi (cross-subdomain SSO) otomatik gönderilir; token yoksa
    // Authorization başlığı atlanır ve çerez yolu devreye girer.
    credentials: 'same-origin',
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new Error(typeof body.error === 'string' ? body.error : `İstek başarısız (${res.status})`);
  return body as T;
}

export const api = {
  register: (input: { email: string; name: string; password: string }) =>
    call<{ token: string; user: PublicUser; conversationId: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  login: (input: { email: string; password: string }) =>
    call<{ token: string; user: PublicUser }>('/api/auth/login', { method: 'POST', body: JSON.stringify(input) }),
  me: async () => {
    const response = await call<{ user: PublicUser; features: { adaptiveModulesV2: boolean } }>('/api/auth/me');
    return { ...response, user: await resolveAdminGateUser(response.user) };
  },
  logout: () => call<{ ok: true }>('/api/auth/logout', { method: 'POST' }),
  conversations: () => call<{ conversations: ConversationSummary[] }>('/api/conversations'),
  createConversation: () => call<{ conversation: Conversation }>('/api/conversations', { method: 'POST' }),
  conversation: (id: string) => call<{ conversation: Conversation }>(`/api/conversations/${id}`),
  updateConversationMeta: (id: string, patch: Partial<Pick<ConversationSummary, 'title' | 'pinned' | 'archived' | 'assigned'>>) =>
    call<{ conversation: Conversation }>(`/api/conversations/${id}/meta`, {
      method: 'PUT',
      body: JSON.stringify(patch),
    }),
  sendMessage: (id: string, text: string, view: 'chat' | 'work') =>
    call<{ conversation: Conversation }>(`/api/conversations/${id}/messages`, {
      method: 'POST',
      body: JSON.stringify({ text, view }),
    }),
  setPurpose: (id: string, purpose: Purpose) =>
    call<{ conversation: Conversation }>(`/api/conversations/${id}/purpose`, {
      method: 'POST',
      body: JSON.stringify({ purpose }),
    }),
  approve: (id: string, approvalId: string) =>
    call<{ conversation: Conversation }>(`/api/conversations/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ approvalId }),
    }),
  reject: (id: string, approvalId: string) =>
    call<{ conversation: Conversation }>(`/api/conversations/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ approvalId }),
    }),
  setDomain: (id: string, slug: string) =>
    call<{ conversation: Conversation }>(`/api/conversations/${id}/domain`, {
      method: 'POST',
      body: JSON.stringify({ slug }),
    }),
  // ── Host / çalışma alanları ──
  host: () =>
    call<
      | { mode: 'root' }
      | { mode: 'workspace'; slug: string; title: string; purpose: Purpose }
      | { mode: 'sector-demo'; subdomain: string; requiresAdmin: boolean }
      | { mode: 'redirect'; url: string; slug: string }
      | { mode: 'reserved-inactive'; slug: string }
    >('/api/host'),
  // Sektör-demo verisi ADMIN-ONLY — token yoksa/normal kullanıcıysa 401/403 fırlatır.
  demoWorkspace: (subdomain: string) => call<{ workspace: Workspace }>(`/api/demo/${subdomain}`),
  workspaces: () => call<{ workspaces: Workspace[] }>('/api/workspaces'),
  workspaceBySlug: (slug: string) => call<{ workspace: Workspace }>(`/api/workspaces/by-slug/${slug}`),
  setCustomDomain: (id: string, domain: string) =>
    call<{ workspace: Workspace }>(`/api/workspaces/${id}/custom-domain`, {
      method: 'POST',
      body: JSON.stringify({ domain }),
    }),
  saveDashboardDesign: (id: string, design: DashboardDesign) =>
    call<{ workspace: Workspace }>(`/api/workspaces/${id}/dashboard-design`, {
      method: 'PUT',
      body: JSON.stringify({ design }),
    }),
  saveMasaLayout: (id: string, layout: Workspace['masaLayout']) =>
    call<{ workspace: Workspace }>(`/api/workspaces/${id}/masa-layout`, {
      method: 'PUT',
      body: JSON.stringify({ layout }),
    }),
  // ── Uyarlanabilir Modül Studio: dashboard Puck'tan bağımsız, owner-only revizyon akışı ──
  adaptiveModules: (workspaceId: string) =>
    call<{ modules: AdaptiveModuleStudioItem[] }>(`/api/workspaces/${workspaceId}/adaptive-modules`),
  saveAdaptiveDraft: (workspaceId: string, definitionId: string, baseRevisionId: string, draft: unknown) =>
    call<{ revision: ModuleRevisionV2 }>(`/api/workspaces/${workspaceId}/adaptive-modules/${definitionId}/draft`, {
      method: 'PUT', body: JSON.stringify({ baseRevisionId, draft }),
    }),
  proposeAdaptiveRevision: (workspaceId: string, definitionId: string, revisionId: string) =>
    call<{ revision: ModuleRevisionV2 }>(`/api/workspaces/${workspaceId}/adaptive-modules/${definitionId}/revisions/${revisionId}/propose`, {
      method: 'POST', body: '{}',
    }),
  approveAdaptiveRevision: (workspaceId: string, definitionId: string, revisionId: string) =>
    call<{ definition: ModuleDefinitionV2; revision: ModuleRevisionV2 }>(`/api/workspaces/${workspaceId}/adaptive-modules/${definitionId}/revisions/${revisionId}/approve`, {
      method: 'POST', body: '{}',
    }),
  adaptiveWorkflows: (workspaceId: string) =>
    call<{ instances: WorkflowInstanceBundle[] }>(`/api/workspaces/${workspaceId}/adaptive-workflows`),
  createAdaptiveWorkflow: (workspaceId: string, input: { definitionId: string; workflowId: string; title: string; idempotencyKey: string }) =>
    call<{ instance: WorkflowInstanceBundle }>(`/api/workspaces/${workspaceId}/adaptive-workflows`, {
      method: 'POST', body: JSON.stringify(input),
    }),
  updateAdaptiveWorkflowStep: (workspaceId: string, workflowInstanceId: string, stepInstanceId: string, input: { status?: WorkflowStepStatus; manualNote?: string }) =>
    call<{ instance: WorkflowInstanceBundle }>(`/api/workspaces/${workspaceId}/adaptive-workflows/${workflowInstanceId}/steps/${stepInstanceId}`, {
      method: 'PATCH', body: JSON.stringify(input),
    }),
  // ── GERÇEK modül kayıtları (alanlı form → kalıcı CRUD) ──
  moduleRecords: (wsId: string, moduleId: string) =>
    call<{ records: ModuleRecord[]; schema: ModuleSchema; moduleLabel: string }>(`/api/workspaces/${wsId}/modules/${moduleId}/records`),
  createModuleRecord: (wsId: string, moduleId: string, values: Record<string, unknown>, status?: string) =>
    call<{ record: ModuleRecord }>(`/api/workspaces/${wsId}/modules/${moduleId}/records`, {
      method: 'POST',
      body: JSON.stringify({ values, status }),
    }),
  updateModuleRecord: (wsId: string, moduleId: string, recordId: string, values: Record<string, unknown>, status?: string) =>
    call<{ record: ModuleRecord }>(`/api/workspaces/${wsId}/modules/${moduleId}/records/${recordId}`, {
      method: 'PUT',
      body: JSON.stringify({ values, status }),
    }),
  deleteModuleRecord: (wsId: string, moduleId: string, recordId: string) =>
    call<{ ok: true }>(`/api/workspaces/${wsId}/modules/${moduleId}/records/${recordId}`, { method: 'DELETE' }),
  // ── Admin: erişim yönetimi ──
  adminUsers: () => call<{ users: PublicUser[] }>('/api/admin/users'),
  adminDecide: (userId: string, action: 'approve' | 'reject' | 'suspend' | 'reactivate') =>
    call<{ user: PublicUser }>(`/api/admin/users/${userId}/${action}`, { method: 'POST' }),
  adminEntitlements: (userId: string, entitlements: Entitlements) =>
    call<{ user: PublicUser }>(`/api/admin/users/${userId}/entitlements`, {
      method: 'POST',
      body: JSON.stringify(entitlements),
    }),
  // ── Admin: AI sağlayıcı anahtarları (anahtar geri dönmez, yalnız durum) ──
  adminProviders: () =>
    call<{ providers: ProviderStatus[]; brainMode: 'LLM' | 'SYNTHETIC'; brainProvider: string | null; note: string }>(
      '/api/admin/providers',
    ),
  adminSetProviderKey: (id: string, key: string) =>
    call<{
      provider: { id: string; configured: boolean; setAt: string | null; setBy: string | null; verifiedAt: string | null };
      verify: { ok: boolean; note: string };
    }>(`/api/admin/providers/${id}`, {
      method: 'POST',
      body: JSON.stringify({ key }),
    }),
  adminDeleteProviderKey: (id: string) =>
    call<{ provider: { id: string; configured: boolean } }>(`/api/admin/providers/${id}`, { method: 'DELETE' }),
  // ── Admin: yönetişim günlüğü (hangi admin ne yaptı — sır taşımaz) ──
  adminGovernance: () => call<{ events: GovernanceEvent[] }>('/api/admin/governance'),
};

/** Bilinçli çıkış: oturumu sunucuda İPTAL et (revocation), sonra istemci token'ını temizle. */
export async function doLogout(): Promise<void> {
  try {
    await api.logout();
  } catch {
    /* token zaten geçersiz olabilir — yine de yereli temizle */
  }
  setToken(null);
  await closeAdminGateSession();
}
