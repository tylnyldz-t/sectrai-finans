import { type FinanceState } from '../lib/api'

export function CanvasPane({ state, onMasa }: { state: FinanceState | null; onMasa: () => void }) {
  if (!state) return <section className="canvas-pane" aria-label="Finans uygulama tuvali"><div className="canvas-empty"><div><div className="orb" /><p>Finans çalışma alanı hazırlanıyor…</p></div></div></section>
  return <section className="canvas-pane" aria-label="Finans uygulama tuvali">
    <div className="canvas-grid">
      <article className="panel-card wide"><div className="panel-head">FİNANS KURULUMU <span className="spacer" /><span className="status-pill tone-good">HAZIR</span></div><h1 className="panel-title">{state.workspace.container.title}</h1><p className="panel-sub">{state.workspace.containerTerm} · {state.workspace.sectorLabel}</p><p className="evidence"><b>Uygulama alanı:</b> Modülleri, kanıt zincirini ve rol bazlı kayıtları Masa’da yönet.</p><button className="btn btn-primary" onClick={onMasa}>Masa'ya git →</button></article>
      <article className="panel-card"><div className="panel-head">MODÜLLER</div><div className="mod-grid">{state.cards.map((card) => <span key={card.type} className="mod-chip">{card.type}</span>)}</div></article>
      <article className="panel-card"><div className="panel-head">KAYIT DURUMU</div><ul className="fact-list"><li><span className="tick">✓</span>{state.tasks.length} iş akışı görevi</li><li><span className="tick">✓</span>{state.team.length} rol aktörü</li><li><span className="tick">✓</span>Upstash fail-closed API</li></ul></article>
      <div className="safety-footer"><span>SENTETİK-ONLY</span><span>AI ÖNERİR · İNSAN ONAYLAR</span></div>
    </div>
  </section>
}
