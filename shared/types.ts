// SECTRAI ön-kapı alan tipleri.
// Kaynak desenler (salt-okunur port): sectrai-unified-ai-os-foundation/src/core/{panels,front-door,routing}.mjs,
// sektral/packages/compose/src/types.ts (ModuleSchema/SchemaField), sektral/apps/api/src/operator.ts (risk sınıfları).

export type PanelType =
  | 'recommendation'
  | 'requirements-summary'
  | 'form'
  | 'workspace-preview'
  | 'handoff-preview'
  | 'approval'
  | 'task-list'
  | 'notification'
  | 'audit-timeline'
  | 'memory-controls'
  | 'clarification';

export interface Panel {
  type: PanelType;
  data: Record<string, unknown>;
}

export type Purpose = 'business' | 'individual';
export type Risk = 'low' | 'medium' | 'high';

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
  /** AI mesajına iliştirilen hızlı-seçim çipleri (sektör/teklif seçimi) */
  chips?: { value: string; label: string }[];
  createdAt: string;
}

export interface AuditEvent {
  eventId: string;
  eventType: string;
  decision: string;
  evidenceRefs: string[];
  at: string;
}

export interface ApprovalRequest {
  approvalId: string;
  action: string;
  risk: Risk;
  status: 'PROPOSED' | 'APPROVED' | 'REJECTED';
  summary: string;
  /** FAZ 2 adaptif tekliflerinde sunucu-hesaplı değişmez özet doğrulaması. */
  proposalId?: string;
  contentHash?: string;
  expiresAt?: string;
}

// ── Modül-şema dili (sektral compose ModuleSchema birebir biçimi — CAP-032 taslakları bu dilde üretilir) ──

export type SchemaFieldType =
  | 'text'
  | 'textarea'
  | 'email'
  | 'tel'
  | 'number'
  | 'integer'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'enum'
  | 'ref'
  | 'user';
export type Tone = 'neutral' | 'info' | 'good' | 'warn' | 'bad';

export interface SchemaField {
  key: string;
  label: string;
  type: SchemaFieldType;
  required?: boolean;
  enumValues?: { value: string; label: string; tone?: Tone }[];
  refModule?: string;
  min?: number;
  max?: number;
  maxLength?: number;
  unique?: boolean;
  currency?: boolean;
  placeholder?: string;
  helpText?: string;
}

export interface ModuleSchema {
  table: string;
  noun?: string;
  fields: SchemaField[];
  statuses?: { value: string; label: string; tone?: Tone; approval?: boolean }[];
  columns?: string[];
}

/** Yeni-modül taslağı (bireysel "yarat" akışı) — manifest + şema + kanıt birlikte taşınır */
export interface ModuleDraft {
  id: string;
  tier: 0 | 1;
  kind: 'generic';
  name: string;
  description: string;
  capabilities: string[];
  dependencies: string[];
  sectorLabels: Record<string, string>;
  schema: ModuleSchema;
  /** Kanıt-temelli öneri ilkesi (Firma Hafızası deseni): taslağın hangi ifadelerden türediği */
  evidence: string[];
}

