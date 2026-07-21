// Sağ-üst hesap/çalışma-alanı değiştirici — 1 hesap N workspace: iş/bireysel alanlar arasında geçiş.
// Prod'da xyz.sectrai.com'a, yerelde /w/xyz yoluna gider.

import { useEffect, useRef, useState } from 'react';
import { Briefcase, ChevronDown, LogOut, Moon, Shield, Sparkles, Sun, User } from 'lucide-react';
import type { PublicUser, Workspace } from '@shared/types.ts';
import { ROOT_DOMAIN, workspaceUrl } from '@shared/domain.ts';
import { api, doLogout } from '@/lib/api';
import { useRouter } from '@/lib/router';
import { useTheme } from '@/lib/theme';

export function wsHref(slug: string): string {
  return window.location.hostname.endsWith(ROOT_DOMAIN) ? workspaceUrl(slug) : `/w/${slug}`;
}

export function Switcher({
  user, activeSlug, label,
}: {
  user: PublicUser;
  activeSlug?: string;
  /** Masa üst çubuğunda avatarın yanında gösterilecek kısa profil etiketi. */
  label?: string;
}) {
  const { nav } = useRouter();
  const { theme, toggle } = useTheme();
  const [open, setOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    void api.workspaces().then((r) => setWorkspaces(r.workspaces)).catch(() => {});
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const go = (slug: string | null) => {
    setOpen(false);
    if (!slug) return;
    const href = wsHref(slug);
    if (href.startsWith('/')) nav(href);
    else window.location.href = href;
  };

  const switchAccount = () => {
    setOpen(false);
    void doLogout().finally(() => { window.location.href = '/giris'; });
  };

  return (
    <div className="switcher" ref={ref}>
      <button className="btn btn-ghost" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Hesap ve çalışma alanları">
        <span className="avatar" aria-hidden="true">{user.name.charAt(0).toLocaleUpperCase('tr-TR')}</span>
        {label && <span className="switcher-trigger-label">{label}</span>}
        <ChevronDown size={14} aria-hidden="true" />
      </button>
      {open && (
        <div className="switcher-menu" role="menu">
          <div style={{ padding: '8px 10px 4px' }}>
            <div style={{ fontWeight: 700, fontSize: 13.5 }}>{user.name}</div>
            <div style={{ fontSize: 11.5, color: 'var(--muted-2)' }}>{user.email} · Ücretsiz plan</div>
          </div>
          <hr className="switcher-sep" />
          <div className="switcher-label">Çalışma alanların</div>
          {workspaces.length === 0 && (
            <div style={{ padding: '4px 10px 8px', fontSize: 12, color: 'var(--muted-2)' }}>
              Henüz kurulum yok — UYGULA’da ilk sistemini kur.
            </div>
          )}
          {workspaces.map((w) => (
            <button key={w.id} className="switcher-item" role="menuitem" onClick={() => go(w.slug)} disabled={!w.slug}>
              {w.purpose === 'business' ? <Briefcase size={14} aria-hidden="true" /> : <User size={14} aria-hidden="true" />}
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {w.title}
                {w.slug === activeSlug && ' ✓'}
              </span>
              <span className="sub">{w.slug ? `${w.slug}.${ROOT_DOMAIN}` : 'adres bekliyor'}</span>
            </button>
          ))}
          <hr className="switcher-sep" />
          <button className="switcher-item" role="menuitem" onClick={() => { setOpen(false); nav('/app'); }}>
            <Sparkles size={14} aria-hidden="true" /> Ön kapı (KONUŞ | UYGULA)
          </button>
          {user.platformRole === 'ADMIN' && (
            <button className="switcher-item" role="menuitem" onClick={() => { setOpen(false); nav('/admin'); }}>
              <Shield size={14} aria-hidden="true" /> Yönetim paneli
            </button>
          )}
          <button className="switcher-item" role="menuitem" onClick={toggle}>
            {theme === 'dark' ? <Sun size={14} aria-hidden="true" /> : <Moon size={14} aria-hidden="true" />}
            {theme === 'dark' ? 'Açık tema' : 'Koyu tema'}
          </button>
          <button className="switcher-item" role="menuitem" onClick={switchAccount}>
            <User size={14} aria-hidden="true" /> Başka hesapla gir
          </button>
          <button className="switcher-item" role="menuitem" onClick={() => { void doLogout().finally(() => { window.location.href = '/'; }); }}>
            <LogOut size={14} aria-hidden="true" /> Çıkış yap
          </button>
        </div>
      )}
    </div>
  );
}
