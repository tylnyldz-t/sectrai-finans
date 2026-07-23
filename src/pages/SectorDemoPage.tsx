// Sektör-demo panosu — <sektör>.sectrai.com (yerelde /demo/<sektör> ya da <sektör>.localhost).
// Owner risk kabulü: yalnız sentetik registry verisiyle yatırımcıya salt-okunur açıktır.
// Host-header'a göre o sektöre KİLİTLİ; modüller registry.ts'ten (sektral MODULE_REGISTRY).

import { useEffect, useState } from 'react';
import { LayoutGrid, Sparkles } from 'lucide-react';
import type { Workspace } from '@shared/types.ts';
import { useRouter } from '@/lib/router';
import { t, useLang } from '@/lib/i18n';
import { LanguageToggle } from '@/components/LanguageToggle';

async function fetchDemoWorkspace(subdomain: string): Promise<Workspace> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(`/api/demo/${encodeURIComponent(subdomain)}`, {
      credentials: 'omit',
      headers: { accept: 'application/json' },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error('UNAVAILABLE');
    const body = await response.json() as { workspace?: Workspace };
    if (!body.workspace) throw new Error('UNAVAILABLE');
    return body.workspace;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw new Error('TIMEOUT');
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

export function SectorDemoPage({ subdomain }: { subdomain: string }) {
  useLang();
  const { nav } = useRouter();
  const [phase, setPhase] = useState<'loading' | 'error' | 'ready'>('loading');
  const [ws, setWs] = useState<Workspace | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setPhase('loading');
    setError('');
    void fetchDemoWorkspace(subdomain)
      .then((workspace) => {
        if (!active) return;
        setWs(workspace);
        setPhase('ready');
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        setError(loadError instanceof Error && loadError.message === 'TIMEOUT'
          ? 'İstek zaman aşımına uğradı.'
          : 'Sentetik sektör vitrini şu anda yüklenemiyor.');
        setPhase('error');
      });
    return () => { active = false; };
  }, [subdomain]);

  if (phase === 'loading') return (
    <div className="auth-wrap">
      <div style={{ position: 'absolute', insetInlineEnd: 20, top: 20 }}><LanguageToggle compact /></div>
      <p style={{ color: 'var(--muted)' }}>{t("Yükleniyor…")}</p>
    </div>
  );

  if (phase === 'error') return (
    <div className="auth-wrap" role="alert">
      <div style={{ position: 'absolute', insetInlineEnd: 20, top: 20 }}><LanguageToggle compact /></div>
      <div className="card auth-card" style={{ textAlign: 'center' }}>
        <p>{t(error)}</p>
        <a className="btn btn-primary" href="/">{t("Ana sayfaya dön")}</a>
      </div>
    </div>
  );

  if (!ws) return (
    <div className="auth-wrap">
      <div style={{ position: 'absolute', insetInlineEnd: 20, top: 20 }}><LanguageToggle compact /></div>
      <p style={{ color: 'var(--muted)' }}>{t("Yükleniyor…")}</p>
    </div>
  );

  return (
    <div className="dash">
      <header className="dash-header">
        <span className="logo"><span className="logo-orb" aria-hidden="true" /></span>
        <span className="dash-title">{t(ws.title)}</span>
        <span className="slug-pill">{subdomain}.sectrai.com</span>
        <span className="badge" style={{ marginLeft: 8, color: 'var(--warn)', borderColor: 'var(--warn)' }}>{t("SENTETİK DEMO · SALT OKUNUR")}</span>
        <div style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <LanguageToggle compact />
          <button className="btn btn-primary" onClick={() => nav('/kayit')}>
            <Sparkles size={15} aria-hidden="true" /> {t("Kendi sistemini kur")}
          </button>
        </div>
      </header>

      <div className="dash-body">
        <div className="card" style={{ marginBottom: 16, borderColor: 'var(--warn)', background: 'var(--warn-bg)' }}>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text)' }}>
          <strong>{t("Sentetik demo görünümü.")}</strong> {t("Bu, {sector} sektörü için SECTRAI AI-OS'un kurulmuş halinin salt-okunur ön izlemesidir — kayıt sayıları veya üretim verisi üretilmez.", { sector: t(ws.title.replace(' — Demo', '')) })}
          </p>
        </div>

        <div className="stat-row">
          <div className="card stat-card"><div className="v">{ws.modules.length}</div><div className="l">{t("Modül")}</div></div>
          <div className="card stat-card"><div className="v">{t("Sektör")}</div><div className="l">{t("Demo türü")}</div></div>
          <div className="card stat-card"><div className="v mono" style={{ fontSize: 15 }}>{ws.sectorId}</div><div className="l">{t("Sektör kimliği")}</div></div>
          <div className="card stat-card"><div className="v" style={{ color: 'var(--accent)', fontSize: 15 }}>{t("SENTETİK DEMO")}</div><div className="l">{t("Veri modu")}</div></div>
        </div>

        <h2 style={{ fontSize: 18, margin: '4px 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <LayoutGrid size={17} aria-hidden="true" /> {t("Bu sektörün modülleri")}
        </h2>
        <div className="module-grid">
          {ws.modules.map((m, i) => (
            <div key={m.id} className="card module-card" style={{ animationDelay: `${Math.min(i * 0.05, 0.5)}s` }}>
              <div className="m-head">
                <span className="m-ic" aria-hidden="true">{m.label.charAt(0).toLocaleUpperCase('tr-TR')}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t(m.label)}</div>
                  <div className="m-count">{t("Sentetik demo · kayıt sayısı üretilmiyor")}</div>
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted-2)' }} className="mono">{m.id}</div>
            </div>
          ))}
        </div>

        <div className="safety-footer" style={{ marginTop: 20 }}>
          <span>{t("SENTETİK-ONLY")}</span>
          <span>{t("YATIRIMCI GÖRÜNÜMÜ")}</span>
          <span>{t("SEKTÖRE KİLİTLİ (HOST)")}</span>
        </div>
      </div>
    </div>
  );
}
