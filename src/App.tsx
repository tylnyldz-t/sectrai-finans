import { useEffect, useMemo, useState } from 'react'
import { briefing, createScenario, decide, getFinance, type Briefing, type Decision, type FinanceState, type ModuleName } from './lib/api'
import './App.css'

const modules: Array<{ id: ModuleName; name: string; caption: string; decisions: Array<{ value: Decision; label: string }> }> = [
  { id: 'collections', name: 'Tahsilat riski', caption: 'Gecikmiş alacaklar için kanıta bağlı owner incelemesi.', decisions: [{ value: 'FOLLOW_UP', label: 'Takip incelemesine al' }, { value: 'HOLD', label: 'İzlemede tut' }] },
  { id: 'claims', name: 'Hasar inceleme', caption: 'Eksik belge görünümünü işlem yapmadan gözden geçir.', decisions: [{ value: 'REQUEST_EVIDENCE', label: 'Ek kanıt iste' }, { value: 'CLOSE_REVIEW', label: 'İncelemeyi kapat' }] },
  { id: 'aml', name: 'AML uyarıları', caption: 'Uyarıyı görünür kanıt zinciriyle owner review’a taşı.', decisions: [{ value: 'ESCALATE_REVIEW', label: 'Uyum incelemesine aktar' }, { value: 'CLOSE_ALERT', label: 'Uyarıyı kapat' }] },
]
const empty: FinanceState = { synthetic: true, cashflowScenarios: [], collections: [], claims: [], aml: [] }
const money = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 })

