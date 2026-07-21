import { useState } from 'react'

type Module = { id: string; label: string; detail: string }

/** Kanonik mobil Masa kabuğunun finans veri/iş akışı portu. */
export function MobileMasaDashboard({ title, actor, modules, pendingCount, readyCount, taskCount, onTalk, onOpenModule }: {
  title: string
  actor: string
  modules: Module[]
  pendingCount: number
  readyCount: number
  taskCount: number
  onTalk: () => void
  onOpenModule: (id: string) => void
}) {
  const [sheet, setSheet] = useState(false)
  const [input, setInput] = useState('')
  const [message, setMessage] = useState('Günaydın. Kanıt bekleyen işleri ve checker kuyruğunu burada takip edebilirsin.')
  const send = () => {
    const value = input.trim()
    if (!value) return
    setMessage('Öneri hazır: ' + value + '. Bu öneri dış sistemde işlem başlatmaz; kanıt ve insan onayı gereklidir.')
    setInput('')
    setSheet(true)
  }

  return <div className="mobile-masa">
    <div className="mobile-masa-layout"><div className="mobile-masa-main">
      <header className="mobile-masa-header">
        <button className="mobile-masa-exit" onClick={onTalk} aria-label="Ön kapıya (KONUŞ/UYGULA) dön">← KONUŞ</button>
        <span className="mobile-masa-mark">S</span>
        <div style={{ flex: 1, minWidth: 0 }}><strong>Masa</strong><small>{title} · <b>{actor}</b></small></div>
        <button className="mobile-masa-theme" onClick={() => setSheet(true)}>AI</button>
      </header>
      <main className="mobile-masa-content"><div className="mobile-masa-page">
        <div className="mobile-masa-switcher"><button className="pinned">Masa</button>{modules.map((module) => <button key={module.id} onClick={() => onOpenModule(module.id)}>{module.label}</button>)}</div>
        <div className="mobile-masa-cards">
          <section className="mobile-desk-card pinned"><header><button className="mobile-desk-title"><span>GÖSTERGE</span><b>Finans operasyonu</b></button></header><div className="mobile-desk-meta"><span>Kaynak: Finans kayıt defteri</span><b>Canlı</b></div><div className="mobile-desk-body"><div className="mobile-kpis"><div><small>Açık görev</small><strong>{taskCount}</strong><span>kanıt zinciri</span></div><div><small>Checker kuyruğu</small><strong>{pendingCount}</strong><span>insan onayı</span></div><div><small>Kanıt bekliyor</small><strong>{readyCount}</strong><span>worker görevi</span></div><div><small>Veri modu</small><strong>0</strong><span>otomatik işlem</span></div></div></div></section>
          <section className="mobile-desk-card"><header><button className="mobile-desk-title"><span>BUGÜN</span><b>Önerilen adımlar</b></button></header><div className="mobile-desk-body"><div className="mobile-today"><div><small>01</small><span>Kanıtı yükle ve checker incelemesine gönder.</span></div><div><small>02</small><span>Onaydan sonra kilitli sonraki adımı aç.</span></div></div></div></section>
          {modules.map((module) => <section className="mobile-desk-card" key={module.id}><header><button className="mobile-desk-title" onClick={() => onOpenModule(module.id)}><span>MODÜL</span><b>{module.label}</b></button></header><div className="mobile-desk-meta"><span>{module.detail}</span><b>Canlı</b></div><div className="mobile-desk-body"><div className="mobile-workspace-card"><b>{module.label}</b><span>{module.detail}</span><button onClick={() => onOpenModule(module.id)}>Kayıtları aç →</button></div></div></section>)}
        </div>
      </div></main>
      <div className="mobile-masa-composer"><input value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && send()} placeholder="AI'ya yazın…" /><button className="mobile-masa-send" onClick={send}>Gönder</button></div>
      <nav className="mobile-masa-nav"><button className="active"><span>Masa</span></button><button onClick={() => onOpenModule('workflow')}><span>İşler</span></button><button className="mobile-masa-ai-button" onClick={() => setSheet(true)}>AI</button><button onClick={() => onOpenModule('ledger')}><span>Kayıtlar</span></button><button onClick={onTalk}><span>KONUŞ</span></button></nav>
    </div></div>
    {sheet && <><button className="mobile-masa-sheet-backdrop" aria-label="AI Operatör'ü kapat" onClick={() => setSheet(false)} /><section className="mobile-masa-sheet"><button className="mobile-masa-sheet-handle" onClick={() => setSheet(false)}><span /></button><div className="mobile-masa-sheet-head"><span className="online-dot" /><div><b>AI Operatör</b><small>Bağlam: {title}</small></div><button onClick={() => setSheet(false)}>⌄</button></div><div className="mobile-ai-thread"><div className="mobile-ai-bubble">{message}</div></div><div className="mobile-masa-sheet-input"><div><input value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && send()} placeholder="AI'ya yazın…" /><button onClick={send}>↑</button></div></div></section></>}
  </div>
}
