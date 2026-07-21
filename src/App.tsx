import { useEffect, useMemo, useRef, useState, type FormEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import {
  createScenario, getFinance, riskBriefing, reviewTask, saveMasaLayout, submitTask, uploadEvidence,
  type FinanceState, type ProofType, type RiskBriefing, type Role, type Task,
} from './lib/api'
import { AppHeader, type ShellView } from './components/AppHeader'
import { MobileMasaDashboard } from './components/masa/MobileMasaDashboard'
import { AppShell } from './pages/AppShell'
import { DashboardPage } from './pages/DashboardPage'

type View = 'masa' | 'workflow' | 'ledger' | 'roles' | 'audit'
type ModuleView = Exclude<View, 'masa'>
type DeskCard = { id: ModuleView; label: string; detail: string; x: number; y: number; w: number; h: number; z: number; pinned?: boolean; collapsed?: boolean }

const roleOptions: Array<{ value: Role; label: string; detail: string }> = [
  { value: 'L1_ADMIN', label: 'L1 · Yönetici Ortak', detail: 'Masa ve tüm kayıtlar' },
  { value: 'L2_CHECKER', label: 'L2 · Proje Müdürü', detail: 'Kanıt onay/red' },
  { value: 'L3_WORKER', label: 'L3 · Mali Müşavir', detail: 'Atanan görev ve kanıt' },
  { value: 'L4_FIELD', label: 'L4 · Dokümantasyon', detail: 'Basit görev ve kanıt' },
]

const moduleMeta: Record<ModuleView, { label: string; detail: string; icon: string }> = {
  workflow: { label: 'İş Akışı', detail: 'Kanıt, onay kilidi ve revizyon', icon: '↗' },
  ledger: { label: 'Kayıt Defterleri', detail: 'Sentetik finans incelemeleri', icon: '▤' },
  roles: { label: 'Ekip & Roller', detail: 'Profesyonel hizmet hiyerarşisi', icon: '◉' },
  audit: { label: 'Denetim İzi', detail: 'Append-only olay günlüğü', icon: '◇' },
}

const defaultDeskCards: DeskCard[] = [
  { id: 'workflow', label: moduleMeta.workflow.label, detail: moduleMeta.workflow.detail, x: 30, y: 28, w: 350, h: 240, z: 1 },
  { id: 'ledger', label: moduleMeta.ledger.label, detail: moduleMeta.ledger.detail, x: 405, y: 28, w: 350, h: 240, z: 2 },
  { id: 'roles', label: moduleMeta.roles.label, detail: moduleMeta.roles.detail, x: 30, y: 298, w: 350, h: 240, z: 3 },
  { id: 'audit', label: moduleMeta.audit.label, detail: moduleMeta.audit.detail, x: 405, y: 298, w: 350, h: 240, z: 4 },
]

const statusLabel: Record<Task['status'], string> = {
  LOCKED: 'Kilitli', READY: 'Kanıt bekliyor', PENDING_REVIEW: 'Checker incelemesinde', REJECTED: 'Revizyon istendi', APPROVED: 'Onaylandı',
}
const money = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 })

function fileBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('PROOF_FILE_READ_FAILED'))
    reader.onload = () => {
      const data = String(reader.result || '')
      const comma = data.indexOf(',')
      if (comma < 0) return reject(new Error('PROOF_FILE_READ_FAILED'))
      resolve(data.slice(comma + 1))
    }
    reader.readAsDataURL(file)
  })
}

async function sha256(file: File): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer())
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function proofSatisfied(task: Task) { return task.proofTypes.every((type) => task.evidence.some((proof) => proof.type === type)) }
function limit(value: number, min: number, max = 1600) { return Math.min(max, Math.max(min, Math.round(value))) }

