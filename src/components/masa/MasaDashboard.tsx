// F6 ÇALIŞMA MASASI — 3 sütunlu Masa kabuğu (sektral AppShell portu, düz CSS).
//   [1] sol sidebar (koyu): marka + nav (Masa/Bugün/AI + modüller) + kullanıcı
//   [2] AI Operatör paneli (orta, katlanabilir)
//   [3] ana içerik: üst bar + hoşgeldin + istatistik + önerilen adımlar + serbest Masa tuvali
// Koyu MOR TEMA (dashboardThemeVars). Xontainer benzeri tuvalde kartlar tutulup taşınır, köşeden
// boyutlanır ve gerçek workspace kaydı üzerinden kalıcılaşır; AI önerir, insan onaylar.

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import {
  Boxes, Globe, Home, LayoutGrid, PanelLeft, RotateCcw, Settings2, Sparkles, X,
} from 'lucide-react';
import type { PublicUser, Workspace } from '@shared/types.ts';
import { DEFAULT_DASHBOARD_DESIGN, normalizeDashboardDesign } from '@shared/dashboard-design.ts';
import {
  closeModule, defaultMasaLayout, focusModule, masaPersistenceAvailable, moveModule, normalizeMasaLayout,
  orderedModules, resizeModule, restoreModule, toggleCollapse, togglePin, type MasaLayout,
} from '@shared/masa.ts';
import { api } from '@/lib/api';
import { dashboardThemeVars } from '@/lib/dashboard-theme';
import { useRouter } from '@/lib/router';
import { AppHeader } from '@/components/AppHeader';
import { MasaModuleCard } from '@/components/masa/MasaModuleCard';
import { AiOperator } from '@/components/masa/AiOperator';
import { ModuleView } from '@/components/masa/ModuleView';

