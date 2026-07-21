import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive, ArrowLeft, ChevronDown, ChevronLeft, ChevronRight, CircleUserRound, ListTodo, Mic,
  Moon, PanelTop, Pin, Plus, Send, Sun, X,
} from 'lucide-react';
import type { PublicUser, Workspace } from '@shared/types.ts';
import { ROOT_DOMAIN } from '@shared/domain.ts';
import { useTheme } from '@/lib/theme';

type Page = 'masa' | 'isler' | 'kayitlar' | 'profil';
type CardKind = 'kpi' | 'today' | 'approval' | 'workspace' | 'mega' | 'customer' | 'contacts' | 'quote' | 'task' | 'record';
type MegaStage = 'none' | 'draft' | 'creating' | 'created';

type DeskCard = {
  id: string;
  kind: CardKind;
  title: string;
  pinned?: boolean;
  collapsed?: boolean;
  moduleId?: string;
  detail?: string;
};

type Chat = { id: number; role: 'ai' | 'user'; text: string; proposal?: 'pending' | 'done' | 'rejected' };

// İşler = çalışma alanı modüllerinden türetilen sentetik örnek işler (retail-özel değil).
function tasksFor(modules: { id: string; label: string }[]): string[][] {
  const states = ['Onay bekliyor', 'Devam ediyor', 'Yapılacak', 'Engellendi'];
  const who = ['AI', 'AI', 'Sen', 'Sen'];
  return (modules.length ? modules : [{ id: 'x', label: 'Çalışma' }]).slice(0, 5).map((m, i) => [`${m.label} — örnek iş kaydı`, states[i % states.length], who[i % who.length], '—']);
}

function defaults(workspace: Workspace): DeskCard[] {
  // Masa = ÇALIŞMA ALANININ KENDİ modülleri (retail-özel örnek kart yok). Böylece her workspace
  // kendi bağlamını gösterir; iş demosuyla karışmaz.
  return [
    { id: 'kpi', kind: 'kpi', title: 'Göstergeler', pinned: true },
    ...workspace.modules.map((module) => ({ id: `module:${module.id}`, kind: 'workspace' as const, title: module.label, moduleId: module.id, detail: 'Onaylı çalışma alanı modülü' })),
  ];
}

function mobileStoreKey(workspace: Workspace) {
  return `sectrai-mobile-masa-v3:${workspace.id}`;
}

function labelFor(kind: CardKind) {
  return ({ kpi: 'GÖSTERGE', today: 'BUGÜN', approval: 'ONAY', workspace: 'MODÜL', mega: 'TASLAK', customer: 'MÜŞTERİ', contacts: 'KİŞİLER', quote: 'TEKLİF', task: 'GÖREV', record: 'KAYIT' } as const)[kind];
}

function lifecycle(card: DeskCard, mega: MegaStage, approval: boolean) {
  if (card.kind === 'approval') return approval ? 'Tamamlandı' : 'Onay bekliyor';
  if (card.kind === 'mega') return mega === 'creating' ? 'Çalışıyor' : 'Taslak';
  if (card.kind === 'customer') return 'Aktif';
  return 'Canlı';
}