function App() {
  const [role, setRole] = useState<Role>('L1_ADMIN')
  const [shellView, setShellView] = useState<ShellView>('chat')
  const [view, setView] = useState<View>('masa')
  const [compactMasa, setCompactMasa] = useState(() => window.matchMedia?.('(max-width: 1199px)').matches ?? false)
  const [state, setState] = useState<FinanceState | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [opOpen, setOpOpen] = useState(true)
  const [sideOpen, setSideOpen] = useState(true)
  const [talkMode, setTalkMode] = useState(false)
  const [stepsOpen, setStepsOpen] = useState(true)
  const [cards, setCards] = useState<DeskCard[]>(defaultDeskCards)
  const [closedCards, setClosedCards] = useState<ModuleView[]>([])
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File | undefined>>({})
  const [proofSelection, setProofSelection] = useState<Record<string, ProofType>>({})
  const [reasons, setReasons] = useState<Record<string, string>>({})
  const [riskBriefs, setRiskBriefs] = useState<Record<string, RiskBriefing | undefined>>({})
  const [templateId, setTemplateId] = useState('baseline')
  const [operatorInput, setOperatorInput] = useState('')
  const [operatorMessages, setOperatorMessages] = useState<Array<{ role: 'user' | 'ai'; text: string }>>([])
  const [shadowMode, setShadowMode] = useState(false)
  const [voiceMode, setVoiceMode] = useState(false)
  const [autonomyMode, setAutonomyMode] = useState(false)
  const layoutRef = useRef(cards)

  const load = async (nextRole = role) => {
    setLoading(true)
    setError('')
    try { setState(await getFinance(nextRole)) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Finans API yüklenemedi') }
    finally { setLoading(false) }
  }
  useEffect(() => { void load(role) }, [role])
  useEffect(() => {
    const query = window.matchMedia?.('(max-width: 1199px)')
    if (!query) return
    const sync = () => setCompactMasa(query.matches)
    query.addEventListener?.('change', sync)
    return () => query.removeEventListener?.('change', sync)
  }, [])
  useEffect(() => { layoutRef.current = cards }, [cards])
  useEffect(() => {
    if (!state?.workspace.masaLayout) return
    const next = state.workspace.masaLayout.map((item) => ({ ...item, label: moduleMeta[item.id].label, detail: moduleMeta[item.id].detail }))
    layoutRef.current = next
    setCards(next)
  }, [state?.workspace.masaLayout])

  const roleInfo = roleOptions.find((item) => item.value === role)!
  const pendingCount = useMemo(() => state?.tasks.filter((task) => task.status === 'PENDING_REVIEW').length ?? 0, [state])
  const readyCount = useMemo(() => state?.tasks.filter((task) => task.status === 'READY' || task.status === 'REJECTED').length ?? 0, [state])
  const actorName = roleInfo.label.split('· ')[1]?.split(' ')[0] ?? 'Yönetici'

  async function perform(action: () => Promise<void>, success: string) {
    setSaving(true)
    setError('')
    try { await action(); setNotice(success); await load() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'İşlem gerçekleştirilemedi') }
    finally { setSaving(false) }
  }

  async function sendProof(task: Task) {
    const file = selectedFiles[task.id]
    const type = proofSelection[task.id] ?? task.proofTypes[0]
    if (!file) return
    if (file.size > 2_000_000) { setError('Kanıt dosyası en fazla 2 MB olabilir.'); return }
    await perform(async () => {
      await uploadEvidence(role, task.id, { type, file: { name: file.name, mimeType: file.type || 'application/octet-stream', base64: await fileBase64(file), sha256: await sha256(file) } })
      setSelectedFiles((current) => ({ ...current, [task.id]: undefined }))
    }, 'Kanıt dosyası hash doğrulamasıyla kayda alındı.')
  }

  async function persistLayout(next = layoutRef.current) {
    if (role !== 'L1_ADMIN') return
    try { await saveMasaLayout(role, next.map(({ id, x, y, w, h, z, pinned = false, collapsed = false }) => ({ id, x, y, w, h, z, pinned, collapsed }))) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Masa yerleşimi kaydedilemedi') }
  }
  function applyCard(id: ModuleView, change: (card: DeskCard) => DeskCard) {
    const next = layoutRef.current.map((card) => card.id === id ? change(card) : card)
    layoutRef.current = next
    setCards(next)
  }
  function focusCard(id: ModuleView) {
    const top = Math.max(...layoutRef.current.map((card) => card.z)) + 1
    applyCard(id, (card) => ({ ...card, z: top }))
  }
  function startMove(event: ReactPointerEvent<HTMLElement>, card: DeskCard) {
    if (card.pinned || (event.target as HTMLElement).closest('button')) return
    event.preventDefault()
    focusCard(card.id)
    const origin = { x: card.x, y: card.y, pointerX: event.clientX, pointerY: event.clientY }
    const move = (pointer: PointerEvent) => applyCard(card.id, (item) => ({ ...item, x: limit(origin.x + pointer.clientX - origin.pointerX, 0), y: limit(origin.y + pointer.clientY - origin.pointerY, 0, 900) }))
    const up = () => { document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up); void persistLayout() }
    document.addEventListener('pointermove', move)
    document.addEventListener('pointerup', up)
  }
  function startResize(event: ReactPointerEvent<HTMLButtonElement>, card: DeskCard) {
    if (card.pinned) return
    event.preventDefault(); event.stopPropagation(); focusCard(card.id)
    const origin = { w: card.w, h: card.h, pointerX: event.clientX, pointerY: event.clientY }
    const move = (pointer: PointerEvent) => applyCard(card.id, (item) => ({ ...item, w: limit(origin.w + pointer.clientX - origin.pointerX, 270, 620), h: limit(origin.h + pointer.clientY - origin.pointerY, 130, 470) }))
    const up = () => { document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up); void persistLayout() }
    document.addEventListener('pointermove', move)
    document.addEventListener('pointerup', up)
  }
  function openModule(id: ModuleView) { setView(id); setTalkMode(false) }
  function submitOperator(event: FormEvent) {
    event.preventDefault()
    const text = operatorInput.trim()
    if (!text) return
    setOperatorMessages((current) => [...current, { role: 'user', text }, { role: 'ai', text: 'Bu sentetik önizlemede komutu kanıtlarıyla hazırlıyorum. Uygulama adımı ancak senin onayınla ilerler.' }])
    setOperatorInput('')
  }
  function askOperator(text: string) { setOperatorInput(text); setOpOpen(true); setTalkMode(true) }

  const TaskCard = ({ task }: { task: Task }) => {
    const workerView = role === 'L3_WORKER' || role === 'L4_FIELD'
    const checkerView = role === 'L2_CHECKER'
    const selectedType = proofSelection[task.id] ?? task.proofTypes[0]
    const riskBrief = riskBriefs[task.id]
    return <article className={`task-card ${task.status.toLowerCase()}`}>
      <div className="task-head"><div><span className="eyebrow">{task.module.toUpperCase()} · {task.id}</span><h3>{task.title}</h3></div><span className={`task-status ${task.status.toLowerCase()}`}>{statusLabel[task.status]}</span></div>
      <p className="task-meta">Zorunlu kanıt: <strong>{task.proofTypes.join(' + ')}</strong> · Bağımlılık: <strong>{task.dependsOn.length ? task.dependsOn.join(', ') : 'Yok'}</strong></p>
      {task.status === 'LOCKED' && <p className="locked-note">Önceki görev checker tarafından onaylanmadan bu adım açılamaz.</p>}
      {task.rejectionReason && <p className="rejection-note"><strong>Red gerekçesi:</strong> {task.rejectionReason}</p>}
      {task.evidence.length > 0 && <div className="proof-list"><strong>Kanıt zinciri</strong>{task.evidence.map((proof) => <p key={proof.id}><span>{proof.type}</span>{proof.fileName}<small>SHA-256 {proof.sha256.slice(0, 12)}…</small></p>)}</div>}
      {workerView && task.status !== 'LOCKED' && task.status !== 'PENDING_REVIEW' && task.status !== 'APPROVED' && <div className="worker-actions">
        <label>Kanıt türü<select value={selectedType} onChange={(event) => setProofSelection((current) => ({ ...current, [task.id]: event.target.value as ProofType }))} disabled={saving}>{task.proofTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
        <label>Kanıt dosyası<input type="file" onChange={(event) => setSelectedFiles((current) => ({ ...current, [task.id]: event.target.files?.[0] }))} disabled={saving} /></label>
        <button className="btn" disabled={saving || !selectedFiles[task.id]} onClick={() => void sendProof(task)}>Kanıtı yükle</button>
        <button className="btn btn-primary" disabled={saving || !proofSatisfied(task)} onClick={() => void perform(async () => { await submitTask(role, task.id) }, 'Görev checker incelemesine gönderildi.')}>İncelemeye gönder</button>
      </div>}
      {checkerView && task.status === 'PENDING_REVIEW' && <div className="checker-actions">
        <button className="btn btn-primary" disabled={saving} onClick={() => void perform(async () => { await reviewTask(role, task.id, 'APPROVE') }, 'Kanıt onaylandı; bağımlı görevler yeniden değerlendirildi.')}>Kanıtı onayla</button>
        <label className="wide">Red gerekçesi<textarea value={reasons[task.id] ?? ''} onChange={(event) => setReasons((current) => ({ ...current, [task.id]: event.target.value }))} placeholder="Worker'a somut revizyon gerekçesi yazın" maxLength={1000} /></label>
        <button className="btn danger" disabled={saving || !(reasons[task.id] ?? '').trim()} onClick={() => void perform(async () => { await reviewTask(role, task.id, 'REJECT', reasons[task.id]) }, 'Kanıt reddedildi; görev revizyon için worker’a döndü.')}>Revizyona gönder</button>
      </div>}
      {(role === 'L1_ADMIN' || checkerView) && <div className="risk-actions"><button className="btn" disabled={saving} onClick={() => void perform(async () => { const briefing = await riskBriefing(role, task.id); setRiskBriefs((current) => ({ ...current, [task.id]: briefing })) }, 'Sentetik AI ön-denetim sonucu hazırlandı; karar insan incelemesinde.')}>AI ön-denetimini hazırla</button>{riskBrief && <div className="risk-brief"><strong>{riskBrief.label}</strong>{riskBrief.signals.map((signal) => <p key={signal}>{signal}</p>)}<small>Karar: insan incelemesi zorunlu.</small></div>}</div>}
    </article>
  }

  function moduleContent() {
    if (!state || view === 'masa') return null
    const meta = moduleMeta[view]
    if (view === 'workflow') return <><ModuleHeading meta={meta} onBack={() => setView('masa')} /><div className="task-grid">{state.tasks.map((task) => <TaskCard key={task.id} task={task} />)}{state.tasks.length === 0 && <p className="empty">Bu role atanmış görev yok. Sunucu rol görünürlüğünü fail-closed filtreledi.</p>}</div></>
    if (view === 'ledger') return <><ModuleHeading meta={meta} onBack={() => setView('masa')} right={role === 'L1_ADMIN' ? <div className="scenario-control"><label>Şablon<select value={templateId} onChange={(event) => setTemplateId(event.target.value)} disabled={saving}><option value="baseline">Baz senaryo</option><option value="delayed">Gecikmiş tahsilat</option><option value="stress">Stres senaryosu</option></select></label><button className="btn btn-primary" disabled={saving} onClick={() => void perform(async () => { await createScenario(role, templateId) }, 'Sentetik nakit akışı senaryosu kaydedildi.')}>Senaryo oluştur</button></div> : undefined} />{state.cashflowScenarios.length ? <div className="scenario-grid">{state.cashflowScenarios.slice(0, 3).map((scenario) => <article key={scenario.id}><b>{scenario.title}</b><span>{scenario.horizon}</span><dl><div><dt>Açılış</dt><dd>{money.format(scenario.opening)}</dd></div><div><dt>Giriş</dt><dd>{money.format(scenario.inflow)}</dd></div><div><dt>Çıkış</dt><dd>{money.format(scenario.outflow)}</dd></div><div><dt>Kapanış</dt><dd>{money.format(scenario.closing)}</dd></div></dl></article>)}</div> : <p className="empty">Bu rolün finans kayıtlarına erişimi yok.</p>}</>
    if (view === 'roles') return <><ModuleHeading meta={meta} onBack={() => setView('masa')} /><div className="role-grid">{state.team.map((member) => <article key={member.id}><span>{member.level}</span><h3>{member.role}</h3><p>{member.name}</p><small>{member.department}</small></article>)}</div><p className="rbac-note"><strong>Yetki özeti:</strong> L1 masa/kayıt/audit; L2 atanan kanıtı onaylar veya gerekçeli reddeder; L3 yalnız kendi görevine kanıt yükler; L4 yalnız basit doküman/saha görevi görür.</p></>
    return <><ModuleHeading meta={meta} onBack={() => setView('masa')} /><div className="audit-list">{state.auditTrail.slice().reverse().map((event) => <article key={event.id}><div><strong>{event.action}</strong><span>{new Date(event.at).toLocaleString('tr-TR')}</span></div><p>{event.detail}</p><small>{event.actorName} · {event.role} · IP {event.ip}{event.gps ? ` · GPS ${event.gps}` : ' · GPS sağlanmadı'}</small></article>)}</div></>
  }

  const visibleCards = cards.filter((card) => !closedCards.includes(card.id))
  const closed = defaultDeskCards.filter((card) => closedCards.includes(card.id))
  const examples = ['Tahsilat mutabakatını hazırla', 'Bu ayın özetini çıkar', 'Bekleyen kanıtları göster']

  if (shellView !== 'masa') {
    return <AppShell state={state} role={role} onRoleChange={(nextRole) => { setRole(nextRole); setView('masa') }} onMasa={() => setShellView('masa')} />
  }
  if (compactMasa && !loading && state && view === 'masa') {
    return <MobileMasaDashboard title={state.workspace.container.title} actor={actorName} modules={(Object.keys(moduleMeta) as ModuleView[]).map((id) => ({ id, label: moduleMeta[id].label, detail: moduleMeta[id].detail }))} pendingCount={pendingCount} readyCount={readyCount} taskCount={state.tasks.length} onTalk={() => setShellView('chat')} onOpenModule={(id) => openModule(id as ModuleView)} />
  }

  return <DashboardPage>
    {sideOpen ? <aside className="masa-side" aria-label="Çalışma alanı menüsü">
      <div className="masa-brand"><span className="logo-orb" aria-hidden="true" /><div className="masa-brand-txt"><div className="masa-brand-name">SECTRAI Finans</div><div className="masa-brand-sub">Profesyonel hizmetler · 4 modül</div></div><button className="masa-ic" title="Menüyü daralt" aria-label="Menüyü daralt" onClick={() => setSideOpen(false)}>‹</button></div>
      <nav className="masa-nav"><div className="masa-nav-group">Çalışma</div><button className={`masa-nav-item${view === 'masa' ? ' active' : ''}`} onClick={() => setView('masa')}><i>▦</i><span>Masa</span></button><button className="masa-nav-item" onClick={() => setView('masa')}><i>⌂</i><span>Bugün</span></button><button className="masa-nav-item ai" onClick={() => setShellView('chat')}><i>✦</i><span>AI Operatör</span></button><div className="masa-nav-group">Modüller</div>{(Object.keys(moduleMeta) as ModuleView[]).map((id) => <button key={id} className={`masa-nav-item${view === id ? ' active' : ''}`} onClick={() => openModule(id)}><i>{moduleMeta[id].icon}</i><span>{moduleMeta[id].label}</span></button>)}</nav>
      <div className="masa-side-foot"><span>SEKTÖR HİYERARŞİSİ</span><strong>Müvekkil / Danışmanlık Proje Dosyası</strong></div>
    </aside> : <button className="masa-side-rail" title="Menüyü aç" aria-label="Menüyü aç" onClick={() => setSideOpen(true)}>›<span className="rail-txt">MENÜ</span></button>}

    {opOpen ? <aside className="masa-op" aria-label="AI Operatör">
      <div className="masa-op-head"><span className="masa-op-ic">✦</span><div className="masa-op-titles"><div className="masa-op-title">SECTRAI AI Operatör</div><div className="masa-op-sub">Konuş, o yapsın — sen onayla</div></div><button className="masa-ic" title="Paneli kapat" aria-label="AI panelini kapat" onClick={() => setOpOpen(false)}>‹</button></div>
      <div className="masa-op-ctx"><span className="masa-op-chip">Atlas Ltd. · Temmuz mutabakatı</span></div>
      <div className="masa-op-body">{operatorMessages.length === 0 ? <div className="masa-op-intro"><p className="masa-op-intro-t">Ne yapmak istersin? Bir komut yaz ya da örneklerden seç:</p><div className="masa-op-examples">{examples.map((example) => <button key={example} type="button" className="masa-op-ex" onClick={() => askOperator(example)}>{example}</button>)}</div><p className="masa-op-note">Sentetik önizleme — her aksiyon önce önerilir, uygulama senin onayınla olur.</p></div> : <div className="masa-op-thread">{operatorMessages.map((message, index) => <div key={index} className={`masa-op-bubble ${message.role}`}>{message.text}</div>)}</div>}</div>
      <div className="masa-op-foot"><div className="masa-op-modes"><button type="button" className={`masa-mode${shadowMode ? ' on' : ''}`} onClick={() => setShadowMode((current) => !current)}>{shadowMode ? 'Gölge açık' : 'Gölge mod'}</button><button type="button" className={`masa-mode${voiceMode ? ' on' : ''}`} onClick={() => setVoiceMode((current) => !current)}>{voiceMode ? 'Ses açık' : 'Ses kapalı'}</button><button type="button" className={`masa-mode${autonomyMode ? ' on' : ''}`} onClick={() => setAutonomyMode((current) => !current)}>{autonomyMode ? 'Otonom açık' : 'Otonom kapalı'}</button></div><form className="masa-op-input" onSubmit={submitOperator}><button type="button" className="masa-ic" aria-label="Ek ekle">⌇</button><input value={operatorInput} onChange={(event) => setOperatorInput(event.target.value)} placeholder="Komutunu yaz…" aria-label="AI operatöre komut" autoFocus={talkMode} /><button type="submit" className="masa-ic send" title="Gönder" aria-label="Gönder" disabled={!operatorInput.trim()}>↑</button></form></div>
    </aside> : <button className="masa-op-rail" title="AI Operatör panelini aç" aria-label="AI Operatör panelini aç" onClick={() => setOpOpen(true)}>✦<span className="rail-txt">AI OPERATÖR</span></button>}

    <main className="masa-main">
      <AppHeader active="masa" onViewChange={(nextView) => { if (nextView === 'masa') setView('masa'); else setShellView(nextView) }} role={role} onRoleChange={(nextRole) => { setRole(nextRole); setView('masa') }} />
      {loading && <p className="state" role="status">Rol kapsamındaki sentetik çalışma alanı yükleniyor…</p>}
      {error && <p className="state error" role="alert">{error}<button onClick={() => void load()}>Tekrar dene</button></p>}
      {!loading && state && view === 'masa' && <div className="masa-content masa-dashboard-content">
        <div className="masa-dashboard-chrome"><div className="masa-welcome"><div><h1>Hoş geldin, {actorName}! <span aria-hidden="true">👋</span></h1><p>{state.workspace.container.title} çalışma alanın hazır. Soldaki AI Operatör'e konuş — önerir, sen onaylarsın.</p></div><button className="btn btn-primary" onClick={() => setShellView('chat')}>✦ AI Operatör ile başla</button></div>
          <div className="masa-stats"><div className="masa-stat"><div className="masa-stat-v">4</div><div className="masa-stat-l">Modül</div></div><div className="masa-stat"><div className="masa-stat-v">{pendingCount}</div><div className="masa-stat-l">Checker kuyruğu</div></div><div className="masa-stat"><div className="masa-stat-v">{readyCount}</div><div className="masa-stat-l">Kanıt bekliyor</div></div><div className="masa-stat"><div className="masa-stat-v accent">Sentetik demo</div><div className="masa-stat-l">Veri modu</div></div></div>
          {stepsOpen && <section className="masa-steps"><div className="masa-steps-head"><span>Önerilen adımlar</span><button className="masa-ic" aria-label="Önerilen adımları kapat" onClick={() => setStepsOpen(false)}>×</button></div><div className="masa-steps-grid"><div className="masa-step-card"><div className="masa-step-t">◇ Kayıt zincirini kontrol et</div><p className="masa-step-desc">Kanıtı hazırla, checker kararını al ve sonraki adımı kilitten çıkar.</p><button className="btn" onClick={() => openModule('workflow')}>İş akışını aç</button></div><div className="masa-step-card"><div className="masa-step-t">✦ AI önerisini incele</div><p className="masa-step-desc">Operatör yalnız öneri ve kanıt özeti verir; dış işlem başlatmaz.</p><button className="btn" onClick={() => setShellView('chat')}>AI Operatör'ü aç</button></div></div></section>}
          <div className="masa-desk-head"><h2>▦ Finans modüllerin</h2><div className="masa-reopen"><button className="btn masa-reset-btn" onClick={() => { layoutRef.current = defaultDeskCards; setCards(defaultDeskCards); setClosedCards([]); void persistLayout(defaultDeskCards) }}>↺ Düzeni sıfırla</button>{closed.map((card) => <button key={card.id} className="chip" onClick={() => setClosedCards((current) => current.filter((id) => id !== card.id))}>+ {card.label}</button>)}</div></div>
          <p className="masa-honesty">Kartı başlığından tutup taşı; sağ alt köşeden serbestçe boyutlandır. Kilitleme, daraltma ve kapatma yerelde güvenli önizleme olarak uygulanır.</p>
        </div>
        <div className="masa-canvas-viewport" aria-label="Serbest çalışma masası"><div className="masa-canvas">{visibleCards.map((card) => <section key={card.id} className={`masa-card${card.pinned ? ' pinned' : ''}${card.collapsed ? ' collapsed' : ''}`} style={{ left: card.x, top: card.y, width: card.w, height: card.collapsed ? undefined : card.h, zIndex: card.z }} onPointerDown={() => focusCard(card.id)}><div className={`masa-card-head${card.pinned ? ' locked' : ''}`} tabIndex={0} onPointerDown={(event) => startMove(event, card)}><span className="masa-drag-handle">⠿</span><span className="masa-type">MODÜL</span><h3 className="masa-card-title">{card.label}</h3><span className="masa-dimensions">{card.w}×{card.h}</span><div className="masa-card-ctrls"><button className={`masa-ic${card.pinned ? ' on' : ''}`} aria-label={`${card.label} konumunu ${card.pinned ? 'aç' : 'kilitle'}`} onClick={() => { applyCard(card.id, (item) => ({ ...item, pinned: !item.pinned })); void persistLayout() }}>⌖</button><button className="masa-ic" aria-label={`${card.label} kartını ${card.collapsed ? 'genişlet' : 'daralt'}`} onClick={() => { applyCard(card.id, (item) => ({ ...item, collapsed: !item.collapsed })); void persistLayout() }}>{card.collapsed ? '+' : '−'}</button><button className="masa-ic" aria-label={`${card.label} modülünü kapat`} onClick={() => setClosedCards((current) => [...current, card.id])}>×</button></div></div><div className="masa-card-meta"><span className="masa-meta-src">Kayıt defteri · {card.id}</span><span className="masa-life accent">Sentetik demo</span></div>{!card.collapsed && <div className="masa-card-body"><div className="masa-body-count"><strong className="masa-body-num">{card.id === 'workflow' ? state.tasks.length : card.id === 'roles' ? state.team.length : card.id === 'audit' ? state.auditTrail.length : state.cashflowScenarios.length}</strong><span className="masa-body-lbl">görünür kayıt</span></div><p className="masa-card-note">{card.detail}. Ayrıntıları aç; AI önerir, insan onaylar.</p><button className="masa-open-btn" onClick={() => openModule(card.id)}>Kayıtları aç →</button></div>}{!card.collapsed && !card.pinned && <button className="masa-resize-handle" type="button" onPointerDown={(event) => startResize(event, card)} aria-label={`${card.label} kartını boyutlandır`}>◢</button>}</section>)}{visibleCards.length === 0 && <p className="masa-empty masa-canvas-empty">Masa boş — yukarıdaki çiplerden modülü tekrar ekle.</p>}</div></div>
        <div className="safety-footer masa-dashboard-footer"><span>SENTETİK-ONLY</span><span>ÜRETİME YAZMAZ</span><span>YALNIZ SAHİBİ GÖRÜR</span><span>AI ÖNERİR · İNSAN ONAYLAR</span></div>
      </div>}
      {!loading && state && view !== 'masa' && <section className="masa-content module-content">{moduleContent()}</section>}
      {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice('')}>×</button></div>}
    </main>
  </DashboardPage>
}

function ModuleHeading({ meta, onBack, right }: { meta: { label: string; detail: string }; onBack: () => void; right?: ReactNode }) {
  return <div className="module-heading"><div><button className="back-link" onClick={onBack}>← MASA</button><p className="eyebrow">FİNANS · KAYIT DEFTERİ</p><h1>{meta.label}</h1><p>{meta.detail}. Her geçiş kanıt, rol ve onay zinciriyle sunucuda fail-closed doğrulanır.</p></div>{right}</div>
}

export default App