export interface WorkspaceState {
  kind: 'sector' | 'offering' | 'custom';
  title: string;
  sectorId?: string;
  offeringId?: string;
  modules: { id: string; label: string }[];
  draft?: ModuleDraft;
  installedAt: string;
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  purpose: Purpose | null;
  messages: ChatMessage[];
  panels: Panel[];
  audit: AuditEvent[];
  approval: ApprovalRequest | null;
  /** Onay bekleyen öneri — approve edilirse workspace'e dönüşür. AI kendi kendine onaylayamaz. */
  pendingProposal: PendingProposal | null;
  /** Feature-flag açıkken çoklu, hash/expiry kapılı adaptif teklif seti. */
  adaptiveProposal?: import('./adaptive-modules.js').AdaptiveProposalSet | null;
  workspace: WorkspaceState | null;
  /** Onay sonrası oluşturulan kalıcı Workspace kaydının kimliği */
  workspaceId: string | null;
  /** Sohbet arşivi durumları — kullanıcı başına kalıcı, arşivden geri alınabilir. */
  pinned?: boolean;
  archived?: boolean;
  /** Atama yalnız görünür bağlam bilgisidir; hiçbir yetki devri sağlamaz. */
  assigned?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PendingProposal {
  kind: 'sector' | 'offering' | 'custom';
  title: string;
  sectorId?: string;
  offeringId?: string;
  modules: { id: string; label: string }[];
  draft?: ModuleDraft;
}

// Erişim yaşam döngüsü — sektral auth.ts deseni: public kayıt bir ERİŞİM BAŞVURUSUDUR.
// SUSPENDED: onay SONRASI erişimi geri-alma (reddetmekten farklı; owner tekrar açabilir).
export type PlatformRole = 'USER' | 'ADMIN';
export type AccountStatus = 'PENDING_APPROVAL' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED';

/** Owner'ın onay-sonrası daraltıp genişletebildiği erişim kapıları (fail-closed enforce edilir). */
export interface Entitlements {
  business: boolean;
  individual: boolean;
}

/** Platform-düzeyi yönetişim olayı: HANGİ admin, KİME/NEYE, NE yaptı, NE ZAMAN. Hesap-verebilirlik
 * (ADOS: her karar iz bırakır). Sır ASLA taşımaz — sağlayıcı anahtarı için yalnız "ayarlandı/silindi". */
export type GovernanceAction =
  | 'USER_APPROVED'
  | 'USER_REJECTED'
  | 'USER_SUSPENDED'
  | 'USER_REACTIVATED'
  | 'ENTITLEMENTS_CHANGED'
  | 'PROVIDER_KEY_SET'
  | 'PROVIDER_KEY_DELETED';

export interface GovernanceEvent {
  id: string;
  at: string;
  actorId: string;
  actorEmail: string;
  action: GovernanceAction;
  targetType: 'user' | 'provider';
  targetId: string;
  /** İnsan-okunur ayrıntı. ASLA sır/anahtar içermez. */
  detail: string;
}

/** GERÇEK modül kaydı — kullanıcının workspace modül sayfasında oluşturduğu, KV'de kalıcı kayıt.
 * (Sentetik değil: modül sayfaları artık işlevsel — form doldur → kayıt saklanır.) */
export interface ModuleRecord {
  id: string;
  workspaceId: string;
  moduleId: string;
  values: Record<string, unknown>;
  status: string | null;
  createdAt: string;
  createdBy: string;
  /** Kayıt düzenlenmediyse createdAt/createdBy ile aynıdır. */
  updatedAt: string;
  updatedBy: string;
}

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  plan: 'free';
  platformRole: PlatformRole;
  accountStatus: AccountStatus;
  entitlements: Entitlements;
  createdAt: string;
}

/** Kalıcı çalışma alanı — onaylanan her kurulum bir Workspace olur; 1 hesap N workspace açabilir. */
export interface Workspace {
  id: string;
  userId: string;
  purpose: Purpose;
  kind: 'sector' | 'offering' | 'custom';
  title: string;
  /** xyz.sectrai.com'daki xyz — kurulumun SON adımında kullanıcı belirler */
  slug: string | null;
  /** Kullanıcının bağladığı kendi alan adı (sentetik kayıt; DNS doğrulaması owner-kapılı) */
  customDomain: string | null;
  sectorId?: string;
  offeringId?: string;
  modules: { id: string; label: string }[];
  draft?: ModuleDraft;
  sourceConversationId: string;
  installedAt: string;
  /** Owner'ın yalnız presetlerle düzenleyebildiği tema ve pano blok sırası. */
  dashboardDesign?: import('./dashboard-design.js').DashboardDesign;
  /** Serbest Masa tuvali: kart koordinatları, boyutları ve görünürlük durumu (KV/dosyaya kalıcı). */
  masaLayout?: import('./masa.js').MasaLayout;
}

/** Her yanıtla taşınan güvenlik beyanı (front-door publicState deseni) */
export const SAFETY = Object.freeze({
  syntheticOnly: true,
  productionMutation: false,
  directDatabaseAccess: false,
  arbitraryExecutableUi: false,
});
