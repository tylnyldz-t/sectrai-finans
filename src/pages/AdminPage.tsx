// Yönetim paneli — www.sectrai.com kökünde, yalnız ADMIN.
// Üç bölüm: (1) erişim başvuruları/yaşam döngüsü, (2) onay-sonrası erişim yönetimi (entitlement),
// (3) AI sağlayıcı anahtarları (anahtar geri görüntülenmez; yalnız ayarlı/ayarsız).

import { useEffect, useState } from 'react';
import { Check, History, KeyRound, ShieldCheck, Trash2, X } from 'lucide-react';
import type { Entitlements, GovernanceAction, GovernanceEvent, PublicUser } from '@shared/types.ts';
import type { ProviderStatus } from '@shared/providers.ts';
import { api } from '@/lib/api';
import { useRouter } from '@/lib/router';
import { Switcher } from '@/components/Switcher';

const STATUS_TR: Record<string, { label: string; cls: string }> = {
  PENDING_APPROVAL: { label: 'ONAY BEKLİYOR', cls: 'pending' },
  ACTIVE: { label: 'AKTİF', cls: 'active' },
  SUSPENDED: { label: 'ASKIDA', cls: 'pending' },
  REJECTED: { label: 'REDDEDİLDİ', cls: 'rejected' },
};

const GOV_ACTION_TR: Record<GovernanceAction, string> = {
  USER_APPROVED: 'Onayladı',
  USER_REJECTED: 'Reddetti',
  USER_SUSPENDED: 'Askıya aldı',
  USER_REACTIVATED: 'Yeniden açtı',
  ENTITLEMENTS_CHANGED: 'Erişim değiştirdi',
  PROVIDER_KEY_SET: 'Anahtar ayarladı',
  PROVIDER_KEY_DELETED: 'Anahtar sildi',
};

