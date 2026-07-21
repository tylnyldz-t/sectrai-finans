import { useState } from 'react'
import { type Role } from '../lib/api'
import { useTheme } from '../lib/theme'

const roleOptions: Array<{ value: Role; label: string }> = [
  { value: 'L1_ADMIN', label: 'L1 · Yönetici Ortak' },
  { value: 'L2_CHECKER', label: 'L2 · Proje Müdürü' },
  { value: 'L3_WORKER', label: 'L3 · Mali Müşavir' },
  { value: 'L4_FIELD', label: 'L4 · Dokümantasyon' },
]

export function Switcher({ role, onRoleChange }: { role: Role; onRoleChange: (role: Role) => void }) {
  const [open, setOpen] = useState(false)
  const { theme, toggle } = useTheme()

  return <div className="switcher">
    <button className="btn btn-ghost" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label="Hesap ve çalışma alanları">
      <span className="avatar" aria-hidden="true">F</span><span aria-hidden="true">⌄</span>
    </button>
    {open && <div className="switcher-menu" role="menu">
      <div style={{ padding: '8px 10px 4px' }}><div style={{ fontWeight: 700, fontSize: 13.5 }}>SECTRAI Finans</div><div style={{ fontSize: 11.5, color: 'var(--muted-2)' }}>Sentetik demo · Upstash kayıt defteri</div></div>
      <hr className="switcher-sep" />
      <div className="switcher-label">Demo rolü</div>
      {roleOptions.map((item) => <button key={item.value} className="switcher-item" role="menuitem" onClick={() => { onRoleChange(item.value); setOpen(false) }}>
        <span aria-hidden="true">◉</span><span style={{ flex: 1 }}>{item.label}{role === item.value ? ' ✓' : ''}</span>
      </button>)}
      <hr className="switcher-sep" />
      <button className="switcher-item" role="menuitem" onClick={toggle}><span aria-hidden="true">{theme === 'dark' ? '☀' : '◐'}</span>{theme === 'dark' ? 'Açık tema' : 'Koyu tema'}</button>
      <a className="switcher-item" role="menuitem" href="/__admin-logout"><span aria-hidden="true">↗</span> Oturumu kapat</a>
    </div>}
  </div>
}
