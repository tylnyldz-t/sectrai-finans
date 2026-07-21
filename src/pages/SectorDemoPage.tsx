// Sektör-demo panosu — <sektör>.sectrai.com (yerelde /demo/<sektör> ya da <sektör>.localhost).
// ADMIN-ONLY (owner kararı): giriş yapmayan / yönetici olmayan bir admin-login KAPISI görür.
// Host-header'a göre o sektöre KİLİTLİ; modüller registry.ts'ten (sektral MODULE_REGISTRY).

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { LayoutGrid, ShieldCheck, Sparkles } from 'lucide-react';
import type { Workspace } from '@shared/types.ts';
import { api, doLogout, getToken, setToken } from '@/lib/api';
import { useRouter } from '@/lib/router';

function Orb({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="dgaur" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7C5CFF" />
          <stop offset="1" stopColor="#22D3EE" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="19" fill="none" stroke="url(#dgaur)" strokeWidth="5" />
      <circle cx="32" cy="32" r="7.5" fill="url(#dgaur)" />
    </svg>
  );
}

export function SectorDemoPage({ subdomain }: { subdomain: string }) {
  const { nav } = useRouter();
  const [phase, setPhase] = useState<'loading' | 'gate' | 'ready'>('loading');
  const [ws, setWs] = useState<Workspace | null>(null);
  const [gateError, setGateError] = useState('');

  const load = useCallback(async () => {
    if (!getToken()) {
      setPhase('gate');
      return;
    }
    try {
      const me = await api.me();
      if (me.user.platformRole !== 'ADMIN') {
        setGateError('Bu hesap yönetici değil — demo panoları yalnız yöneticiye açık.');
        setPhase('gate');
        return;
      }
      const r = await api.demoWorkspace(subdomain);
      setWs(r.workspace);
      setPhase('ready');
    } catch {
      // 401/403 → oturum yok/yetkisiz: kapı
      setPhase('gate');
    }
  }, [subdomain]);

  useEffect(() => {
    void load();
  }, [load]);

  if (phase === 'loading') return <div className="auth-wrap"><p style={{ color: 'var(--muted)' }}>Yükleniyor…</p></div>;

  if (phase === 'gate') return <AdminGate subdomain={subdomain} initialError={gateError} onAuthed={() => { setGateError(''); setPhase('loading'); void load(); }} />;

  if (!ws) return <div className="auth-wrap"><p style={{ color: 'var(--muted)' }}>Yükleniyor…</p></div>;

  return (
    <div className="dash">
      <header className="dash-header">
        <span className="logo"><span className="logo-orb" aria-hidden="true" /></span>
        <span className="dash-title">{ws.title}</span>
        <span className="slug-pill">{subdomain}.sectrai.com</span>
        <span className="badge" style={{ marginLeft: 8, color: 'var(--warn)', borderColor: 'var(--warn)' }}>SENTETİK DEMO · ADMIN</span>
        <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={() => { void doLogout().finally(() => setPhase('gate')); }}>Çıkış</button>
          <button className="btn btn-primary" onClick={() => nav('/kayit')}>
            <Sparkles size={15} aria-hidden="true" /> Kendi sistemini kur
          </button>
        </span>
      </header>

      <div className="dash-body">
        <div className="card" style={{ marginBottom: 16, borderColor: 'var(--warn)', background: 'var(--warn-bg)' }}>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text)' }}>
          <strong>Sentetik demo görünümü.</strong> Bu, {ws.title.replace(' — Demo', '')} sektörü için SECTRAI AI-OS'un
            kurulmuş halinin ön izlemesidir — kayıt sayıları veya üretim verisi üretilmez. Yalnız yöneticiye açıktır.
          </p>
        </div>

        <div className="stat-row">
          <div className="card stat-card"><div className="v">{ws.modules.length}</div><div className="l">Modül</div></div>
          <div className="card stat-card"><div className="v">Sektör</div><div className="l">Demo türü</div></div>
          <div className="card stat-card"><div className="v mono" style={{ fontSize: 15 }}>{ws.sectorId}</div><div className="l">Sektör kimliği</div></div>
          <div className="card stat-card"><div className="v" style={{ color: 'var(--accent)', fontSize: 15 }}>SENTETİK DEMO</div><div className="l">Veri modu</div></div>
        </div>

        <h2 style={{ fontSize: 18, margin: '4px 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <LayoutGrid size={17} aria-hidden="true" /> Bu sektörün modülleri
        </h2>
        <div className="module-grid">
          {ws.modules.map((m, i) => (
            <div key={m.id} className="card module-card" style={{ animationDelay: `${Math.min(i * 0.05, 0.5)}s` }}>
              <div className="m-head">
                <span className="m-ic" aria-hidden="true">{m.label.charAt(0).toLocaleUpperCase('tr-TR')}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.label}</div>
                  <div className="m-count">Sentetik demo · kayıt sayısı üretilmiyor</div>
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted-2)' }} className="mono">{m.id}</div>
            </div>
          ))}
        </div>

        <div className="safety-footer" style={{ marginTop: 20 }}>
          <span>SENTETİK-ONLY</span>
          <span>YALNIZ YÖNETİCİ</span>
          <span>SEKTÖRE KİLİTLİ (HOST)</span>
        </div>
      </div>
    </div>
  );
}

/** Demo subdomain'inde admin girişi kapısı — girmeyen/yetkisiz burada kalır (401/login). */
function AdminGate({ subdomain, initialError, onAuthed }: { subdomain: string; initialError: string; onAuthed: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const r = await api.login({ email, password });
      setToken(r.token);
      const me = await api.me();
      if (me.user.platformRole !== 'ADMIN') {
        await doLogout();
        setError('Bu hesap yönetici değil — demo panoları yalnız yöneticiye açık.');
        return;
      }
      onAuthed();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Giriş başarısız');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="hero-bg" aria-hidden="true" />
      <div className="card auth-card" style={{ borderRadius: 20, boxShadow: 'var(--shadow-lg)' }}>
        <div className="auth-stage">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <Orb />
            <span className="slug-pill"><ShieldCheck size={11} aria-hidden="true" style={{ verticalAlign: '-1.5px' }} /> {subdomain}.sectrai.com · DEMO</span>
            <h1 style={{ margin: '4px 0 0', fontSize: 21, textAlign: 'center' }}>Yönetici girişi gerekli</h1>
            <p className="sub" style={{ margin: 0, textAlign: 'center', maxWidth: 300 }}>
              Bu sektör demosu yalnızca yöneticiye açıktır. Devam etmek için giriş yap.
            </p>
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <form onSubmit={(e) => void submit(e)} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label className="field" style={{ margin: 0 }}>
              <span>E-posta</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" placeholder="admin@sectrai.com" />
            </label>
            <label className="field" style={{ margin: 0 }}>
              <span>Şifre</span>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" placeholder="••••••••" />
            </label>
            <button className="btn btn-primary" disabled={busy} style={{ height: 48, justifyContent: 'center', marginTop: 4 }}>
              {busy ? 'Bekle…' : 'Giriş yap'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
