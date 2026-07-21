// Kayıt / Giriş — tasarım-handoff'u birebir: tek kart, form → preparing (~700ms) → success (AI karşılama).
// Kayıt artık bir ERİŞİM BAŞVURUSUDUR: hesap admin onayına düşer; karşılamada bu açıkça söylenir.

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { api, setToken } from '@/lib/api';
import { useRouter } from '@/lib/router';

const GREET =
  'Merhaba, ben SECTRAI. Ne kurmak istediğini anlat; önerimi kanıtıyla getiririm — kurulum kararı her zaman sende.';
const GREET_BACK = 'Tekrar hoş geldin. Kaldığın yerden devam edelim mi, yoksa yeni bir şey mi kuralım?';

function Orb({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="aur" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7C5CFF" />
          <stop offset="1" stopColor="#22D3EE" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="19" fill="none" stroke="url(#aur)" strokeWidth="5" />
      <circle cx="32" cy="32" r="7.5" fill="url(#aur)" />
    </svg>
  );
}

export function AuthPage({ mode }: { mode: 'register' | 'login' }) {
  const { nav } = useRouter();
  const [stage, setStage] = useState<'form' | 'preparing' | 'success'>('form');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const isRegister = mode === 'register';

  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    setStage('form');
    setError('');
  }, [mode]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (stage !== 'form') return;
    setError('');
    setStage('preparing');
    const started = Date.now();
    try {
      const res = isRegister
        ? await api.register({ name, email, password })
        : await api.login({ email, password });
      setToken(res.token);
      // Handoff: preparing aşaması ~700ms hissedilir, sonra karşılama
      const wait = Math.max(0, 700 - (Date.now() - started));
      timer.current = setTimeout(() => setStage('success'), wait);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir şeyler ters gitti');
      setStage('form');
    }
  };

  return (
    <div className="auth-wrap">
      <div className="hero-bg" aria-hidden="true" />
      <div className="card auth-card" style={{ borderRadius: 20, boxShadow: 'var(--shadow-lg)' }}>
        {stage === 'form' && (
          <div className="auth-stage">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <Orb />
              <h1 style={{ margin: 0, fontSize: 22, textAlign: 'center' }}>
                {isRegister ? 'Hesabını oluştur' : 'Tekrar hoş geldin'}
              </h1>
              <p className="sub" style={{ margin: 0, textAlign: 'center', maxWidth: 300 }}>
                {isRegister
                  ? 'Kaydolur olmaz yapay zekâ seni karşılar.'
                  : 'Kaldığın yerden devam et — sohbet arşivin seni bekliyor.'}
              </p>
            </div>
            {error && <p className="form-error" role="alert">{error}</p>}
            <form onSubmit={(e) => void submit(e)} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {isRegister && (
                <label className="field" style={{ margin: 0 }}>
                  <span>Ad Soyad</span>
                  <input value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" placeholder="Adın ve soyadın" />
                </label>
              )}
              <label className="field" style={{ margin: 0 }}>
                <span>E-posta</span>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" placeholder="sen@sirket.com" />
              </label>
              <label className="field" style={{ margin: 0 }}>
                <span>Şifre</span>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete={isRegister ? 'new-password' : 'current-password'} placeholder="••••••••" />
              </label>
              <button className="btn btn-primary" style={{ height: 48, justifyContent: 'center', marginTop: 4 }}>
                {isRegister ? 'Hesap oluştur' : 'Giriş yap'}
              </button>
            </form>
            <p className="sub" style={{ margin: 0, textAlign: 'center' }}>
              {isRegister ? 'Zaten hesabın var mı? ' : 'Hesabın yok mu? '}
              <a
                className="grad-text"
                href={isRegister ? '/giris' : '/kayit'}
                onClick={(e) => { e.preventDefault(); nav(isRegister ? '/giris' : '/kayit'); }}
                style={{ fontWeight: 700 }}
              >
                {isRegister ? 'Giriş yap' : 'Kaydol'}
              </a>
            </p>
            <p style={{ margin: 0, fontSize: 10.5, color: 'var(--muted-2)', textAlign: 'center' }}>
              Devam ederek Kullanım Şartları'nı kabul edersin.
            </p>
          </div>
        )}

        {stage === 'preparing' && (
          <div className="auth-stage" style={{ alignItems: 'center', padding: '28px 0' }}>
            <div className="auth-orb-wrap">
              <div className="glow" aria-hidden="true" />
              <span className="logo-orb" style={{ display: 'block' }} />
            </div>
            <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--muted)' }}>Hazırlanıyor…</span>
          </div>
        )}

        {stage === 'success' && (
          <div className="auth-stage">
            {isRegister ? (
              <span className="warn-pill">⏳ Başvurun alındı — yönetici onayı bekleniyor</span>
            ) : (
              <span className="ok-pill">✓ Giriş başarılı</span>
            )}
            <div className="greet-row">
              <span style={{ flex: 'none' }}><Orb size={26} /></span>
              <div className="greet-bubble">{isRegister ? GREET : GREET_BACK}</div>
            </div>
            <button className="btn btn-primary" style={{ height: 46, justifyContent: 'center' }} onClick={() => nav('/app')}>
              Uygulamaya devam et →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
