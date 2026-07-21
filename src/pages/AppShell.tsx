import { useMemo, useState } from 'react'
import { ChatPane, type ChatMessage } from '../components/ChatPane'
import { CanvasPane } from '../components/CanvasPane'
import { Switcher } from '../components/Switcher'
import { type FinanceState, type Role } from '../lib/api'

type FrontView = 'chat' | 'work'
type Conversation = { id: string; title: string; pinned: boolean; archived: boolean; assigned: boolean }

const startMessages: ChatMessage[] = [{
  id: 'finance-welcome',
  role: 'ai',
  text: 'Finans çalışma alanın hazır. Kanıt zinciri, checker kuyruğu veya nakit akışı hakkında konuş; uygulama adımını UYGULA tuvalinde ve Masa’da yönet.',
}]

export function AppShell({ state, role, onRoleChange, onMasa }: {
  state: FinanceState | null
  role: Role
  onRoleChange: (role: Role) => void
  onMasa: () => void
}) {
  const [view, setView] = useState<FrontView>('chat')
  const [mobileArchiveOpen, setMobileArchiveOpen] = useState(false)
  const [archiveView, setArchiveView] = useState(false)
  const [renameId, setRenameId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [activeConversation, setActiveConversation] = useState('conv-finance')
  const [messages, setMessages] = useState<ChatMessage[]>(startMessages)
  const [conversations, setConversations] = useState<Conversation[]>([
    { id: 'conv-finance', title: 'Atlas Ltd. · Temmuz mutabakatı', pinned: true, archived: false, assigned: true },
    { id: 'conv-cashflow', title: '90 gün nakit akışı', pinned: false, archived: false, assigned: false },
  ])

  const pinned = useMemo(() => conversations.filter((item) => item.pinned && !item.archived), [conversations])
  const active = useMemo(() => conversations.filter((item) => !item.pinned && !item.archived), [conversations])
  const archived = useMemo(() => conversations.filter((item) => item.archived), [conversations])
  const patchConversation = (id: string, patch: Partial<Conversation>) => setConversations((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item))
  const selectConversation = (id: string) => { setActiveConversation(id); setMobileArchiveOpen(false) }
  const send = (text: string) => setMessages((current) => [...current, { id: 'user-' + Date.now(), role: 'user', text }, { id: 'ai-' + Date.now(), role: 'ai', text: 'Sentetik finans önizlemesi hazırlandı. Bu öneri dış sistemde işlem başlatmaz; kanıt ve insan onayı olmadan uygulamaya geçmez.' }])
  const createConversation = () => {
    const id = 'conv-' + Date.now()
    setConversations((current) => [{ id, title: 'Yeni finans sohbeti', pinned: false, archived: false, assigned: false }, ...current])
    setActiveConversation(id)
    setArchiveView(false)
    setMobileArchiveOpen(false)
  }
  const saveRename = (id: string) => {
    const title = renameValue.trim()
    if (title) patchConversation(id, { title })
    setRenameId(null)
  }
  const go = (next: FrontView | 'masa') => {
    setMobileArchiveOpen(false)
    if (next === 'masa') onMasa()
    else setView(next)
  }
  const renderConversation = (item: Conversation, section: 'pinned' | 'active' | 'archived') => <div key={item.id} className={'conv-entry' + (item.id === activeConversation ? ' active' : '')}>
    {renameId === item.id ? <form className="conv-rename" onSubmit={(event) => { event.preventDefault(); saveRename(item.id) }}>
      <input autoFocus aria-label="Sohbet adı" value={renameValue} maxLength={120} onChange={(event) => setRenameValue(event.target.value)} onBlur={() => saveRename(item.id)} />
    </form> : <button className="conv-item" onClick={() => selectConversation(item.id)}>
      <span aria-hidden="true">▧</span><span className="t">{item.title}</span>{item.assigned && <span className="conv-assigned" title="Atandı">●</span>}
    </button>}
    <div className="conv-actions" aria-label={item.title + ' işlemleri'}>
      {section === 'pinned' && <button className={'conv-action' + (item.assigned ? ' is-assigned' : '')} title={item.assigned ? 'Atamayı kaldır' : 'Ata'} aria-label={item.assigned ? 'Atamayı kaldır' : 'Ata'} onClick={() => patchConversation(item.id, { assigned: !item.assigned })}>♙</button>}
      <button className="conv-action" title={section === 'archived' ? 'Arşivden çıkar' : 'Arşivle'} aria-label={section === 'archived' ? 'Arşivden çıkar' : 'Arşivle'} onClick={() => patchConversation(item.id, { archived: section !== 'archived' })}>{section === 'archived' ? '↶' : '⌑'}</button>
      {section !== 'archived' && <button className="conv-action" title={item.pinned ? 'Sabitlemeyi kaldır' : 'Sabitle'} aria-label={item.pinned ? 'Sabitlemeyi kaldır' : 'Sabitle'} onClick={() => patchConversation(item.id, { pinned: !item.pinned })}>{item.pinned ? '⊘' : '⌖'}</button>}
      <button className="conv-action" title="Yeniden adlandır" aria-label="Yeniden adlandır" onClick={() => { setRenameId(item.id); setRenameValue(item.title) }}>✎</button>
    </div>
  </div>

  const rail = view === 'work'
  return <div className="shell">
    <header className="shell-header">
      <a className="logo" href="/" onClick={(event) => { event.preventDefault(); go('chat') }}><span className="logo-orb" aria-hidden="true" /><span className="logo-name">SECTRAI</span></a>
      <div className="seg" role="tablist" aria-label="Görünüm">
        <button role="tab" aria-selected={view === 'chat'} className={view === 'chat' ? 'active' : ''} onClick={() => go('chat')}>KONUŞ</button>
        <button role="tab" aria-selected={view === 'work'} className={view === 'work' ? 'active' : ''} onClick={() => go('work')}>UYGULA</button>
        <button role="tab" aria-selected={false} onClick={() => go('masa')}>MASA</button>
      </div>
      <div className="right">
        <button className="btn btn-ghost mobile-archive-trigger" aria-label="Sohbet arşivini aç" onClick={() => setMobileArchiveOpen(true)}>☰</button>
        <button className="btn btn-ghost" aria-label="Bildirimler" title="Bildirimler">●</button>
        <Switcher role={role} onRoleChange={onRoleChange} />
      </div>
    </header>
    <div className="shell-body">
      {mobileArchiveOpen && <button className="mobile-archive-backdrop" aria-label="Sohbet arşivini kapat" onClick={() => setMobileArchiveOpen(false)} />}
      <aside className={'sidebar' + (rail ? ' rail' : '') + (mobileArchiveOpen ? ' mobile-open' : '')} aria-label="Sohbet arşivi">
        <div className="sidebar-top">
          {rail ? <><button className="rail-btn" onClick={createConversation} aria-label="Yeni sohbet" title="Yeni sohbet">+</button><button className="rail-btn" onClick={() => { setView('chat'); setMobileArchiveOpen(true) }} aria-label="Arşivi aç" title="Arşivi aç">▤</button></> : <>
            <button className="btn" onClick={createConversation} style={{ justifyContent: 'center' }}>+ Yeni sohbet</button>
            {archiveView && <button className="sidebar-back" onClick={() => setArchiveView(false)}>← Sohbetlere dön</button>}
          </>}
        </div>
        {!rail && <><div className="sidebar-label sidebar-plugin-label">Eklentiler</div><div className="sidebar-plugins">
          <button className="sidebar-plugin" title="Entegrasyonlar yakında"><span aria-hidden="true">□</span> Entegrasyonlar</button>
          <button className="sidebar-plugin" type="button" title="Görsel Oluştur yakında"><span aria-hidden="true">▧</span> Görsel Oluştur</button>
          <button className="sidebar-plugin-add" type="button"><span aria-hidden="true">+</span> Eklenti ekle</button>
        </div></>}
        <div className="conv-list">{archiveView ? <><div className="sidebar-label"><span>Arşiv</span><span className="archive-count">{archived.length}</span></div>{archived.length ? archived.map((item) => renderConversation(item, 'archived')) : <p className="conv-empty">Arşivde sohbet yok.</p>}</> : <>
          <div className="sidebar-label"><span>Sabitlenenler</span><span className="badge badge-free">FREE</span></div>{pinned.length ? pinned.map((item) => renderConversation(item, 'pinned')) : <p className="conv-empty">Sabitlenen sohbet yok.</p>}
          <div className="sidebar-label sidebar-conv-label">Sohbetler</div>{active.map((item) => renderConversation(item, 'active'))}
          <button className="sidebar-archive-link" onClick={() => setArchiveView(true)}>⌑ Arşiv <span>{archived.length}</span></button>
        </>}</div>
        <div className="sidebar-user"><span className="avatar" aria-hidden="true">F</span><div><div style={{ fontWeight: 600 }}>SECTRAI Finans</div><div style={{ fontSize: 11.5, color: 'var(--muted-2)' }}>Sentetik çalışma alanı</div></div></div>
      </aside>
      <main className="workarea">
        <ChatPane messages={messages} onSend={send} squeezed={view === 'work'} />
        {view === 'work' && <CanvasPane state={state} onMasa={onMasa} />}
      </main>
    </div>
  </div>
}