export function MobileMasaDashboard({ workspace, user }: { workspace: Workspace; user: PublicUser }) {
  const [page, setPage] = useState<Page>('masa');
  const [cards, setCards] = useState<DeskCard[]>(() => defaults(workspace));
  const [focusId, setFocusId] = useState<string | null>(null);
  const [sheet, setSheet] = useState(false);
  const [input, setInput] = useState('');
  const [chat, setChat] = useState<Chat[]>([{ id: 1, role: 'ai', text: `Merhaba ${user.name.split(' ')[0]}. ${workspace.title} çalışma alanın hazır — Masa'da ne görmek istersin? (ör. "${workspace.modules[0]?.label ?? 'modüllerimi'} göster")` }]);
  const [nextChatId, setNextChatId] = useState(2);
  const [mega, setMega] = useState<MegaStage>('none');
  const [megaTax, setMegaTax] = useState('');
  const [megaCity, setMegaCity] = useState('');
  const [approved, setApproved] = useState(false);
  // Tema GLOBAL (useTheme) — KONUŞ/masa/masaüstü hepsi aynı; mobil masa kendi ayrı dark state'i tutmaz.
  const { theme, toggle: toggleTheme } = useTheme();
  const dark = theme === 'dark';
  const setDark = () => toggleTheme();
  const [offline, setOffline] = useState(false);
  const [recordTab, setRecordTab] = useState(workspace.modules[0]?.label ?? 'Kayıtlar');
  const [query, setQuery] = useState('');
  const [toast, setToast] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(mobileStoreKey(workspace)) || 'null') as { cards?: DeskCard[]; mega?: MegaStage; megaTax?: string; megaCity?: string; dark?: boolean } | null;
      if (saved?.cards?.length) setCards(saved.cards);
      if (saved?.mega) setMega(saved.mega);
      if (saved?.megaTax) setMegaTax(saved.megaTax);
      if (saved?.megaCity) setMegaCity(saved.megaCity);
    } catch { /* local preview persistence is optional */ }
  }, [workspace.id]);

  useEffect(() => {
    try { localStorage.setItem(mobileStoreKey(workspace), JSON.stringify({ cards, mega, megaTax, megaCity, dark })); } catch { /* no-op */ }
  }, [cards, dark, mega, megaCity, megaTax, workspace]);

  const notify = (message: string) => {
    clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(''), 2600);
  };

  const ordered = useMemo(() => [...cards].sort((a, b) => Number(b.pinned) - Number(a.pinned)), [cards]);
  const focusedIndex = focusId ? ordered.findIndex((item) => item.id === focusId) : -1;
  const displayed = focusedIndex >= 0 ? [ordered[focusedIndex]] : ordered;
  const updateCard = (id: string, patch: Partial<DeskCard>) => setCards((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));
  const removeCard = (id: string) => { setCards((items) => items.filter((item) => item.id !== id)); if (focusId === id) setFocusId(null); };
  const moveCard = (id: string, direction: -1 | 1) => setCards((items) => {
    const index = items.findIndex((item) => item.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= items.length) return items;
    const next = [...items]; [next[index], next[target]] = [next[target], next[index]]; return next;
  });
  const addCard = (card: DeskCard, focus = false) => setCards((items) => {
    if (items.some((item) => item.id === card.id)) return items;
    if (focus) setFocusId(card.id);
    return [...items, card];
  });

  const acceptProposal = (id: number) => {
    setChat((messages) => messages.map((message) => message.id === id ? { ...message, proposal: 'done' } : message));
    setMega('draft');
    addCard({ id: 'mega', kind: 'mega', title: 'Mega Ltd — Müşteri Taslağı' });
    setSheet(false);
    window.setTimeout(() => setChat((messages) => [...messages, { id: nextChatId + 1, role: 'ai', text: 'Taslak Masa’ya eklendi. Zorunlu alanlar tamamlanmadan onay düğmesi aktifleşmez.' }]), 220);
  };

  const send = (value = input) => {
    const text = value.trim();
    if (!text) { setSheet(true); return; }
    if (offline) { notify('Çevrimdışısınız — mesaj bağlantı gelince gönderilecek'); return; }
    const id = nextChatId;
    setNextChatId((current) => current + 2);
    setChat((messages) => [...messages, { id, role: 'user', text }]);
    setInput(''); setSheet(true);
    window.setTimeout(() => {
      const normalized = text.toLocaleLowerCase('tr-TR');
      // "Masa'da X görmek istiyorum" → eşleşen modül kartlarını Masa'ya döşe (deterministik)
      const nrm = (s: string) => s.toLocaleLowerCase('tr-TR');
      const matchedMods = workspace.modules.filter((mod) => normalized.includes(nrm(mod.label)) || nrm(mod.label).split(/[\s&/,.+·—-]+/).some((w) => w.length > 2 && normalized.includes(w)));
      const isMasaReq = /(görmek|göster|masa|istiyorum|ekle|kart|donat|panel)/.test(normalized);
      if (isMasaReq && matchedMods.length) {
        matchedMods.forEach((mod) => {
          const cardId = `module:${mod.id}`;
          setCards((items) => items.some((it) => it.id === cardId)
            ? items.map((it) => it.id === cardId ? { ...it, pinned: true } : it)
            : [{ id: cardId, kind: 'workspace' as const, title: mod.label, moduleId: mod.id, detail: 'Çalışma alanı modülü', pinned: true }, ...items]);
        });
        setPage('masa'); setFocusId(null);
        setChat((messages) => [...messages, { id: id + 1, role: 'ai', text: `${matchedMods.length} kart Masa'na döşedim ve öne aldım: ${matchedMods.map((mod) => mod.label).join(', ')}.` }]);
        return;
      }
      if (isMasaReq && !matchedMods.length) {
        setChat((messages) => [...messages, { id: id + 1, role: 'ai', text: `Bu çalışma alanının modülleri: ${workspace.modules.map((mod) => mod.label).join(', ')}. Hangilerini Masa'na döşeyeyim?` }]);
        return;
      }
      if (normalized.includes('mega')) {
        setChat((messages) => [...messages, { id: id + 1, role: 'ai', text: mega === 'created' ? 'Mega Ltd zaten kayıtlı; Müşteriler altında ve Masa’da açık.' : 'Satış alanında yeni müşteri taslağını hazırladım. Vergi numarası ve il bilgisi eksik.', proposal: mega === 'none' ? 'pending' : undefined }]);
      } else if (normalized.includes('onay')) {
        setChat((messages) => [...messages, { id: id + 1, role: 'ai', text: '1 onay bekliyor: Derin Gıda teklifi. Yetki kapısı nedeniyle benim onaylamam mümkün değil.' }]);
      } else {
        setChat((messages) => [...messages, { id: id + 1, role: 'ai', text: '"Yeni müşteri Mega Ltd ekle", "Onay bekleyenleri göster" veya "Bugünü özetle" deneyebilirsin.' }]);
      }
    }, 360);
  };

  const approveMega = () => {
    if (!megaTax.trim() || !megaCity.trim()) { notify('Önce zorunlu alanları tamamlayın'); return; }
    setMega('creating');
    window.setTimeout(() => {
      setMega('created');
      setCards((items) => items.map((item) => item.id === 'mega' ? { ...item, kind: 'customer', title: 'Mega Ltd', pinned: true } : item));
      setChat((messages) => [...messages, { id: nextChatId + 2, role: 'ai', text: 'Mega Ltd oluşturuldu (önizleme). Müşteri kartı sabitlendi ve Kayıtlar’da görünür.' }]);
      notify('Mega Ltd oluşturuldu — denetim izi güncellendi');
    }, 1200);
  };

  const openRecord = (name: string, moduleId?: string) => {
    if (name === 'Mega Ltd' && mega === 'created') { setPage('masa'); setFocusId('mega'); return; }
    const id = moduleId ? `module:${moduleId}` : `record:${name}`;
    if (!cards.some((item) => item.id === id)) addCard({ id, kind: moduleId ? 'workspace' : 'record', title: name, moduleId, detail: moduleId ? 'Çalışma alanı modülü' : 'Kayıt önizlemesi' });
    setPage('masa'); setFocusId(id);
    notify(`${name} Masa’da açıldı`);
  };

  const reset = () => {
    try { localStorage.removeItem(mobileStoreKey(workspace)); } catch { /* no-op */ }
    setCards(defaults(workspace)); setMega('none'); setMegaCity(''); setMegaTax(''); setApproved(false); setPage('masa'); setFocusId(null);
    notify('Önizleme verisi sıfırlandı');
  };

  const recs = [
    ...(mega === 'created' ? [['Mega Ltd', 'Müşteri · İzmir · Kabul süreci']] : []),
    ...workspace.modules.map((module) => [module.label, 'Çalışma alanı modülü', module.id]),
  ].filter((record) => record[0].toLocaleLowerCase('tr-TR').includes(query.toLocaleLowerCase('tr-TR')));

  // Masadan ön kapıya (KONUŞ | UYGULA) dönüş — alt-alanda www ön kapıya, kökte /app.
  const goFrontDoor = () => {
    const host = window.location.hostname;
    const onSub = host.endsWith(`.${ROOT_DOMAIN}`) && !host.startsWith('www.');
    if (onSub) window.location.assign(`${window.location.protocol}//www.${ROOT_DOMAIN}/app`);
    else window.location.assign('/app');
  };

  return (
    <div className={`mobile-masa${dark ? ' dark' : ''}`}>
      <div className="mobile-masa-banner"><span /> Design Preview — yerel önizleme verisi · Arka uca yazılmaz</div>
      {offline && <div className="mobile-masa-offline"><span /> Çevrimdışı — değişiklikler yerelde bekletilir; AI yanıt veremez</div>}
      <div className="mobile-masa-layout">
        <aside className="mobile-masa-ai-tablet">
          <AiThread chat={chat} onAccept={acceptProposal} onReject={(id) => setChat((messages) => messages.map((item) => item.id === id ? { ...item, proposal: 'rejected' } : item))} />
        </aside>
        <div className="mobile-masa-main">
          <header className="mobile-masa-header">
            <button className="mobile-masa-exit" onClick={goFrontDoor} title="KONUŞ | UYGULA ön kapısına dön" aria-label="Ön kapıya (KONUŞ/UYGULA) dön"><ArrowLeft size={16} /> KONUŞ</button>
            <div className="mobile-masa-mark">S</div>
            <div><strong>{page === 'masa' ? 'Masa' : page === 'isler' ? 'İşler' : page === 'kayitlar' ? 'Kayıtlar' : 'Profil'}</strong><small>{workspace.title} · <b>{focusId ? displayed[0]?.title : page === 'masa' ? 'Masa (genel)' : page}</b></small></div>
            <button className="mobile-masa-theme" onClick={() => setDark((value) => !value)}>{dark ? <Sun size={15} /> : <Moon size={15} />} {dark ? 'Açık' : 'Koyu'}</button>
          </header>
          <main className="mobile-masa-content">
            {page === 'masa' && <MasaPage cards={displayed} ordered={ordered} focusId={focusId} focusedIndex={focusedIndex} mega={mega} megaTax={megaTax} megaCity={megaCity} approved={approved} onFocus={setFocusId} onExitFocus={() => setFocusId(null)} onPrevious={() => focusedIndex > 0 && setFocusId(ordered[focusedIndex - 1].id)} onNext={() => focusedIndex < ordered.length - 1 && setFocusId(ordered[focusedIndex + 1].id)} onMove={moveCard} onUpdate={updateCard} onRemove={removeCard} onMegaTax={setMegaTax} onMegaCity={setMegaCity} onFill={() => { setMegaTax('4810 0042 66'); setMegaCity('İzmir'); notify('AI eksikleri tamamladı — kontrol edip onaylayın'); }} onApproveMega={approveMega} onApprove={() => setApproved(true)} onOpenRecord={openRecord} onAdd={(kind) => addCard(kind === 'contacts' ? { id: 'mega-contacts', kind, title: 'Mega Ltd — Kişiler' } : kind === 'quote' ? { id: 'mega-quote', kind, title: 'Mega Ltd — Teklif' } : { id: 'mega-task', kind: 'task', title: 'Takip görevi' })} />}
            {page === 'isler' && <TasksPage onOpen={(task) => openRecord(task)} tasks={tasksFor(workspace.modules)} />}
            {page === 'kayitlar' && <RecordsPage tab={recordTab} setTab={setRecordTab} query={query} setQuery={setQuery} records={recs} onOpen={openRecord} tabs={workspace.modules.map((mod) => mod.label)} />}
            {page === 'profil' && <ProfilePage dark={dark} setDark={setDark} offline={offline} setOffline={setOffline} onReset={reset} user={user} workspace={workspace} />}
          </main>
          <div className="mobile-masa-composer">
            <input value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && send()} placeholder={offline ? 'Çevrimdışı — mesaj bekletilecek' : "AI'ya yazın… (ör. Yeni müşteri Mega Ltd ekle)"} />
            <button title="Sesli giriş" onClick={() => notify('Mikrofon isteğe bağlıdır — önizlemede metin girişini kullanın')}><Mic size={16} /></button>
            <button className="mobile-masa-send" onClick={() => send()}><Send size={16} /> Gönder</button>
          </div>
          <nav className="mobile-masa-nav">
            <NavButton active={page === 'masa'} label="Masa" icon={<PanelTop />} onClick={() => { setPage('masa'); setFocusId(null); }} />
            <NavButton active={page === 'isler'} label="İşler" icon={<ListTodo />} onClick={() => { setPage('isler'); setFocusId(null); }} />
            <button className="mobile-masa-ai-button" title="AI Operatör" onClick={() => setSheet(true)}>AI</button>
            <NavButton active={page === 'kayitlar'} label="Kayıtlar" icon={<Archive />} onClick={() => { setPage('kayitlar'); setFocusId(null); }} />
            <NavButton active={page === 'profil'} label="Profil" icon={<CircleUserRound />} onClick={() => { setPage('profil'); setFocusId(null); }} />
          </nav>
        </div>
      </div>
      {sheet && <><button className="mobile-masa-sheet-backdrop" aria-label="AI Operatör'ü kapat" onClick={() => setSheet(false)} /><section className="mobile-masa-sheet"><button className="mobile-masa-sheet-handle" onClick={() => setSheet(false)}><span /></button><div className="mobile-masa-sheet-head"><span className="online-dot" /> <div><b>AI Operatör</b><small>Çevrimiçi · Bağlam: Masa</small></div><button onClick={() => setSheet(false)}><ChevronDown size={18} /></button></div><AiThread chat={chat} onAccept={acceptProposal} onReject={(id) => setChat((messages) => messages.map((item) => item.id === id ? { ...item, proposal: 'rejected' } : item))} /><div className="mobile-masa-sheet-input"><div className="mobile-masa-chips"><button onClick={() => send('Yeni müşteri Mega Ltd ekle')}>Yeni müşteri Mega Ltd ekle</button><button onClick={() => send('Onay bekleyenleri göster')}>Onay bekleyenleri göster</button></div><div><input value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && send()} placeholder="AI'ya yazın…" /><button onClick={() => send()}><Send size={16} /></button></div></div></section></>}
      {toast && <div className="mobile-masa-toast">{toast}</div>}
    </div>
  );
}

