// Uygulama kabuğu — tasarım-handoff ölçüleri: 58px header, CHAT'te 248px arşiv, WORK'te 56px ikon-rail.
// PENDING hesap bekleme ekranı görür (kayıt = erişim başvurusu); ADMIN otomatik yönetim paneline gider.

import { useCallback, useEffect, useState } from 'react';
import { Archive, ArrowUpRight, Bell, Box, FolderArchive, ImagePlus, LayoutDashboard, Menu, MessageSquareText, PanelLeftClose, PanelLeftOpen, Pencil, Pin, PinOff, Plus, RefreshCw, UserRoundPlus } from 'lucide-react';
import type { Conversation, PublicUser, Purpose, Workspace } from '@shared/types.ts';
import { api, doLogout, setToken, type ConversationSummary } from '@/lib/api';
import { useRouter } from '@/lib/router';
import { ChatPane } from '@/components/ChatPane';
import { CanvasPane } from '@/components/CanvasPane';
import { Switcher, wsHref } from '@/components/Switcher';

export function AppShell() {
  const { nav } = useRouter();
  const [user, setUser] = useState<PublicUser | null>(null);
  const [list, setList] = useState<ConversationSummary[]>([]);
  const [conv, setConv] = useState<Conversation | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [view, setView] = useState<'chat' | 'work'>('chat');
  const [railOpen, setRailOpen] = useState(false);
  const [archiveView, setArchiveView] = useState(false);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [mobileArchiveOpen, setMobileArchiveOpen] = useState(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  // Sohbet atama: sabitlenmiş sohbeti ekip üyesine ata (Worker/Checker). Sentetik ekip; assignee adı
  // istemcide (localStorage) tutulur, backend'in assigned bayrağı senkron kalır.
  const [assignees, setAssignees] = useState<Record<string, string>>(() => { try { return JSON.parse(localStorage.getItem('sectrai-assignees') || '{}') as Record<string, string>; } catch { return {}; } });
  const [assignMenuFor, setAssignMenuFor] = useState<string | null>(null);

  const refreshList = useCallback(async () => {
    const r = await api.conversations();
    setList(r.conversations);
    return r.conversations;
  }, []);

  const boot = useCallback(async () => {
    try {
      const me = await api.me();
      setUser(me.user);
      // Admin de NORMAL ön kapıyı (CHAT|WORK) kullanabilir — panele hapsolmaz. Yönetim paneline
      // sağ-üst profil menüsünden "Yönetim paneli" ile geçer (owner hem admin hem kullanıcı).
      if (me.user.accountStatus !== 'ACTIVE') return; // bekleme ekranı (PENDING/SUSPENDED)
      // İşini kurmuş kullanıcı için panolarını yükle (header + banner kısayolu)
      void api.workspaces().then((w) => setWorkspaces(w.workspaces)).catch(() => {});
      const convs = await refreshList();
      if (convs.length > 0) {
        const r = await api.conversation(convs[0].id);
        setConv(r.conversation);
      } else {
        const r = await api.createConversation();
        setConv(r.conversation);
        await refreshList();
      }
    } catch {
      setToken(null);
      nav('/giris');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Cross-subdomain SSO: token'ı ön-kontrol etme — boot() içindeki api.me() çerezle de doğrular;
    // oturum yoksa boot'un catch'i /giris'e alır (setToken(null) + nav).
    void boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const wrap = async (fn: () => Promise<{ conversation: Conversation }>) => {
    setBusy(true);
    setError('');
    try {
      const r = await fn();
      setConv(r.conversation);
      await refreshList();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'İstek başarısız');
    } finally {
      setBusy(false);
    }
  };

  const openConv = (id: string) => {
    setMobileArchiveOpen(false);
    void wrap(() => api.conversation(id));
  };
  const newConv = () => {
    setArchiveView(false);
    setMobileArchiveOpen(false);
    void wrap(() => api.createConversation());
  };
  const send = (text: string) => conv && void wrap(() => api.sendMessage(conv.id, text, view));
  const purpose = (p: Purpose) => conv && void wrap(() => api.setPurpose(conv.id, p));
  const approve = (approvalId: string) => conv && void wrap(() => api.approve(conv.id, approvalId));
  const reject = (approvalId: string) => conv && void wrap(() => api.reject(conv.id, approvalId));
  const domain = (slug: string) => conv && void wrap(() => api.setDomain(conv.id, slug));

  const updateConversationMeta = async (id: string, patch: { title?: string; pinned?: boolean; archived?: boolean; assigned?: boolean }) => {
    setBusy(true);
    setError('');
    try {
      const response = await api.updateConversationMeta(id, patch);
      if (conv?.id === id) setConv(response.conversation);
      const conversations = await refreshList();
      if (patch.archived && conv?.id === id) {
        const next = conversations.find((item) => !item.archived);
        if (next) {
          const current = await api.conversation(next.id);
          setConv(current.conversation);
        }
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Sohbet güncellenemedi');
    } finally {
      setBusy(false);
    }
  };

  const beginRename = (id: string, title: string) => {
    setRenameId(id);
    setRenameValue(title);
  };

  const submitRename = (id: string) => {
    const title = renameValue.trim();
    if (title) void updateConversationMeta(id, { title });
    setRenameId(null);
  };

  const checkStatus = async () => {
    setChecking(true);
    try {
      const me = await api.me();
      setUser(me.user);
      if (me.user.accountStatus === 'ACTIVE') await boot();
    } finally {
      setChecking(false);
    }
  };

  if (!user) {
    return (
      <div className="auth-wrap">
        <p style={{ color: 'var(--muted)' }}>Yükleniyor…</p>
      </div>
    );
  }

  // PENDING / SUSPENDED / REJECTED: ürün kapısı kapalı — bekleme ekranı
  if (user.accountStatus !== 'ACTIVE') {
    const rejected = user.accountStatus === 'REJECTED';
    const suspended = user.accountStatus === 'SUSPENDED';
    return (
      <div className="auth-wrap">
        <div className="hero-bg" aria-hidden="true" />
        <div className="card auth-card pending-card">
          <div className="orb" aria-hidden="true" />
          <h1 style={{ fontSize: 21, margin: '0 0 8px' }}>
            {rejected ? 'Başvurun onaylanmadı' : suspended ? 'Erişimin askıya alındı' : 'Başvurun yönetici onayında'}
          </h1>
          <p className="sub">
            {rejected
              ? 'Erişim başvurun reddedildi. Bir hata olduğunu düşünüyorsan destek ile iletişime geç.'
              : suspended
                ? 'Hesabın yönetici tarafından geçici olarak askıya alındı. Erişim yeniden açıldığında çalışma alanların seni bekliyor olacak.'
                : 'Ücretsiz hesabın oluşturuldu ve sıraya alındı. Yönetici onaylar onaylamaz sohbet arşivin ve UYGULA tuvalin seni bekliyor olacak.'}
          </p>
          {!rejected && (
            <button className="btn btn-primary" style={{ justifyContent: 'center', width: '100%' }} disabled={checking} onClick={() => void checkStatus()}>
              <RefreshCw size={15} aria-hidden="true" className={checking ? 'spin' : undefined} /> Durumu kontrol et
            </button>
          )}
          <button className="btn btn-ghost" style={{ marginTop: 10 }} onClick={() => { void doLogout().finally(() => nav('/')); }}>
            Çıkış yap
          </button>
        </div>
      </div>
    );
  }

  if (!conv) {
    return (
      <div className="auth-wrap">
        <p style={{ color: 'var(--muted)' }}>Yükleniyor…</p>
      </div>
    );
  }

  const rail = view === 'work' && !railOpen;
  // İşini kurmuş (adresi belli) çalışma alanları → doğrudan panoya kısayol
  const ready = workspaces.filter((w) => w.slug);
  const goWs = (slug: string) => {
    const href = wsHref(slug);
    if (href.startsWith('/')) nav(href);
    else window.location.href = href;
  };
  // MASA / Masa'ya git → SEÇİLİ sohbetin KENDİ çalışma alanına gider (hep ilk workspace'e değil).
  // Sohbetin bağlı bir alanı yoksa ilk alana düşer.
  const currentWs = ready.find((w) => w.id === conv.workspaceId) ?? ready[0];
  // Sentetik ekip (Worker/Checker) — atama seçicisi bunu listeler; gerçek workspace ekibine sonra bağlanır.
  const team = [{ id: 'me', name: user.name }, { id: 'selin', name: 'Selin K.' }, { id: 'mehmet', name: 'Mehmet A.' }, { id: 'ayse', name: 'Ayşe D.' }];
  const assign = (convId: string, memberName: string | null) => {
    setAssignees((prev) => { const next = { ...prev }; if (memberName) next[convId] = memberName; else delete next[convId]; try { localStorage.setItem('sectrai-assignees', JSON.stringify(next)); } catch { /* ignore */ } return next; });
    void updateConversationMeta(convId, { assigned: Boolean(memberName) });
    setAssignMenuFor(null);
  };
  const showBanner = view === 'chat' && ready.length > 0;
  const pinnedConversations = list.filter((item) => item.pinned && !item.archived);
  const activeConversations = list.filter((item) => !item.pinned && !item.archived);
  const archivedConversations = list.filter((item) => item.archived);

  const renderConversation = (item: ConversationSummary, section: 'pinned' | 'active' | 'archived') => (
    <div key={item.id} className={`conv-entry${item.id === conv.id ? ' active' : ''}`}>
      {renameId === item.id ? (
        <form className="conv-rename" onSubmit={(event) => { event.preventDefault(); submitRename(item.id); }}>
          <input autoFocus aria-label="Sohbet adı" value={renameValue} maxLength={120} onChange={(event) => setRenameValue(event.target.value)} onBlur={() => submitRename(item.id)} />
        </form>
      ) : (
        <button className="conv-item" onClick={() => openConv(item.id)} disabled={busy}>
          <MessageSquareText size={14} aria-hidden="true" />
          <span className="t">{item.title}</span>
          {item.hasWorkspace && <span className="badge" title="Çalışma alanı kurulu">✓</span>}
          {assignees[item.id] && <span className="conv-assignee" title={`Atandı: ${assignees[item.id]}`}>{assignees[item.id].charAt(0).toLocaleUpperCase('tr-TR')}</span>}
        </button>
      )}
      <div className="conv-actions" aria-label={`${item.title} işlemleri`}>
        {section === 'pinned' && (
          <div className="conv-assign-wrap">
            <button className={`conv-action${assignees[item.id] ? ' is-assigned' : ''}`} title={assignees[item.id] ? `Atandı: ${assignees[item.id]}` : 'Ekip üyesine ata'} aria-label="Ekip üyesine ata" onClick={() => setAssignMenuFor(assignMenuFor === item.id ? null : item.id)} disabled={busy}>
              <UserRoundPlus size={13} aria-hidden="true" />
            </button>
            {assignMenuFor === item.id && (
              <div className="conv-assign-menu" role="menu">
                <div className="conv-assign-head">Ekip üyesine ata</div>
                {team.map((m) => (
                  <button key={m.id} className={`conv-assign-item${assignees[item.id] === m.name ? ' active' : ''}`} role="menuitem" onClick={() => assign(item.id, m.name)}>
                    <span className="avatar sm" aria-hidden="true">{m.name.charAt(0).toLocaleUpperCase('tr-TR')}</span> <span className="t">{m.name}</span>{assignees[item.id] === m.name && ' ✓'}
                  </button>
                ))}
                {assignees[item.id] && <button className="conv-assign-item remove" role="menuitem" onClick={() => assign(item.id, null)}>Atamayı kaldır</button>}
              </div>
            )}
          </div>
        )}
        {section === 'archived' ? (
          <button className="conv-action" title="Arşivden çıkar" aria-label="Arşivden çıkar" onClick={() => void updateConversationMeta(item.id, { archived: false })} disabled={busy}>
            <Archive size={13} aria-hidden="true" />
          </button>
        ) : (
          <button className="conv-action" title="Arşivle" aria-label="Arşivle" onClick={() => void updateConversationMeta(item.id, { archived: true })} disabled={busy}>
            <FolderArchive size={13} aria-hidden="true" />
          </button>
        )}
        {section !== 'archived' && (
          <button className="conv-action" title={item.pinned ? 'Sabitlemeyi kaldır' : 'Sabitle'} aria-label={item.pinned ? 'Sabitlemeyi kaldır' : 'Sabitle'} onClick={() => void updateConversationMeta(item.id, { pinned: !item.pinned })} disabled={busy}>
            {item.pinned ? <PinOff size={13} aria-hidden="true" /> : <Pin size={13} aria-hidden="true" />}
          </button>
        )}
        <button className="conv-action" title="Yeniden adlandır" aria-label="Yeniden adlandır" onClick={() => beginRename(item.id, item.title)} disabled={busy}>
          <Pencil size={13} aria-hidden="true" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="shell" style={{ gridTemplateRows: showBanner ? '58px auto 1fr' : '58px 1fr' }}>
      <header className="shell-header">
        <a className="logo" href="/" onClick={(e) => { e.preventDefault(); nav('/'); }}>
          <span className="logo-orb" aria-hidden="true" /> <span className="logo-name">SECTRAI</span>
        </a>

        {/* Header TAM ORTASI: CHAT | WORK */}
        <div className="seg" role="tablist" aria-label="Görünüm">
          <button role="tab" aria-selected={view === 'chat'} className={view === 'chat' ? 'active' : ''} onClick={() => { setView('chat'); setRailOpen(false); setMobileSheetOpen(false); }}>
            KONUŞ
          </button>
          <button role="tab" aria-selected={view === 'work'} className={view === 'work' ? 'active' : ''} onClick={() => { setView('work'); setMobileSheetOpen(false); }}>
            UYGULA
          </button>
          {/* Kişi Masa (çalışma alanı) kurmuşsa üçüncü sekme: KONUŞ | UYGULA | MASA yan yana */}
          {ready.length > 0 && (
            <button role="tab" aria-selected={false} title="Çalışma alanına (Masa) git" onClick={() => goWs(currentWs.slug!)}>
              MASA
            </button>
          )}
        </div>

        <div className="right">
          <button className="btn btn-ghost mobile-archive-trigger" aria-label="Sohbet arşivini aç" onClick={() => setMobileArchiveOpen(true)}><Menu size={18} aria-hidden="true" /></button>
          <button className="btn btn-ghost" aria-label="Bildirimler" title="Bildirimler"><Bell size={16} aria-hidden="true" /></button>
          <Switcher user={user} />
        </div>
      </header>

      {/* KONUŞ altında: işin kuruluysa doğrudan Masa kısayolu */}
      {showBanner && (
        <div className="ws-banner">
          <LayoutDashboard size={15} aria-hidden="true" />
          <span>
            İşin kurulu: <strong>{currentWs.title}</strong>
            {ready.length > 1 && ` (+${ready.length - 1} alan daha)`} — Masa'na geçebilirsin.
          </span>
          <button className="btn btn-primary" style={{ marginLeft: 'auto', padding: '6px 14px', fontSize: 13 }} onClick={() => goWs(currentWs.slug!)}>
            Masa'ya git <ArrowUpRight size={14} aria-hidden="true" />
          </button>
        </div>
      )}

      <div className="shell-body">
        {mobileArchiveOpen && <button className="mobile-archive-backdrop" aria-label="Sohbet arşivini kapat" onClick={() => setMobileArchiveOpen(false)} />}
        <aside className={`sidebar${rail ? ' rail' : ''}${mobileArchiveOpen ? ' mobile-open' : ''}`} aria-label="Sohbet arşivi">
          <div className="sidebar-top">
            {rail ? (
              <>
                <button className="rail-btn" onClick={newConv} disabled={busy} aria-label="Yeni sohbet" title="Yeni sohbet">
                  <Plus size={17} aria-hidden="true" />
                </button>
                <button className="rail-btn" onClick={() => setRailOpen(true)} aria-label="Arşivi aç" title="Arşivi aç">
                  <PanelLeftOpen size={17} aria-hidden="true" />
                </button>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button className="btn" onClick={newConv} disabled={busy} style={{ flex: 1, justifyContent: 'center' }}>
                    <Plus size={15} aria-hidden="true" /> Yeni sohbet
                  </button>
                  {view === 'work' && (
                    <button className="rail-btn" onClick={() => setRailOpen(false)} aria-label="Sohbet çubuğunu sola daralt" title="Sola daralt"><PanelLeftClose size={17} aria-hidden="true" /></button>
                  )}
                </div>
                {archiveView && <button className="sidebar-back" onClick={() => setArchiveView(false)}>← Sohbetlere dön</button>}
              </>
            )}
          </div>
          {!rail && <>
            <div className="sidebar-label sidebar-plugin-label">Eklentiler</div>
            <div className="sidebar-plugins">
              <button className="sidebar-plugin" title="Entegrasyonlar (Google Drive vb. — yakında)"><Box size={14} aria-hidden="true" /> Entegrasyonlar</button>
              <button className="sidebar-plugin" type="button" title="Görsel Oluştur — yakında Seedance / Kling AI" aria-label="Görsel Oluştur (yakında: Seedance / Kling AI)"><ImagePlus size={14} aria-hidden="true" /> Görsel Oluştur</button>
              <button className="sidebar-plugin-add" type="button" aria-label="Eklenti ekle (yakında etkinleşecek)"><Plus size={14} aria-hidden="true" /> Eklenti ekle</button>
            </div>
          </>}
          <div className="conv-list">
            {archiveView ? (
              <>
                <div className="sidebar-label"><span>Arşiv</span><span className="archive-count">{archivedConversations.length}</span></div>
                {archivedConversations.length ? archivedConversations.map((item) => renderConversation(item, 'archived')) : <p className="conv-empty">Arşivde sohbet yok.</p>}
              </>
            ) : (
              <>
                <div className="sidebar-label"><span>Sabitlenenler</span><span className="badge badge-free">FREE</span></div>
                {pinnedConversations.length ? pinnedConversations.map((item) => renderConversation(item, 'pinned')) : <p className="conv-empty">Sabitlenen sohbet yok.</p>}
                <div className="sidebar-label sidebar-conv-label">Sohbetler</div>
                {activeConversations.map((item) => renderConversation(item, 'active'))}
                <button className="sidebar-archive-link" onClick={() => setArchiveView(true)}><FolderArchive size={14} aria-hidden="true" /> Arşiv <span>{archivedConversations.length}</span></button>
              </>
            )}
          </div>
          <div className="sidebar-user">
            <span className="avatar" aria-hidden="true">{user.name.charAt(0).toLocaleUpperCase('tr-TR')}</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
              <div style={{ fontSize: 11.5, color: 'var(--muted-2)' }}>Ücretsiz plan</div>
            </div>
          </div>
        </aside>

        <main className="workarea" style={{ flex: 1, minWidth: 0 }}>
          <ChatPane conversation={conv} view={view} busy={busy} onSend={send} onPurpose={purpose} mobileSheetOpen={mobileSheetOpen} onMobileSheetToggle={() => setMobileSheetOpen((open) => !open)} />
          {view === 'work' && (
            <CanvasPane conversation={conv} busy={busy} onApprove={approve} onReject={reject} onDomain={domain} />
          )}
        </main>
      </div>

      {error && (
        <div className="toast" role="alert">
          <span>{error}</span>
          <button className="close" onClick={() => setError('')} aria-label="Kapat">×</button>
        </div>
      )}
    </div>
  );
}
