import { useState, type FormEvent } from 'react'

export function AiOperator({ context, onCollapse }: { context: string; onCollapse: () => void }) {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'ai'; text: string }>>([])
  const send = (event: FormEvent) => {
    event.preventDefault()
    const text = input.trim()
    if (!text) return
    setMessages((current) => [...current, { role: 'user', text }, { role: 'ai', text: 'Öneri hazır. Finans kaydı ancak kanıt ve insan onayı ile değişir.' }])
    setInput('')
  }
  return <aside className="masa-op" aria-label="AI Operatör">
    <div className="masa-op-head"><span className="masa-op-ic" aria-hidden="true">✦</span><div className="masa-op-titles"><div className="masa-op-title">SECTRAI AI Operatör</div><div className="masa-op-sub">Konuş, o yapsın — sen onayla</div></div><button className="masa-ic" title="Paneli kapat" aria-label="AI panelini kapat" onClick={onCollapse}>‹</button></div>
    <div className="masa-op-ctx"><span className="masa-op-chip">{context}</span></div>
    <div className="masa-op-body">{messages.length ? <div className="masa-op-thread">{messages.map((message, index) => <div className={'masa-op-bubble ' + message.role} key={index}>{message.text}</div>)}</div> : <div className="masa-op-intro"><p className="masa-op-intro-t">Ne yapmak istersin? Komutun öneri olarak hazırlanır.</p><p className="masa-op-note">AI önerir; finans kaydı insan onayı ve kanıt zinciri olmadan değişmez.</p></div>}</div>
    <div className="masa-op-foot"><form className="masa-op-input" onSubmit={send}><input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Komutunu yaz…" aria-label="AI operatöre komut" /><button type="submit" className="masa-ic send" title="Gönder" aria-label="Gönder" disabled={!input.trim()}>↑</button></form></div>
  </aside>
}
