import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { createScenario, getFinance, riskBriefing, reviewTask, saveCards, submitTask, uploadEvidence, type CardType, type FinanceState, type ProofType, type RiskBriefing, type Role, type Task } from './lib/api'
import './App.css'

type View = 'desk' | 'workflow' | 'ledger' | 'roles' | 'audit' | 'design'
const PuckCardEditor = lazy(() => import('./PuckCardEditor'))

const roleOptions: Array<{ value: Role; label: string; detail: string }> = [
  { value: 'L1_ADMIN', label: 'L1 · Yönetici Ortak', detail: 'Masa ve tüm kayıtlar' },
  { value: 'L2_CHECKER', label: 'L2 · Proje Müdürü', detail: 'Kanıt onay/red' },
  { value: 'L3_WORKER', label: 'L3 · Mali Müşavir', detail: 'Atanan görev ve kanıt' },
  { value: 'L4_FIELD', label: 'L4 · Dokümantasyon', detail: 'Basit görev ve kanıt' },
]
const cardMeta: Record<CardType, { title: string; detail: string; view: Exclude<View, 'desk' | 'design'> }> = {
  workflow: { title: 'İş akışı', detail: 'Kanıt, onay kilidi ve revizyon', view: 'workflow' },
  ledger: { title: 'Kayıt defterleri', detail: 'Sentetik finans incelemeleri', view: 'ledger' },
  roles: { title: 'Ekip & roller', detail: 'Profesyonel hizmet hiyerarşisi', view: 'roles' },
  audit: { title: 'Denetim izi', detail: 'Append-only olay günlüğü', view: 'audit' },
}

const money = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 })
const statusLabel: Record<Task['status'], string> = { LOCKED: 'Kilitli', READY: 'Kanıt bekliyor', PENDING_REVIEW: 'Checker incelemesinde', REJECTED: 'Revizyon istendi', APPROVED: 'Onaylandı' }

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
  return Array.from(new Uint8Array(digest)).map((value) => value.toString(16).padStart(2, '0')).join('')
}
function proofSatisfied(task: Task) { return task.proofTypes.every((type) => task.evidence.some((proof) => proof.type === type)) }