export function MasaDashboard({
  workspace, user, slug, basePath, moduleId, adaptiveModulesEnabled, onWorkspaceChange,
}: {
  workspace: Workspace;
  user: PublicUser;
  slug: string;
  /** Rota tabanı: alt-alanda '' (modül → /m/x), yerelde /w/<slug> (modül → /w/<slug>/m/x). */
  basePath: string;
  /** Aktif modül sayfası (varsa ana içerik ModuleView; yoksa Masa). */
  moduleId?: string;
  /** Flag açıkken V2 modülleri için dashboard Puck'tan ayrı Studio bağlantısı görünür. */
  adaptiveModulesEnabled: boolean;
  onWorkspaceChange: (ws: Workspace) => void;
}) {
  const { nav } = useRouter();
  const masaHref = basePath || '/';
  const moduleHref = (id: string) => `${basePath}/m/${id}`;
  const designHref = `${basePath}/tasarim`;
  const studioHref = `${basePath}/modul-studyo`;
  const design = normalizeDashboardDesign(workspace.dashboardDesign ?? DEFAULT_DASHBOARD_DESIGN);
  const [layout, setLayout] = useState<MasaLayout>(() => normalizeMasaLayout(workspace.masaLayout, workspace.modules));
  const layoutRef = useRef(layout);
  const [navOpen, setNavOpen] = useState(true);
  const [opOpen, setOpOpen] = useState(true);
  const [stepsOpen, setStepsOpen] = useState(true);
  const [domain, setDomain] = useState(workspace.customDomain ?? '');
  const [domainMsg, setDomainMsg] = useState('');
  const [layoutMsg, setLayoutMsg] = useState('');

  const isBusiness = workspace.purpose === 'business';
  // Workspace sahibi tasarım ve alan adı ayarlarını yönetir. Platform yöneticisi ise owner olmayan
  // bir workspace'i incelerken Masa yerleşimini de düzenleyebilir; API bunu ayrı yetki olarak doğrular.
  const isOwner = workspace.userId === user.id;
  /** Platform yöneticisi sentetik workspace'lerde Xontainer Masa düzenini yönetebilir. */
  const canEditMasa = isOwner || user.platformRole === 'ADMIN';
  const ordered = orderedModules(layout.modules);
  const closedModules = workspace.modules.filter((module) => layout.closedModuleIds.includes(module.id));
  const moduleLabels = workspace.modules.map((m) => m.label);
  const canvasHeight = Math.max(560, ...layout.modules.map((module) => module.y + (module.collapsed ? 78 : module.h) + 26));

  useEffect(() => {
    const next = normalizeMasaLayout(workspace.masaLayout, workspace.modules);
    layoutRef.current = next;
    setLayout(next);
  }, [workspace.id]);

  const saveLayout = useCallback(async (next: MasaLayout) => {
    if (!canEditMasa) return;
    setLayoutMsg('Kaydediliyor…');
    try {
      const response = await api.saveMasaLayout(workspace.id, next);
      onWorkspaceChange(response.workspace);
      setLayoutMsg('Masa yerleşimi kaydedildi.');
    } catch (cause) {
      setLayoutMsg(cause instanceof Error ? cause.message : 'Masa yerleşimi kaydedilemedi');
    }
  }, [canEditMasa, onWorkspaceChange, workspace.id]);

  const applyLayout = useCallback((change: (current: MasaLayout) => MasaLayout) => {
    const next = change(layoutRef.current);
    layoutRef.current = next;
    setLayout(next);
    void saveLayout(next);
  }, [saveLayout]);

  // Öne alma sürükleme boyunca yalnız istemci durumudur; asıl hareket/boyut değişimi pointerup'ta
  // zaten kalıcı kaydedilir. Böylece her karta tıklamada gereksiz ağ yazısı oluşmaz.
  const focusLayout = useCallback((id: string) => {
    const next = { ...layoutRef.current, modules: focusModule(layoutRef.current.modules, id) };
    layoutRef.current = next;
    setLayout(next);
  }, []);

  const bindDomain = async (e: FormEvent) => {
    e.preventDefault();
    setDomainMsg('');
    try {
      const r = await api.setCustomDomain(workspace.id, domain);
      onWorkspaceChange(r.workspace);
      setDomainMsg(`✓ ${r.workspace.customDomain} bağlandı (sentetik kayıt — DNS doğrulaması owner-kapılı)`);
    } catch (err) {
      setDomainMsg(err instanceof Error ? err.message : 'Alan adı bağlanamadı');
    }
  };

  const reopen = (module: { id: string; label: string }) => applyLayout((current) => ({
    modules: restoreModule(current.modules, module),
    closedModuleIds: current.closedModuleIds.filter((id) => id !== module.id),
  }));

  // AI Operatör: "Masa'da şunları görmek istiyorum" → eşleşen modülleri öner (kullanıcı onaylayınca döşenir)
  const norm = (s: string) => s.toLocaleLowerCase('tr-TR');
  const wordsOf = (s: string) => norm(s).split(/[\s&/,.+·—-]+/).filter((w) => w.length > 2);
  const STOP = new Set(['masa', 'masada', 'masaya', 'görmek', 'istiyorum', 'göster', 'ekle', 'ekleyeyim', 'kart', 'kartlar', 'kartlarla', 'çalışma', 'alan', 'alanı', 'için', 'şunları', 'şunlar', 've', 'ile']);
  const handleOperatorCommand = (text: string): { reply: string; proposal: { ids: string[]; labels: string[]; unmatched: string[] } | null } => {
    const q = norm(text);
    const matched = workspace.modules.filter((m) => q.includes(norm(m.label)) || wordsOf(m.label).some((w) => q.includes(w)));
    const covered = new Set(matched.flatMap((m) => wordsOf(m.label)));
    const unmatched = [...new Set(wordsOf(text).filter((w) => !STOP.has(w) && ![...covered].some((c) => c.includes(w) || w.includes(c))))].slice(0, 5);
    if (matched.length === 0) {
      return { reply: 'Bu isteğe uygun hazır modül bulamadım. Modül Studio ile yeni bir modül oluşturabilirsin.', proposal: { ids: [], labels: [], unmatched } };
    }
    return { reply: `${matched.length} kart eşleştirdim. Masa'na ekleyeyim mi?`, proposal: { ids: matched.map((m) => m.id), labels: matched.map((m) => m.label), unmatched } };
  };
  const applyMasaCards = (ids: string[]) => applyLayout((current) => {
    // İstenen modülleri (kapalıysa) geri getir; sonra istenenleri ÜSTE (ilk grid slotlarına) alacak
    // şekilde tüm açık kartları soldan-sağa 3'lü grid'e yeniden diz.
    const closed = current.closedModuleIds.filter((c) => !ids.includes(c));
    const openMods = workspace.modules.filter((m) => !closed.includes(m.id));
    const ordered = [
      ...ids.map((id) => openMods.find((m) => m.id === id)).filter((m): m is (typeof openMods)[number] => Boolean(m)),
      ...openMods.filter((m) => !ids.includes(m.id)),
    ];
    return { modules: defaultMasaLayout(ordered), closedModuleIds: closed };
  });

  // ── Sol sidebar ─────────────────────────────────────────────────────────────
  const sidebar = (
    <aside className="masa-side" aria-label="Çalışma alanı menüsü">
      <div className="masa-brand">
        <span className="logo-orb" aria-hidden="true" />
        <div className="masa-brand-txt">
          <div className="masa-brand-name">{workspace.title}</div>
          <div className="masa-brand-sub">{isBusiness ? 'İşletme' : 'Bireysel'} · {workspace.modules.length} modül</div>
        </div>
        <button className="masa-ic" title="Menüyü daralt" aria-label="Menüyü daralt" onClick={() => setNavOpen(false)}>
          <PanelLeft size={15} aria-hidden="true" />
        </button>
      </div>
      <nav className="masa-nav">
        <div className="masa-nav-group">Çalışma</div>
        <button className={`masa-nav-item${!moduleId ? ' active' : ''}`} onClick={() => nav(masaHref)}><LayoutGrid size={15} aria-hidden="true" /> <span>Masa</span></button>
        <button className="masa-nav-item" onClick={() => nav(masaHref)}><Home size={15} aria-hidden="true" /> <span>Bugün</span></button>
        <button className="masa-nav-item ai" onClick={() => setOpOpen(true)}><Sparkles size={15} aria-hidden="true" /> <span>AI Operatör</span></button>
        <div className="masa-nav-group">Modüller</div>
        {workspace.modules.map((m) => (
          <button key={m.id} className={`masa-nav-item${moduleId === m.id ? ' active' : ''}`} title={`${m.label} — sayfasını aç`} onClick={() => nav(moduleHref(m.id))}>
            <Boxes size={15} aria-hidden="true" /> <span>{m.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );

  return (
    <div className="masa-shell" style={dashboardThemeVars(design.theme)}>
      {navOpen ? sidebar : (
        <button className="masa-side-rail" title="Menüyü aç" aria-label="Menüyü aç" onClick={() => setNavOpen(true)}>
          <PanelLeft size={17} aria-hidden="true" /><span className="rail-txt">MENÜ</span>
        </button>
      )}

      {opOpen ? (
        <AiOperator workspaceTitle={workspace.title} moduleLabels={moduleLabels} onCommand={handleOperatorCommand} onApplyCards={applyMasaCards} onCollapse={() => setOpOpen(false)} />
      ) : (
        <button className="masa-op-rail" title="AI Operatör panelini aç" aria-label="AI Operatör panelini aç" onClick={() => setOpOpen(true)}>
          <Sparkles size={17} aria-hidden="true" /><span className="rail-txt">AI OPERATÖR</span>
        </button>
      )}

      <main className="masa-main">
        <AppHeader
          active="work"
          user={user}
          currentSlug={workspace.slug ?? slug}
          rightExtra={isOwner ? (
            <span style={{ display: 'inline-flex', gap: 8 }}>
              <button className="btn masa-design-btn" onClick={() => nav(designHref)}><Settings2 size={14} aria-hidden="true" /> Tasarım</button>
              {adaptiveModulesEnabled && <button className="btn masa-design-btn" onClick={() => nav(studioHref)}><Boxes size={14} aria-hidden="true" /> Modül Studio</button>}
            </span>
          ) : user.platformRole === 'ADMIN' ? (
            <span className="masa-slug-pill" title="Yönetici; Masa yerleşimini düzenleyebilir">Yönetici düzenleme</span>
          ) : (
            <span className="masa-slug-pill" title="Salt görünüm">Salt görünüm</span>
          )}
        />

        {moduleId ? (
          <ModuleView workspace={workspace} moduleId={moduleId} onBack={() => nav(masaHref)} />
        ) : (
        <div className="masa-content masa-dashboard-content">
          <div className="masa-dashboard-chrome">
          {stepsOpen && isOwner && (
            <section className="masa-steps">
              <div className="masa-steps-head">
                <span>Önerilen adımlar</span>
                <button className="masa-ic" title="Kapat" aria-label="Önerilen adımları kapat" onClick={() => setStepsOpen(false)}><X size={14} aria-hidden="true" /></button>
              </div>
              <div className="masa-steps-grid">
                <div className="masa-step-card">
                  <div className="masa-step-t"><Globe size={15} aria-hidden="true" /> Kendi alan adını bağla</div>
                  <form className="domain-form" onSubmit={(e) => void bindDomain(e)}>
                    <input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="firmam.com" aria-label="Kendi alan adın" />
                    <button className="btn btn-primary" style={{ height: 40 }}>Bağla</button>
                  </form>
                  {domainMsg && <p className="masa-step-msg">{domainMsg}</p>}
                </div>
                <div className="masa-step-card">
                  <div className="masa-step-t"><Settings2 size={15} aria-hidden="true" /> Panonu tasarla</div>
                  <p className="masa-step-desc">Tema, renk ve modül düzenini kendi markana göre ayarla — değişiklikler kaydedene kadar yalnız önizleme.</p>
                  <button className="btn" onClick={() => nav(designHref)}>Tasarım editörünü aç</button>
                </div>
              </div>
            </section>
          )}

          <div className="masa-desk-head" id="masa-desk">
            <h2><LayoutGrid size={17} aria-hidden="true" /> {isBusiness ? 'İşletme modüllerin' : 'Kişisel panellerin'}</h2>
            {canEditMasa && (
              <div className="masa-reopen">
                <button className="btn masa-reset-btn" onClick={() => applyLayout(() => ({ modules: defaultMasaLayout(workspace.modules), closedModuleIds: [] }))}>
                  <RotateCcw size={13} aria-hidden="true" /> Düzeni sıfırla
                </button>
                {closedModules.map((m) => (
                  <button key={m.id} className="chip" onClick={() => reopen(m)}>+ {m.label}</button>
                ))}
              </div>
            )}
          </div>

          <p className="masa-honesty">
            {masaPersistenceAvailable
              ? 'Kartı başlığından tutup taşı; sağ alt köşeden serbestçe boyutlandır. Konum, boyut, kilit ve kapatma durumu workspace kaydına kalıcı yazılır.'
              : 'Masa yerleşimi henüz kalıcı değil.'}
            {layoutMsg && <span className="masa-layout-msg" role="status">{layoutMsg}</span>}
          </p>
          </div>

          <div className="masa-canvas-viewport" aria-label="Serbest çalışma masası">
            <div className="masa-canvas" style={{ height: canvasHeight }}>
              {ordered.length === 0 && <p className="masa-empty masa-canvas-empty">Masa boş — yukarıdaki çiplerden modülü tekrar ekle.</p>}
              {ordered.map((m) => (
                <MasaModuleCard
                  key={m.id}
                  module={m}
                  typeLabel="MODÜL"
                  metaLine={`Kayıt defteri · ${m.id}`}
                  lifecycle="synthetic"
                  editable={canEditMasa}
                  onFocus={focusLayout}
                  onMove={(id, x, y) => applyLayout((current) => ({ ...current, modules: moveModule(current.modules, id, x, y) }))}
                  onResize={(id, w, h) => applyLayout((current) => ({ ...current, modules: resizeModule(current.modules, id, w, h) }))}
                  onToggleCollapse={(id) => applyLayout((current) => ({ ...current, modules: toggleCollapse(current.modules, id) }))}
                  onTogglePin={(id) => applyLayout((current) => ({ ...current, modules: togglePin(current.modules, id) }))}
                  onClose={(id) => applyLayout((current) => ({ modules: closeModule(current.modules, id), closedModuleIds: Array.from(new Set([...current.closedModuleIds, id])) }))}
                >
                  <button className="masa-open-btn" onClick={() => nav(moduleHref(m.id))}>Kayıtları aç →</button>
                  <p className="masa-card-note">Ayrıntılı form, kalıcı kayıt, düzenleme ve silme. Klavye: oklarla taşı, Shift + oklarla boyutlandır.</p>
                </MasaModuleCard>
              ))}
            </div>
          </div>

          <div className="safety-footer masa-dashboard-footer">
            <span>SENTETİK-ONLY</span>
            <span>ÜRETİME YAZMAZ</span>
            <span>YALNIZ SAHİBİ GÖRÜR</span>
            <span>AI ÖNERİR · İNSAN ONAYLAR</span>
          </div>
        </div>
        )}
      </main>
    </div>
  );
}