export function AdminPage() {
  const { nav } = useRouter();
  const [me, setMe] = useState<PublicUser | null>(null);
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [brainNote, setBrainNote] = useState('');
  const [brainMode, setBrainMode] = useState<'LLM' | 'SYNTHETIC'>('SYNTHETIC');
  const [brainProvider, setBrainProvider] = useState<string | null>(null);
  const [governance, setGovernance] = useState<GovernanceEvent[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    // Cross-subdomain SSO ile tutarlı: token'ı ön-kontrol etme — me() çerezle de doğrular, başarısızsa /giris.
    void (async () => {
      try {
        const m = await api.me();
        if (m.user.platformRole !== 'ADMIN') {
          nav('/app');
          return;
        }
        setMe(m.user);
        const [u, p, g] = await Promise.all([api.adminUsers(), api.adminProviders(), api.adminGovernance()]);
        setUsers(u.users);
        setProviders(p.providers);
        setBrainNote(p.note);
        setBrainMode(p.brainMode);
        setBrainProvider(p.brainProvider);
        setGovernance(g.events);
      } catch {
        nav('/giris');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const patchUser = (u: PublicUser) => setUsers((all) => all.map((x) => (x.id === u.id ? u : x)));
  // Her admin aksiyonu yönetişim günlüğüne iz bırakır → aksiyon sonrası günlüğü tazele (canlı).
  const refreshGovernance = async () => {
    try { setGovernance((await api.adminGovernance()).events); } catch { /* günlük tazeleme kritik değil */ }
  };

  const decide = async (userId: string, action: 'approve' | 'reject' | 'suspend' | 'reactivate') => {
    setBusy(userId);
    setError('');
    try {
      patchUser((await api.adminDecide(userId, action)).user);
      await refreshGovernance();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'İşlem başarısız');
    } finally {
      setBusy(null);
    }
  };

  const toggleEnt = async (u: PublicUser, key: keyof Entitlements) => {
    setBusy(u.id);
    setError('');
    try {
      patchUser((await api.adminEntitlements(u.id, { ...u.entitlements, [key]: !u.entitlements[key] })).user);
      await refreshGovernance();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'İşlem başarısız');
    } finally {
      setBusy(null);
    }
  };

  if (!me) return <div className="auth-wrap"><p style={{ color: 'var(--muted)' }}>Yükleniyor…</p></div>;

  const pending = users.filter((u) => u.accountStatus === 'PENDING_APPROVAL');
  const manageable = users.filter((u) => u.platformRole !== 'ADMIN');

  return (
    <div className="dash">
      <header className="dash-header">
        <a className="logo" href="/" onClick={(e) => { e.preventDefault(); nav('/'); }}>
          <span className="logo-orb" aria-hidden="true" /> SECTRAI
        </a>
        <span className="slug-pill"><ShieldCheck size={11} aria-hidden="true" style={{ verticalAlign: '-1.5px' }} /> YÖNETİM PANELİ</span>
        <Switcher user={me} />
      </header>
      <div className="dash-body">
        <div className="stat-row" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <div className="card stat-card"><div className="v">{pending.length}</div><div className="l">Onay bekleyen</div></div>
          <div className="card stat-card"><div className="v">{users.filter((u) => u.accountStatus === 'ACTIVE').length}</div><div className="l">Aktif hesap</div></div>
          <div className="card stat-card"><div className="v">{users.filter((u) => u.accountStatus === 'SUSPENDED').length}</div><div className="l">Askıda</div></div>
          <div className="card stat-card"><div className="v">{providers.filter((p) => p.configured).length}/{providers.length}</div><div className="l">AI anahtarı</div></div>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}

        {/* ── 1) Erişim yaşam döngüsü + 2) onay-sonrası erişim yönetimi ── */}
        <h2 style={{ fontSize: 17, margin: '4px 0 12px' }}>Erişim yönetimi</h2>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr><th>Kullanıcı</th><th>Durum</th><th>İş</th><th>Bireysel</th><th style={{ textAlign: 'right' }}>Karar</th></tr>
              </thead>
              <tbody>
                {manageable.map((u) => {
                  const st = STATUS_TR[u.accountStatus] ?? STATUS_TR.PENDING_APPROVAL;
                  const canGate = u.accountStatus === 'ACTIVE' || u.accountStatus === 'SUSPENDED';
                  return (
                    <tr key={u.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{u.name}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--muted-2)' }}>{u.email}</div>
                      </td>
                      <td><span className={`status-badge ${st.cls}`}>{st.label}</span></td>
                      <td>
                        <button
                          className={`gate-toggle${u.entitlements.business ? ' on' : ''}`}
                          disabled={!canGate || busy === u.id}
                          onClick={() => void toggleEnt(u, 'business')}
                          aria-pressed={u.entitlements.business}
                          title="İş çalışma alanı erişimi"
                        >{u.entitlements.business ? 'Açık' : 'Kapalı'}</button>
                      </td>
                      <td>
                        <button
                          className={`gate-toggle${u.entitlements.individual ? ' on' : ''}`}
                          disabled={!canGate || busy === u.id}
                          onClick={() => void toggleEnt(u, 'individual')}
                          aria-pressed={u.entitlements.individual}
                          title="Bireysel çalışma alanı erişimi"
                        >{u.entitlements.individual ? 'Açık' : 'Kapalı'}</button>
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {u.accountStatus === 'PENDING_APPROVAL' && (
                          <span style={{ display: 'inline-flex', gap: 8 }}>
                            <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 12.5 }} disabled={busy === u.id} onClick={() => void decide(u.id, 'approve')}>
                              <Check size={13} aria-hidden="true" /> Onayla
                            </button>
                            <button className="btn" style={{ padding: '6px 12px', fontSize: 12.5 }} disabled={busy === u.id} onClick={() => void decide(u.id, 'reject')}>
                              <X size={13} aria-hidden="true" /> Reddet
                            </button>
                          </span>
                        )}
                        {u.accountStatus === 'ACTIVE' && (
                          <button className="btn" style={{ padding: '6px 12px', fontSize: 12.5 }} disabled={busy === u.id} onClick={() => void decide(u.id, 'suspend')}>
                            Erişimi askıya al
                          </button>
                        )}
                        {u.accountStatus === 'SUSPENDED' && (
                          <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 12.5 }} disabled={busy === u.id} onClick={() => void decide(u.id, 'reactivate')}>
                            Erişimi aç
                          </button>
                        )}
                        {u.accountStatus === 'REJECTED' && (
                          <button className="btn" style={{ padding: '6px 12px', fontSize: 12.5 }} disabled={busy === u.id} onClick={() => void decide(u.id, 'approve')}>
                            Yine de onayla
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {manageable.length === 0 && (
                  <tr><td colSpan={5} style={{ color: 'var(--muted-2)', textAlign: 'center', padding: 18 }}>Henüz kullanıcı yok.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <p style={{ fontSize: 11.5, color: 'var(--muted-2)', margin: '10px 0 0' }}>
          Karar insanda — hesaplar yalnızca buradan aktifleşir. "İş/Bireysel" kapıları onay SONRASI daraltılıp genişletilebilir; kapalıysa o tarafta çalışma alanı kuramaz (fail-closed).
        </p>

        {/* ── 3) AI sağlayıcı anahtarları ── */}
        <h2 style={{ fontSize: 17, margin: '28px 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <KeyRound size={16} aria-hidden="true" /> AI sağlayıcı anahtarları
        </h2>
        <p style={{ fontSize: 12.5, color: 'var(--muted-2)', margin: '0 0 12px' }}>
          Anahtarlar şifreli saklanır, kaydedildikten sonra bir daha GÖSTERİLMEZ — yalnız ayarlı/ayarsız durumu görünür.
          {brainNote && <> {brainNote}</>}
        </p>
        <div className="module-grid">
          {providers.map((p) => (
            <ProviderCard
              key={p.id}
              p={p}
              onChange={(np) => { setProviders((all) => all.map((x) => (x.id === np.id ? np : x))); void refreshGovernance(); }}
            />
          ))}
        </div>

        <div className="safety-footer" style={{ marginTop: 22 }}>
          <span>ANAHTARLAR ŞİFRELİ</span>
          <span>DÜZ METİN LOGLANMAZ</span>
          <span>
            {brainMode === 'LLM'
              ? `BEYİN: LLM · ${providers.find((p) => p.id === brainProvider)?.label ?? brainProvider}`
              : 'BEYİN SENTETİK'}
          </span>
          <span>WORK DETERMİNİSTİK (AI KENDİ ONAYINI ÜRETEMEZ)</span>
        </div>

        {/* ── 4) Yönetişim günlüğü (hesap-verebilirlik) ── */}
        <h2 style={{ fontSize: 17, margin: '28px 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <History size={16} aria-hidden="true" /> Yönetişim günlüğü
        </h2>
        <p style={{ fontSize: 12.5, color: 'var(--muted-2)', margin: '0 0 12px' }}>
          Her yönetici kararı iz bırakır: kim, kime/neye, ne, ne zaman. Sağlayıcı anahtarları için yalnız
          "ayarlandı/silindi" kaydedilir — anahtarın kendisi ASLA günlüğe girmez.
        </p>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr><th>Zaman</th><th>Yönetici</th><th>Aksiyon</th><th>Hedef / ayrıntı</th></tr>
              </thead>
              <tbody>
                {governance.map((g) => (
                  <tr key={g.id}>
                    <td className="mono" style={{ whiteSpace: 'nowrap', fontSize: 11.5, color: 'var(--muted-2)' }}>
                      {new Date(g.at).toLocaleString('tr-TR')}
                    </td>
                    <td style={{ fontSize: 12.5 }}>{g.actorEmail}</td>
                    <td style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap' }}>{GOV_ACTION_TR[g.action] ?? g.action}</td>
                    <td style={{ fontSize: 12.5, color: 'var(--muted)' }}>{g.detail}</td>
                  </tr>
                ))}
                {governance.length === 0 && (
                  <tr><td colSpan={4} style={{ color: 'var(--muted-2)', textAlign: 'center', padding: 18 }}>Henüz yönetici kararı yok.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProviderCard({ p, onChange }: { p: ProviderStatus; onChange: (p: ProviderStatus) => void }) {
  const [editing, setEditing] = useState(false);
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [note, setNote] = useState('');

  const save = async () => {
    setBusy(true);
    setErr('');
    setNote('');
    try {
      const res = await api.adminSetProviderKey(p.id, key.trim());
      setKey('');
      setEditing(false);
      onChange({ ...p, configured: true, setAt: new Date().toISOString(), setBy: 'siz', verifiedAt: res.provider.verifiedAt });
      setNote(res.verify.ok ? `✓ ${res.verify.note}` : `⚠ ${res.verify.note} — beyin sentetik kalır`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Kaydedilemedi');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    setErr('');
    setNote('');
    try {
      await api.adminDeleteProviderKey(p.id);
      onChange({ ...p, configured: false, setAt: null, setBy: null, verifiedAt: null });
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Silinemedi');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card module-card">
      <div className="m-head" style={{ justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 700, fontSize: 14 }}>{p.label}</span>
        <span className={`status-badge ${p.configured ? (p.verifiedAt ? 'active' : 'pending') : 'rejected'}`}>
          {p.configured ? (p.verifiedAt ? 'DOĞRULANDI' : 'AYARLI · DOĞRULANMADI') : 'AYARSIZ'}
        </span>
      </div>
      {p.configured && p.setAt && (
        <div className="m-count" style={{ marginBottom: 8 }}>Ayarlayan: {p.setBy} · {p.setAt.slice(0, 10)}</div>
      )}
      {note && <p className="m-count" role="status" style={{ marginBottom: 8, color: note.startsWith('✓') ? 'var(--good)' : 'var(--warn)' }}>{note}</p>}
      {err && <p className="form-error" role="alert" style={{ padding: '6px 9px', fontSize: 12 }}>{err}</p>}
      {editing ? (
        <div className="domain-form" style={{ marginTop: 4 }}>
          <input type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder={p.hint} aria-label={`${p.label} API anahtarı`} autoComplete="off" />
          <button className="btn btn-primary" style={{ height: 40 }} disabled={busy || key.trim().length < 8} onClick={() => void save()}>Kaydet</button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button className="btn" style={{ padding: '7px 12px', fontSize: 12.5 }} disabled={busy} onClick={() => setEditing(true)}>
            {p.configured ? 'Anahtarı değiştir' : 'Anahtar ekle'}
          </button>
          {p.configured && (
            <button className="btn btn-ghost" style={{ padding: '7px 10px', fontSize: 12.5 }} disabled={busy} onClick={() => void remove()} aria-label="Anahtarı sil">
              <Trash2 size={14} aria-hidden="true" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
