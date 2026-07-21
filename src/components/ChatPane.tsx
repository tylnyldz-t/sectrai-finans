import { useState, type FormEvent } from 'react'

export type ChatMessage = { id: string; role: 'user' | 'ai'; text: string }

export function ChatPane({ messages, onSend, squeezed = false }: { messages: ChatMessage[]; onSend: (text: string) => void; squeezed?: boolean }) {
  const [text, setText] = useState('')
  const send = (event: FormEvent) => {
    event.preventDefault()
    const value = text.trim()
    if (!value) return
    onSend(value)
    setText('')
  }
  const quick = ['Bekleyen kanıtları göster', 'Tahsilat özetini hazırla', 'Checker kuyruğunu aç']
  return <section className={'chat-pane' + (squeezed ? ' squeezed' : '')} aria-label="SECTRAI Finans konuşma alanı">
    <div className="chat-scroll"><div className="chat-inner">
      {messages.map((message) => <article key={message.id} className={'bubble ' + message.role}>
        <span className="who">{message.role === 'ai' ? <><i className="ai-dot" />SECTRAI FİNANS</> : 'SEN'}</span>
        <div className="body">{message.text}</div>
      </article>)}
    </div></div>
    <div className="composer-zone"><div className="composer-inner">
      <form className="composer" onSubmit={send}><input value={text} onChange={(event) => setText(event.target.value)} placeholder="Finans operasyonun için yaz…" aria-label="Finans komutu" /><button className="send" type="submit" disabled={!text.trim()} aria-label="Gönder">↑</button></form>
      <div className="quick-chips"><span className="lbl">Hızlı ekle</span>{quick.map((item) => <button className="chip" key={item} type="button" onClick={() => onSend(item)}>{item}</button>)}</div>
    </div></div>
  </section>
}