function App() {
  const [role, setRole] = useState<Role>('L1_ADMIN')
  const [view, setView] = useState<View>('desk')
  const [state, setState] = useState<FinanceState | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File | undefined>>({})
  const [proofSelection, setProofSelection] = useState<Record<string, ProofType>>({})
  const [reasons, setReasons] = useState<Record<string, string>>({})
  const [riskBriefs, setRiskBriefs] = useState<Record<string, RiskBriefing | undefined>>({})
  const [templateId, setTemplateId] = useState('baseline')

  async function load(nextRole = role) {
    setLoading(true)
    setError('')
    try { setState(await getFinance(nextRole)) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Finans API yüklenemedi') }
    finally { setLoading(false) }
  }
  useEffect(() => { void load(role) }, [role])

  const roleInfo = roleOptions.find((item) => item.value === role)!
  const pendingCount = useMemo(() => state?.tasks.filter((task) => task.status === 'PENDING_REVIEW').length ?? 0, [state])
  const readyCount = useMemo(() => state?.tasks.filter((task) => task.status === 'READY' || task.status === 'REJECTED').length ?? 0, [state])

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
  async function savePuck(cards: Array<{ type: CardType }>) {
    await perform(async () => { await saveCards(role, cards) }, 'Puck kart düzeni yalnız izinli presetlerle kaydedildi.')
  }

  const nav: Array<{ id: View; label: string; group: string }> = [
    { id: 'desk', label: 'Masa', group: 'Çalışma alanı' },
    { id: 'workflow', label: 'Görevler & Onaylar', group: 'İş akışı' },
    { id: 'ledger', label: 'Kayıt Defterleri', group: 'Kayıtlar' },
    { id: 'roles', label: 'Ekip & RBAC', group: 'Yönetim' },
    { id: 'audit', label: 'Denetim İzi', group: 'Yönetim' },
    ...(role === 'L1_ADMIN' ? [{ id: 'design' as View, label: 'Kart Düzeni (Puck)', group: 'Yönetim' }] : []),
  ]
  const navGroups = Array.from(new Set(nav.map((item) => item.group)))

  const updateTask = (task: Task) => setState((current) => current ? { ...current, tasks: current.tasks.map((item) => item.id === task.id ? task : item) } : current)

  function TaskCard({ task }: { task: Task }) {
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
        <button className="secondary" disabled={saving || !selectedFiles[task.id]} onClick={() => void sendProof(task)}>Kanıtı yükle</button>
        <button className="primary" disabled={saving || !proofSatisfied(task)} onClick={() => void perform(async () => { updateTask(await submitTask(role, task.id)) }, 'Görev checker incelemesine gönderildi.')}>İncelemeye gönder</button>
        {!proofSatisfied(task) && <small className="disabled-explain">İncelemeye gönder, zorunlu kanıt türü yüklenmeden etkinleşmez.</small>}
      </div>}
      {checkerView && task.status === 'PENDING_REVIEW' && <div className="checker-actions">
        <button className="primary" disabled={saving} onClick={() => void perform(async () => { updateTask(await reviewTask(role, task.id, 'APPROVE')) }, 'Kanıt onaylandı; bağımlı görevler yeniden değerlendirildi.')}>Kanıtı onayla</button>
        <label className="wide">Red gerekçesi<textarea value={reasons[task.id] ?? ''} onChange={(event) => setReasons((current) => ({ ...current, [task.id]: event.target.value }))} placeholder="Worker'a somut revizyon gerekçesi yazın" maxLength={1000} /></label>
        <button className="danger" disabled={saving || !(reasons[task.id] ?? '').trim()} onClick={() => void perform(async () => { updateTask(await reviewTask(role, task.id, 'REJECT', reasons[task.id])) }, 'Kanıt reddedildi; görev revizyon için worker’a döndü.')}>Revizyona gönder</button>
      </div>}
      {(role === 'L1_ADMIN' || checkerView) && <div className="risk-actions"><button className="secondary" disabled={saving} onClick={() => void perform(async () => { const briefing = await riskBriefing(role, task.id); setRiskBriefs((current) => ({ ...current, [task.id]: briefing })) }, 'Sentetik AI ön-denetim sonucu hazırlandı; karar insan incelemesinde.')}>AI ön-denetimini hazırla</button>{riskBrief && <div className="risk-brief"><strong>{riskBrief.label}</strong>{riskBrief.signals.map((signal) => <p key={signal}>{signal}</p>)}<small>Karar: insan incelemesi zorunlu.</small></div>}</div>}
    </article>
  }

  function renderDesk() {
    if (!state) return null
    return <>
      <section className="workspace-intro"><div><p className="eyebrow">{state.workspace.sectorLabel.toUpperCase()}</p><h1>{state.workspace.containerTerm}</h1><p>{state.workspace.container.title} · <strong>{state.workspace.container.client}</strong> için tekil çalışma alanı.</p></div><span className="container-pill">{state.workspace.container.status}</span></section>
      <section className="metrics"><div><span>İnceleme bekleyen</span><b>{pendingCount}</b><small>L2 checker kuyruğu</small></div><div><span>Kanıt bekleyen</span><b>{readyCount}</b><small>Worker/field görevleri</small></div><div><span>Otomatik işlem</span><b>0</b><small>Fail-closed</small></div></section>
      <section className="desk-grid" aria-label="Masa kartları">{state.cards.map((card) => {
        const meta = cardMeta[card.type]
        return <article key={card.type} className="desk-card"><span className="card-kicker">İZİNLİ MODÜL</span><h2>{meta.title}</h2><p>{meta.detail}</p><button className="secondary" onClick={() => setView(meta.view)}>Kartı aç →</button></article>
      })}</section>
    </>
  }
  function renderWorkflow() { return <section className="panel-page"><div className="panel-title"><div><p className="eyebrow">WORKER → CHECKER · SIRALI KİLİT</p><h1>Görevler & Onaylar</h1><p>Her görev bir worker ve bir checker taşır. Kanıtsız gönderim, gerekçesiz red ve bağımlı adımı atlama sunucuda reddedilir.</p></div></div><div className="task-grid">{state?.tasks.map((task) => <TaskCard key={task.id} task={task} />)}{state?.tasks.length === 0 && <p className="empty">Bu role atanmış görev yok. Sunucu rol görünürlüğünü fail-closed filtreledi.</p>}</div></section> }
  function renderLedger() { return <section className="panel-page"><div className="panel-title"><div><p className="eyebrow">SENTETİK · KAYIT DEFTERİ</p><h1>Kayıt Defterleri</h1><p>Finansal kayıtlar yalnız L1/L2 görünümünde yer alır; hiçbir karar dış sisteme uygulanmaz.</p></div>{role === 'L1_ADMIN' && <div className="scenario-control"><label>Şablon<select value={templateId} onChange={(event) => setTemplateId(event.target.value)} disabled={saving}><option value="baseline">Baz senaryo</option><option value="delayed">Gecikmiş tahsilat</option><option value="stress">Stres senaryosu</option></select></label><button className="primary" disabled={saving} onClick={() => void perform(async () => { await createScenario(role, templateId) }, 'Sentetik nakit akışı senaryosu kaydedildi.')}>Senaryo oluştur</button></div>}</div>{state?.cashflowScenarios.length ? <div className="scenario-grid">{state.cashflowScenarios.slice(0, 3).map((scenario) => <article key={scenario.id}><b>{scenario.title}</b><span>{scenario.horizon}</span><dl><div><dt>Açılış</dt><dd>{money.format(scenario.opening)}</dd></div><div><dt>Giriş</dt><dd>{money.format(scenario.inflow)}</dd></div><div><dt>Çıkış</dt><dd>{money.format(scenario.outflow)}</dd></div><div><dt>Kapanış</dt><dd>{money.format(scenario.closing)}</dd></div></dl></article>)}</div> : <p className="empty">Bu rolün finans kayıtlarına erişimi yok.</p>}</section> }
  function renderRoles() { return <section className="panel-page"><div className="panel-title"><div><p className="eyebrow">PROFESYONEL HİZMETLER HİYERARŞİSİ</p><h1>Ekip & RBAC</h1><p>Dört katman, Bölüm 2’deki ortak/yönetim, danışman ve idari destek hiyerarşisinden daraltılarak eşlendi.</p></div></div><div className="role-grid">{state?.team.map((member) => <article key={member.id}><span>{member.level}</span><h3>{member.role}</h3><p>{member.name}</p><small>{member.department}</small></article>)}</div><p className="rbac-note"><strong>Yetki özeti:</strong> L1 masa/kayıt/audit; L2 atanan kanıtı onaylar veya gerekçeli reddeder; L3 yalnız kendi görevine kanıt yükler; L4 yalnız basit doküman/saha görevi görür.</p></section> }
  function renderAudit() { return <section className="panel-page"><div className="panel-title"><div><p className="eyebrow">APPEND-ONLY · AUDIT TRAIL</p><h1>Denetim İzi</h1><p>Uygulama API’sinde günlüğü değiştiren veya silen bir uç yoktur. Olaylar kullanıcı kimliği, zaman, IP ve varsa GPS alanlarıyla eklenir.</p></div></div><div className="audit-list">{state?.auditTrail.slice().reverse().map((event) => <article key={event.id}><div><strong>{event.action}</strong><span>{new Date(event.at).toLocaleString('tr-TR')}</span></div><p>{event.detail}</p><small>{event.actorName} · {event.role} · IP {event.ip}{event.gps ? ` · GPS ${event.gps}` : ' · GPS sağlanmadı'}</small></article>)}</div></section> }
  function renderDesign() { if (!state) return null; return <section className="panel-page puck-page"><div className="panel-title"><div><p className="eyebrow">PUCK · SABİT PRESET KARTLAR</p><h1>Masa kart düzeni</h1><p>Yalnız dört izinli kart eklenebilir, sıralanabilir veya kaldırılabilir. Serbest kod, CSS, dış bileşen ve yinelenen kart sunucuda kabul edilmez.</p></div></div><Suspense fallback={<p className="state" role="status">Puck kart editörü yükleniyor…</p>}><PuckCardEditor cards={state.cards} onSave={(cards) => { void savePuck(cards) }} /></Suspense></section> }

  const content = view === 'desk' ? renderDesk() : view === 'workflow' ? renderWorkflow() : view === 'ledger' ? renderLedger() : view === 'roles' ? renderRoles() : view === 'audit' ? renderAudit() : renderDesign()

  return <main className="finance-shell">
    <aside className="rail"><div className="brand"><b>sectrai</b><span>FINANS · MASA</span><em>Sentetik demo</em></div><nav aria-label="Finans çalışma alanı menüsü">{navGroups.map((group) => <div className="nav-group" key={group}><span>{group}</span>{nav.filter((item) => item.group === group).map((item) => <button key={item.id} className={view === item.id ? 'tab active' : 'tab'} onClick={() => setView(item.id)}>{item.label}</button>)}</div>)}</nav><div className="rail-note"><strong>Dinamik konteyner</strong><span>Müvekkil / Danışmanlık Proje Dosyası</span><strong>İş akışı</strong><span>1 Worker + 1 Checker · kanıt zorunlu</span></div></aside>
    <section className="workspace"><header><div><p className="eyebrow">SECTRAI FINANS / PROFESYONEL HİZMETLER</p><h1>Kanıt görünür, geçiş kilitli.</h1></div><div className="header-actions"><label>Demo rolü<select aria-label="Demo rolü" value={role} onChange={(event) => { setRole(event.target.value as Role); setView('desk') }}>{roleOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><small>{roleInfo.detail}</small></label><span className="badge">SENTETİK DEMO</span><a href="/__admin-logout">Oturumu kapat</a></div></header>
      <div className="boundary"><strong>Finansal karar destek sistemi değildir.</strong> Tüm kayıtlar sentetiktir; AI/arayüz karar vermez ve dış işlem başlatmaz. Kanıt dosyası yerel Node çalışmasında dosya + SHA-256 olarak saklanır; serverless çalışmada kalıcılık geçicidir.</div>
      {loading && <p className="state" role="status">Rol kapsamındaki sentetik çalışma alanı yükleniyor…</p>}
      {error && <p className="state error" role="alert">{error}<button onClick={() => void load()}>Tekrar dene</button></p>}
      {!loading && state && content}
      {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Bildirimi kapat">×</button></div>}
    </section>
  </main>
}

export default App