function NavButton({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return <button className={active ? 'active' : ''} onClick={onClick}>{icon}<span>{label}</span></button>;
}

function AiThread({ chat, onAccept, onReject }: { chat: Chat[]; onAccept: (id: number) => void; onReject: (id: number) => void }) {
  return <div className="mobile-ai-thread">{chat.map((message) => <div key={message.id} className={`mobile-ai-bubble ${message.role}`}><div>{message.text}</div>{message.proposal === 'pending' && <div className="mobile-ai-proposal"><b>Modül önerisi</b><span>“Mega Ltd — Müşteri Taslağı” Masa’ya eklensin mi?</span><div><button onClick={() => onAccept(message.id)}>Modülü ekle</button><button onClick={() => onReject(message.id)}>Vazgeç</button></div></div>}{message.proposal === 'done' && <small className="mobile-ai-done">✓ Modül Masa’ya eklendi</small>}</div>)}</div>;
}

function MasaPage(props: { cards: DeskCard[]; ordered: DeskCard[]; focusId: string | null; focusedIndex: number; mega: MegaStage; megaTax: string; megaCity: string; approved: boolean; onFocus: (id: string) => void; onExitFocus: () => void; onPrevious: () => void; onNext: () => void; onMove: (id: string, direction: -1 | 1) => void; onUpdate: (id: string, patch: Partial<DeskCard>) => void; onRemove: (id: string) => void; onMegaTax: (value: string) => void; onMegaCity: (value: string) => void; onFill: () => void; onApproveMega: () => void; onApprove: () => void; onOpenRecord: (name: string, moduleId?: string) => void; onAdd: (kind: 'contacts' | 'quote' | 'task') => void }) {
  return <div className="mobile-masa-page">{props.focusId ? <div className="mobile-masa-focus-head"><button onClick={props.onExitFocus}><ArrowLeft size={16} /> Masa</button><span>{props.focusedIndex + 1} / {props.ordered.length}</span><button onClick={props.onPrevious}><ChevronLeft /></button><button onClick={props.onNext}><ChevronRight /></button></div> : <div className="mobile-masa-switcher">{props.ordered.map((card) => <button key={card.id} className={card.pinned ? 'pinned' : ''} onClick={() => props.onFocus(card.id)}>{card.title}</button>)}</div>}<div className="mobile-masa-cards">{props.cards.map((card) => <DeskCardView key={card.id} card={card} {...props} />)}</div></div>;
}

function DeskCardView({ card, mega, megaTax, megaCity, approved, onFocus, onMove, onUpdate, onRemove, onMegaTax, onMegaCity, onFill, onApproveMega, onApprove, onOpenRecord, onAdd }: { card: DeskCard; mega: MegaStage; megaTax: string; megaCity: string; approved: boolean; onFocus: (id: string) => void; onMove: (id: string, direction: -1 | 1) => void; onUpdate: (id: string, patch: Partial<DeskCard>) => void; onRemove: (id: string) => void; onMegaTax: (value: string) => void; onMegaCity: (value: string) => void; onFill: () => void; onApproveMega: () => void; onApprove: () => void; onOpenRecord: (name: string, moduleId?: string) => void; onAdd: (kind: 'contacts' | 'quote' | 'task') => void }) {
  const ready = Boolean(megaTax.trim() && megaCity.trim());
  return <section className={`mobile-desk-card${card.pinned ? ' pinned' : ''}`}><header><button className="mobile-desk-title" onClick={() => onFocus(card.id)}><span>{labelFor(card.kind)}</span><b>{card.title}</b></button><button title="Yukarı taşı" onClick={() => onMove(card.id, -1)}>▲</button><button title="Aşağı taşı" onClick={() => onMove(card.id, 1)}>▼</button><button title="Daralt" onClick={() => onUpdate(card.id, { collapsed: !card.collapsed })}>{card.collapsed ? '+' : '–'}</button><button title="Sabitle" className={card.pinned ? 'pin active' : 'pin'} onClick={() => onUpdate(card.id, { pinned: !card.pinned })}><Pin size={13} /></button><button title="Kapat" onClick={() => onRemove(card.id)}><X size={14} /></button></header><div className="mobile-desk-meta"><span>Kaynak: {card.kind === 'workspace' ? 'Çalışma alanı' : card.kind === 'customer' ? 'AI Operatör' : 'Sistem + AI'}</span><b>{lifecycle(card, mega, approved)}</b></div>{!card.collapsed && <div className="mobile-desk-body">{card.kind === 'kpi' && <div className="mobile-kpis">{[['Aktif modül', '—', 'çalışma alanı'], ['Kayıt', '—', 'sentetik önizleme'], ['AI önerisi', '—', 'onay bekliyor'], ['Denetim', '✓', 'kayıtlı']].map(([label, value, sub]) => <div key={label}><small>{label}</small><strong>{value}</strong><span>{sub}</span></div>)}</div>}{card.kind === 'today' && <div className="mobile-today">{[['—', 'Çalışma alanın hazır — AI Operatör’e ne görmek istediğini yaz'], ['—', 'Modül kartları sağdaki tuvalde; sürükleyip düzenleyebilirsin'], ['—', 'Her işlem önce önerilir, senin onayınla uygulanır']].map(([time, text], i) => <div key={i}><small>{time}</small><span>{text}</span></div>)}</div>}{card.kind === 'approval' && <div className="mobile-approval"><b>Derin Gıda A.Ş. — Filo sözleşmesi yenileme teklifi</b><span>AI Operatör hazırladı · ₺184.000 / 12 ay</span>{approved ? <p>● Onaylandı — gönderim kuyruğunda (önizleme)</p> : <div><button onClick={onApprove}>Onayla…</button><button>Reddet</button><small>Onaysız gönderim yapılamaz — yetki kapısı aktif.</small></div>}</div>}{card.kind === 'workspace' && <div className="mobile-workspace-card"><b>{card.title}</b><span>{card.detail}</span><button onClick={() => onOpenRecord(card.title, card.moduleId)}>Kayıtları aç →</button></div>}{card.kind === 'mega' && <div className="mobile-mega"><div className="mobile-mega-steps"><b>Taslak</b> → <b className={ready ? 'current' : ''}>Onay bekliyor</b> → <b>Çalışıyor</b> → <b>Tamamlandı</b></div>{mega === 'creating' ? <p className="mobile-running">Kayıt doğrulanıyor…</p> : <><div className="mobile-mega-grid"><span>Firma adı<b>Mega Ltd</b></span><span>Tür<b>Müşteri (Firma)</b></span><span>Sorumlu<b>Tayla</b></span><span>Çalışma alanı<b>Satış</b></span></div><div className="mobile-missing"><b>Eksik zorunlu alanlar</b><input value={megaTax} onChange={(event) => onMegaTax(event.target.value)} placeholder="Vergi numarası *" /><input value={megaCity} onChange={(event) => onMegaCity(event.target.value)} placeholder="İl *" /><button onClick={onFill}>Eksikleri AI ile doldur</button></div><div className="mobile-mega-actions"><button disabled={!ready} onClick={onApproveMega}>Onayla ve oluştur</button><button>Vazgeç</button></div><small>Karar insanda — AI bu düğmeye basamaz.</small></>}</div>}{card.kind === 'customer' && <div className="mobile-customer"><div><span>M</span><b>Mega Ltd<small>Müşteri · İzmir · VN 4810 0042 66</small></b><em>Aktif</em></div><p>Sorumlu: <b>Tayla</b> · Kaynak: <b>AI Operatör</b></p><div className="mobile-customer-actions"><button onClick={() => onFocus(card.id)}>Müşteriyi aç</button><button onClick={() => onAdd('contacts')}>İlgili kişi ekle</button><button onClick={() => onAdd('quote')}>Teklif oluştur</button><button onClick={() => onAdd('task')}>Görev oluştur</button></div></div>}{card.kind === 'contacts' && <div className="mobile-empty-module">Mega Ltd için henüz ilgili kişi yok.<button><Plus size={14} /> Kişi ekle</button></div>}{card.kind === 'quote' && <div className="mobile-quote"><b>Taslak · AI Operatör</b><span>Şehirlerarası taşıma <strong>₺31.000</strong></span><span>Depo içi elleçleme <strong>₺9.500</strong></span><span>Toplam (aylık) <strong>₺46.500</strong></span><button>Onaya gönder</button></div>}{card.kind === 'task' && <div className="mobile-empty-module"><b>Mega Ltd başlangıç görüşmesi planla</b><span>Sorumlu: Tayla · Termin: 21 Tem</span></div>}{card.kind === 'record' && <div className="mobile-empty-module"><b>{card.title}</b><span>{card.detail}</span><button>AI ile devam et</button></div>}</div>}</section>;
}

function TasksPage({ onOpen, tasks }: { onOpen: (title: string) => void; tasks: string[][] }) { return <div className="mobile-list-page"><div className="mobile-list-toolbar"><input placeholder="İşlerde ara…" /><div><button className="active">Liste</button><button>Pano</button></div></div><p>Bir işe dokunmak onu Masa’ya modül olarak ekler.</p><div className="mobile-list">{tasks.map(([title, state, owner, due]) => <button key={title} onClick={() => onOpen(title)}><div><b>{title}</b><small>{owner} · {due}</small>{state === 'Engellendi' && <em>Engel: Depo kapasite onayı bekleniyor</em>}</div><span className={state.replaceAll(' ', '-').toLocaleLowerCase('tr-TR')}>{state}</span></button>)}</div></div>; }

function RecordsPage({ tab, setTab, query, setQuery, records, onOpen, tabs }: { tab: string; setTab: (value: string) => void; query: string; setQuery: (value: string) => void; records: string[][]; onOpen: (name: string, moduleId?: string) => void; tabs: string[] }) { return <div className="mobile-list-page"><input className="mobile-record-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Kayıtlarda ara…" /><div className="mobile-record-tabs">{tabs.map((item) => <button key={item} className={tab === item ? 'active' : ''} onClick={() => setTab(item)}>{item} <span>{records.filter((r) => r[0] === item).length}</span></button>)}</div><p>Bir kayda dokunmak onu Masa’ya modül olarak ekler — sabitli modüller korunur.</p><div className="mobile-list">{records.map(([name, detail, moduleId]) => <button key={name} onClick={() => onOpen(name, moduleId)}><i>{name.charAt(0)}</i><div><b>{name}</b><small>{detail}</small></div><span>AI</span></button>)}</div></div>; }

function ProfilePage({ dark, setDark, offline, setOffline, onReset, user, workspace }: { dark: boolean; setDark: (value: boolean) => void; offline: boolean; setOffline: (value: boolean) => void; onReset: () => void; user: PublicUser; workspace: Workspace }) { return <div className="mobile-profile"><section><span>{user.name.charAt(0)}</span><div><b>{user.name}</b><small>Sahip · {workspace.title}</small></div></section><section><label><button className={dark ? 'on' : ''} onClick={() => setDark(!dark)}><i /></button><span>Koyu tema: <b>{dark ? 'Açık' : 'Kapalı'}</b></span></label><label><button><i /></button><span>Sesli yanıt: <b>Kapalı</b><small>Varsayılan kapalı; hassas içerik otomatik seslendirilmez.</small></span></label><label><button className={offline ? 'on' : ''} onClick={() => setOffline(!offline)}><i /></button><span>Çevrimdışı simülasyonu: <b>{offline ? 'Açık' : 'Kapalı'}</b><small>Önizleme amaçlı — bağlantısız durumu gösterir.</small></span></label></section><section><p>Modül düzeni ve Mega Ltd demo durumu bu tarayıcıda saklanır.</p><button className="mobile-reset" onClick={onReset}>Önizlemeyi sıfırla</button></section></div>; }
