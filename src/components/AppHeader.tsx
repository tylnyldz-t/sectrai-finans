import { type Role } from '../lib/api'
import { Switcher } from './Switcher'

export type ShellView = 'chat' | 'work' | 'masa'

export function AppHeader({ active, onViewChange, role, onRoleChange }: {
  active: ShellView
  onViewChange: (view: ShellView) => void
  role: Role
  onRoleChange: (role: Role) => void
}) {
  return <header className="app-header">
    <a className="logo" href="/" onClick={(event) => { event.preventDefault(); onViewChange('masa') }}><span className="logo-orb" aria-hidden="true" /><span>SECTRAI</span></a>
    <div className="seg app-header-seg" role="tablist" aria-label="Görünüm">
      <button role="tab" aria-selected={active === 'chat'} className={active === 'chat' ? 'active' : ''} onClick={() => onViewChange('chat')}>KONUŞ</button>
      <button role="tab" aria-selected={active === 'work'} className={active === 'work' ? 'active' : ''} onClick={() => onViewChange('work')}>UYGULA</button>
    </div>
    <div className="app-header-right">
      <button className="btn btn-ghost app-header-panom" onClick={() => onViewChange('masa')}><span aria-hidden="true">▦</span><span>Masa</span></button>
      <button className="btn btn-ghost" aria-label="Bildirimler" title="Bildirimler">●</button>
      <Switcher role={role} onRoleChange={onRoleChange} />
    </div>
  </header>
}
