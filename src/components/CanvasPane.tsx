// WORK tuvali (ekranın 3/4'ü) — panel allowlist'indeki 11 tipin görsel karşılıkları.
// Paneller sohbet ilerledikçe kademeli animasyonla "canlı oluşur" (Taylan akışı, adım 6).

import {
  BadgeCheck,
  Bell,
  Brain,
  CheckCircle2,
  ClipboardList,
  FileQuestion,
  FormInput,
  History,
  LayoutGrid,
  PackageCheck,
  ShieldQuestion,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react';
import { useState } from 'react';
import type { ApprovalRequest, AuditEvent, Conversation, ModuleDraft, Panel } from '@shared/types.ts';
import { ROOT_DOMAIN } from '@shared/domain.ts';
import { t } from '@/lib/i18n';

interface Props {
  conversation: Conversation;
  busy: boolean;
  onApprove: (approvalId: string) => void;
  onReject: (approvalId: string) => void;
  onDomain: (slug: string) => void;
}

/** Kurulumun SON adımı: xyz.sectrai.com adres seçimi (etkileşimli form paneli) */
function DomainSetup({ suggested, busy, onDomain }: { suggested: string; busy: boolean; onDomain: (slug: string) => void }) {
  const [slug, setSlug] = useState(suggested);
  return (
    <div>
      <p className="panel-title">{t("Çalışma alanının adresi")}</p>
      <p className="panel-sub">{t("Bir ad seç — adresin aşağıdaki gibi olacak; sonra panelden kendi alan adını da bağlayabilirsin.")}</p>
      <div className="domain-form">
        <input
          value={slug}
          onChange={(e) => setSlug(e.target.value.toLowerCase())}
          aria-label={t("Alt alan adı")}
          placeholder="xyz"
          maxLength={30}
        />
        <span className="domain-suffix">.{ROOT_DOMAIN}</span>
        <button className="btn btn-primary" style={{ height: 40 }} disabled={busy || !slug.trim()} onClick={() => onDomain(slug.trim())}>
          {t("Kaydet")}
        </button>
      </div>
    </div>
  );
}

const asStr = (v: unknown): string => (typeof v === 'string' ? v : '');
const asArr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

function PanelShell({ icon, label, wide, delay, children }: {
  icon: React.ReactNode;
  label: string;
  wide?: boolean;
  delay: number;
  children: React.ReactNode;
}) {
  return (
    <section className={`panel-card${wide ? ' wide' : ''}`} style={{ animationDelay: `${delay}s` }}>
      <div className="panel-head">{icon} {t(label)}<span className="spacer" /></div>
      {children}
    </section>
  );
}

function ModuleChips({ modules }: { modules: { id: string; label: string }[] }) {
  return (
    <div className="mod-grid">
      {modules.map((m, i) => (
        <span key={m.id + i} className="mod-chip" style={{ animationDelay: `${0.06 * i}s` }}>{t(m.label)}</span>
      ))}
    </div>
  );
}

function DraftView({ draft }: { draft: ModuleDraft }) {
  return (
    <div>
      <p className="panel-title">{t(draft.name)}</p>
      <p className="panel-sub mono">id: {draft.id} · tablo: mod_{draft.schema.table} · {draft.capabilities.join(', ')}</p>
      <div className="deeplink mono">
        {'{'} tier: {draft.tier}, kind: "{draft.kind}", fields: {draft.schema.fields.length}, statuses: {draft.schema.statuses?.length ?? 0} {'}'}
      </div>
      <div className="evidence">
        <b>{t("Kanıt:")}</b> {draft.evidence.map((item) => t(item)).join(' · ')}
      </div>
    </div>
  );
}

/** Denetim olayından aktör çıkarımı (handoff: AI / İNSAN / SİSTEM rozetleri) */
function auditActor(eventType: string): { label: string; cls: string } {
  if (/APPROVED|REJECTED|PURPOSE|DOMAIN/.test(eventType)) return { label: 'İNSAN', cls: 'insan' };
  if (/INTENT|PROPOSAL|MODULE_DRAFTED|CLARIFICATION|RECOMMENDED/.test(eventType)) return { label: 'AI', cls: 'ai' };
  return { label: 'SİSTEM', cls: 'sistem' };
}

function renderPanel(p: Panel, i: number, audit: AuditEvent[], busy: boolean, onApprove: Props['onApprove'], onReject: Props['onReject'], onDomain: Props['onDomain']) {
  const d = p.data;
  const delay = Math.min(i * 0.12, 0.6);
  switch (p.type) {
    case 'recommendation':
      return (
        <PanelShell key={i} icon={<Sparkles size={13} aria-hidden="true" />} label="Öneri · Kanıtlı" delay={delay}>
          <p className="panel-title">{t(asStr(d.product))}</p>
          <p className="panel-sub">{t('Otorite: {authority}', { authority: t(asStr(d.authority)) })}</p>
          <p style={{ fontSize: 13.5, margin: 0 }}>{t(asStr(d.reason))}</p>
          {asArr(d.evidence).length > 0 && (
            <div className="evidence"><b>{t("Kanıt:")}</b> {asArr(d.evidence).map(String).map((item) => t(item)).join(' · ')}</div>
          )}
        </PanelShell>
      );
    case 'requirements-summary': {
      const facts = asArr(d.confirmedFacts).map(String);
      const missing = asArr(d.missingQuestions).map(String);
      return (
        <PanelShell key={i} icon={<ClipboardList size={13} aria-hidden="true" />} label="Gereksinim özeti" delay={delay}>
          {facts.length > 0 && (
            <ul className="fact-list">
              {facts.map((f) => <li key={f}><span className="tick">✓</span> {t(f)}</li>)}
            </ul>
          )}
          {missing.length > 0 && (
            <ul className="q-list">
              {missing.map((q) => <li key={q}><span className="quest">?</span> {t(q)}</li>)}
            </ul>
          )}
          {facts.length === 0 && missing.length === 0 && <p className="panel-sub">{t("Gereksinim toplanıyor…")}</p>}
        </PanelShell>
      );
    }
    case 'workspace-preview': {
      const modules = asArr(d.modules) as { id: string; label: string }[];
      return (
        <PanelShell key={i} icon={<LayoutGrid size={13} aria-hidden="true" />} label="Çalışma alanı önizleme" wide delay={delay}>
          <p className="panel-title">{t(asStr(d.product))}</p>
          <p className="panel-sub">{t('{n} modül bağlanacak:', { n: modules.length })}</p>
          <ModuleChips modules={modules} />
        </PanelShell>
      );
    }
    case 'handoff-preview': {
      const pkg = (d.package ?? {}) as Record<string, unknown>;
      const draft = pkg.draft as ModuleDraft | undefined;
      return (
        <PanelShell key={i} icon={<PackageCheck size={13} aria-hidden="true" />} label="Devir önizleme" wide delay={delay}>
          {draft ? (
            <DraftView draft={draft} />
          ) : (
            <div className="deeplink mono">{JSON.stringify(pkg).slice(0, 240)}</div>
          )}
        </PanelShell>
      );
    }
    case 'approval': {
      const a = d.approval as ApprovalRequest | undefined;
      if (!a) return null;
      return (
        <PanelShell key={i} icon={<BadgeCheck size={13} aria-hidden="true" />} label="Onay kapısı" delay={delay}>
          <p className="panel-title">{t(a.summary)}</p>
          <p className="panel-sub mono">{t(a.action)}</p>
          <span className={`badge badge-risk-${a.risk}`}>risk: {a.risk}</span>
          {a.status === 'PROPOSED' ? (
            <div className="approval-actions">
              <button className="btn btn-primary" disabled={busy} onClick={() => onApprove(a.approvalId)}>
                <ThumbsUp size={15} aria-hidden="true" /> {t("Onayla ve kur")}
              </button>
              <button className="btn" disabled={busy} onClick={() => onReject(a.approvalId)}>
                <ThumbsDown size={15} aria-hidden="true" /> {t("Reddet")}
              </button>
            </div>
          ) : a.status === 'APPROVED' ? (
            <div className="approval-banner ok">{t("✓ Onaylandı — kurulum başladı")}</div>
          ) : (
            <div className="approval-banner bad">{t("✕ Reddedildi — hiçbir değişiklik yapılmadı")}</div>
          )}
          <p className="panel-sub" style={{ marginTop: 10, fontSize: 11.5 }}>
            {t("Karar insanda — AI bu düğmeye basamaz.")}
          </p>
        </PanelShell>
      );
    }
    case 'task-list': {
      const tasks = asArr(d.tasks) as { label: string; done: boolean }[];
      return (
        <PanelShell key={i} icon={<CheckCircle2 size={13} aria-hidden="true" />} label={asStr(d.title) || 'Görevler'} delay={delay}>
          <ul className="task-list-ul">
            {tasks.map((task) => (
              <li key={task.label} className={task.done ? 'task-done' : 'task-open'}>
                {task.done ? '✓' : '○'} {t(task.label)}
              </li>
            ))}
          </ul>
        </PanelShell>
      );
    }
    case 'notification':
      return (
        <PanelShell key={i} icon={<Bell size={13} aria-hidden="true" />} label="Bildirim" delay={delay}>
          <p className="panel-title">{t(asStr(d.title))}</p>
          {asStr(d.deepLink) && <div className="deeplink mono">{asStr(d.deepLink)}</div>}
        </PanelShell>
      );
    case 'audit-timeline':
      return (
        <PanelShell key={i} icon={<History size={13} aria-hidden="true" />} label="Denetim izi" wide delay={delay}>
          {audit.slice(-8).map((e) => {
            const actor = auditActor(e.eventType);
            return (
              <div key={e.eventId} className="audit-item">
                <span className="tm">{e.at.slice(11, 16)}</span>
                <span className="et">{e.eventType}</span>
                <span className="dc">{t(e.decision)}</span>
                <span className={`actor-badge ${actor.cls}`}>{t(actor.label)}</span>
              </div>
            );
          })}
        </PanelShell>
      );
    case 'memory-controls':
      return (
        <PanelShell key={i} icon={<Brain size={13} aria-hidden="true" />} label="Hafıza kontrolleri" delay={delay}>
          <p className="panel-sub" style={{ marginBottom: 8 }}>
            {t("Bu ürün kişisel hafıza erişimi ister; kapsamlar açıkça listelenir ve kontrol sende kalır.")}
          </p>
          <div className="status-pill-row">
            {asArr(d.scopes).map((s) => <span key={String(s)} className="badge">{t(String(s))}</span>)}
            <span className="badge">{t(d.enabled ? 'AÇIK' : 'KAPALI (varsayılan)')}</span>
          </div>
        </PanelShell>
      );
    case 'clarification':
      return (
        <PanelShell key={i} icon={<ShieldQuestion size={13} aria-hidden="true" />} label="Netleştirme" delay={delay}>
          <p className="panel-title">{t(asStr(d.title))}</p>
          <ul className="q-list">
            {asArr(d.questions).map((q) => <li key={String(q)}><span className="quest">?</span> {t(String(q))}</li>)}
          </ul>
        </PanelShell>
      );
    case 'form': {
      if (d.domainSetup) {
        return (
          <PanelShell key={i} icon={<FormInput size={13} aria-hidden="true" />} label="Adres seçimi" wide delay={delay}>
            <DomainSetup suggested={asStr(d.suggestedSlug) || 'alanim'} busy={busy} onDomain={onDomain} />
          </PanelShell>
        );
      }
      const fields = asArr(d.fields) as { key: string; label: string; type: string; required?: boolean }[];
      const statuses = asArr(d.statuses) as { value: string; label: string; tone?: string }[];
      return (
        <PanelShell key={i} icon={<FormInput size={13} aria-hidden="true" />} label={t('Form · {noun}', { noun: t(asStr(d.noun) || 'Yeni kayıt') })} delay={delay}>
          {fields.map((f) => (
            <div key={f.key} className="field-row">
              <span>{t(f.label)}{f.required && <span className="req-star" title={t("zorunlu")}>*</span>}</span>
              <span className="field-type">{t(f.type)}</span>
            </div>
          ))}
          {statuses.length > 0 && (
            <div className="status-pill-row">
              {statuses.map((s) => <span key={s.value} className={`badge tone-${s.tone ?? 'neutral'}`}>{t(s.label)}</span>)}
            </div>
          )}
        </PanelShell>
      );
    }
    default:
      return (
        <PanelShell key={i} icon={<FileQuestion size={13} aria-hidden="true" />} label={p.type} delay={delay}>
          <div className="deeplink mono">{JSON.stringify(p.data).slice(0, 200)}</div>
        </PanelShell>
      );
  }
}

export function CanvasPane({ conversation, busy, onApprove, onReject, onDomain }: Props) {
  const { panels, audit } = conversation;
  return (
    <div className="canvas-pane" aria-label={t("Çalışma tuvali")}>
      {panels.length === 0 ? (
        <div className="canvas-empty">
          <div>
            <div className="orb" aria-hidden="true" />
            <p style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>{t("Tuval hazır")}</p>
            <p style={{ fontSize: 13.5, maxWidth: 380 }}>
              {t("Soldan ne istediğini anlat — iş ya da bireysel. Anlattıkça sistemin burada panel panel kurulmaya başlar.")}
            </p>
          </div>
        </div>
      ) : (
        <div className="canvas-grid">
          {panels.map((p, i) => renderPanel(p, i, audit, busy, onApprove, onReject, onDomain))}
          <div className="safety-footer" aria-label={t("Güvenlik beyanı")}>
            <span>{t("SENTETİK-ONLY")}</span>
            <span>{t("ÜRETİME YAZMAZ")}</span>
            <span>{t("DOĞRUDAN DB ERİŞİMİ YOK")}</span>
            <span>{t("PANEL ALLOWLIST AKTİF")}</span>
          </div>
        </div>
      )}
    </div>
  );
}