function App() {
  const [state, setState] = useState<FinanceState>(empty)
  const [module, setModule] = useState<ModuleName>('collections')
  const [templateId, setTemplateId] = useState('baseline')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [brief, setBrief] = useState<Briefing | null>(null)
  const config = modules.find((item) => item.id === module)!
  const selected = state[module][0]
  const pending = useMemo(() => modules.reduce((total, item) => total + state[item.id].filter((entry) => entry.status === 'PENDING_REVIEW').length, 0), [state])

  async function load() { setLoading(true); setError(''); try { setState(await getFinance()) } catch { setError('Yerel Finans API’sine ulaşılamadı. Bu görünüm kalıcı işlem yapmaz; API’yi başlatıp tekrar deneyin.') } finally { setLoading(false) } }
  useEffect(() => { void load() }, [])
  async function addScenario() { setSaving(true); try { const scenario = await createScenario(templateId); setState((current) => ({ ...current, cashflowScenarios: [scenario, ...current.cashflowScenarios] })); setNotice('Sentetik nakit akışı senaryosu JSON depoya kaydedildi.') } catch { setNotice('Senaryo kaydedilemedi; yerel API bağlantısını kontrol edin.') } finally { setSaving(false) } }
  async function requestBriefing() { if (!selected) return; setSaving(true); try { setBrief(await briefing(module, selected.id)) } catch { setNotice('Sentetik açıklama hazırlanamadı; karar veya kayıt değişmedi.') } finally { setSaving(false) } }
  async function recordDecision(value: Decision) { if (!selected) return; setSaving(true); try { const updated = await decide(module, selected.id, value); setState((current) => ({ ...current, [module]: current[module].map((item) => item.id === updated.id ? updated : item) })); setNotice('Owner kararı JSON depoya kaydedildi. Sistem hiçbir dış işlem başlatmadı.') } catch { setNotice('Owner kararı kaydedilemedi; kayıt değişmedi.') } finally { setSaving(false) } }

  return <main className="app-shell">
    <aside className="rail"><div className="brand"><b>sectrai</b><span>FINANS</span><em>Sentetik demo</em></div><nav aria-label="Finans modülleri"><button className="tab active" onClick={() => document.getElementById('cashflow')?.focus()}>Nakit akışı</button>{modules.map((item) => <button key={item.id} className={module === item.id ? 'tab active' : 'tab'} onClick={() => { setModule(item.id); setBrief(null) }}>{item.name}</button>)}</nav><div className="rail-note"><strong>Owner-only yüzey</strong><span>AI önerir; karar vermez ve işlem başlatmaz.</span></div></aside>
    <section className="workspace"><header><div><p>SECTRAI FINANS / OWNER WORKSPACE</p><h1>Kanıt görünür, karar sende.</h1></div><div className="header-actions"><span className="badge">SENTETİK DEMO</span><a href="/__admin-logout">Oturumu kapat</a></div></header>
      <div className="boundary"><strong>Finansal karar destek sistemi değildir.</strong> Tüm tutarlar, müşteri adları, kanıtlar ve AI açıklamaları sentetiktir. Hiçbir karar otomatik uygulanmaz. Canlı Vercel kayıtları geçicidir; dayanıklı JSON kalıcılığı yerel Node çalıştırmadadır.</div>
      {loading && <p className="state" role="status">Yerel sentetik finans kayıtları yükleniyor…</p>}{error && <p className="state error" role="alert">{error}<button onClick={() => void load()}>Tekrar dene</button></p>}
      <section className="metrics"><div><span>BEKLEYEN OWNER İNCELEMESİ</span><b>{pending}</b><small>Kanıtsız öneri yok</small></div><div><span>AKTİF NAKİT SENARYOSU</span><b>{state.cashflowScenarios.length}</b><small>Yerel JSON kaydı</small></div><div><span>OTOMATİK İŞLEM</span><b>0</b><small>Fail-closed</small></div></section>
      <section className="card" id="cashflow" tabIndex={-1}><div className="card-head"><div><p>NAKİT AKIŞI TAHMİNİ · SENTETİK</p><h2>Senaryoyu açıkça oluştur.</h2></div><span className="badge">KALICI / YEREL</span></div><p className="muted">Şablonu seçip “Senaryoyu kaydet”e basmadan hiçbir kayıt yazılmaz. Bu ekran yatırım tavsiyesi veya bütçe onayı üretmez.</p><div className="scenario-actions"><label>Şablon<select value={templateId} onChange={(event) => setTemplateId(event.target.value)} disabled={saving || loading}><option value="baseline">Baz senaryo</option><option value="delayed">Gecikmiş tahsilat</option><option value="stress">Stres senaryosu</option></select></label><button className="primary" onClick={() => void addScenario()} disabled={saving || loading}>{saving ? 'Kaydediliyor…' : 'Senaryoyu kaydet'}</button></div><div className="scenario-grid">{state.cashflowScenarios.slice(0, 3).map((scenario) => <article key={scenario.id}><b>{scenario.title}</b><span>{scenario.horizon}</span><dl><div><dt>Açılış</dt><dd>{money.format(scenario.opening)}</dd></div><div><dt>Giriş</dt><dd>{money.format(scenario.inflow)}</dd></div><div><dt>Çıkış</dt><dd>{money.format(scenario.outflow)}</dd></div><div><dt>Kapanış</dt><dd>{money.format(scenario.closing)}</dd></div></dl></article>)}</div></section>
      <section className="card review"><div className="card-head"><div><p>{config.name.toUpperCase()} · SENTETİK OWNER REVIEW</p><h2>{selected?.title ?? 'İncelenecek kayıt yok'}</h2></div><span className={selected?.status === 'PENDING_REVIEW' ? 'status pending' : 'status'}>{selected?.status === 'PENDING_REVIEW' ? 'İnceleme bekliyor' : 'Owner kararı kaydedildi'}</span></div><p className="muted">{config.caption} Tutar: <strong>{selected ? money.format(selected.amount) : '—'}</strong> · güven: <strong>{selected ? `%${Math.round(selected.confidence * 100)}` : '—'}</strong>.</p>{selected && <><div className="evidence"><h3>Kanıt zinciri <span>Sentetik demo</span></h3>{selected.evidence.map((item, index) => <p key={item}><b>{index + 1}</b>{item}</p>)}</div><div className="review-actions"><button className="secondary" onClick={() => void requestBriefing()} disabled={saving || loading}>AI açıklamasını hazırla</button>{selected.status === 'PENDING_REVIEW' ? config.decisions.map((item) => <button key={item.value} className={item.value.includes('CLOSE') || item.value === 'HOLD' ? 'secondary' : 'primary'} onClick={() => void recordDecision(item.value)} disabled={saving || loading}>{item.label}</button>) : <span className="receipt">{selected.ownerDecision?.by} tarafından yerelde kaydedildi</span>}</div></>}{brief && <div className="brief" role="status"><span>{brief.label}</span><p>{brief.text}</p></div>}</section>
      {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Bildirimi kapat">×</button></div>}
    </section>
  </main>
}
export default App
