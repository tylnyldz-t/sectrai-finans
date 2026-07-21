// Hero'daki canlı AI önizlemesi — kendi kendine oynayan döngü.
// Görsel: benim landing tasarımım. Animasyon mantığı: design_handoff Landing.dc.html'in
// beat-makinesi (boş → kullanıcı → düşünme → cevap → öneri → önizleme → onay-bekliyor →
// onaylandı → başa dön). prefers-reduced-motion → son karede durur (döngü yok).

import { useEffect, useState } from 'react';

// Beat başına bekleme (ms) — Landing.dc.html BEATS ritmine uyarlandı.
const DWELL = [1400, 900, 900, 1000, 1200, 1200, 1900, 2600];
const LAST = DWELL.length - 1;

const WS_MODULES = ['Sevkiyatlar', 'Filo Takibi', 'Yük Borsası', 'Navlun Teklifleri', 'Sefer Tarifeleri', 'Gümrük Belgeleri'];

export function HeroPreview() {
  const [beat, setBeat] = useState(0);

  useEffect(() => {
    const rm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (rm) {
      setBeat(LAST);
      return;
    }
    let i = 0;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      setBeat(i);
      timer = setTimeout(() => {
        i = (i + 1) % DWELL.length;
        tick();
      }, DWELL[i]);
    };
    tick();
    return () => clearTimeout(timer);
  }, []);

  // Beat'ten görünürlük türet (ileri gidince öğeler birikir; beat 0'da hepsi kaybolup döngü başa döner)
  const showUser1 = beat >= 1;
  const showThink = beat === 2;
  const showAi1 = beat >= 3;
  const showRec = beat >= 4;
  const showWs = beat >= 5;
  const showApprWait = beat === 6;
  const showApproved = beat >= 7;
  const showUser2 = beat >= 7;
  const empty = beat === 0;

  return (
    <div className="hero-preview" aria-hidden="true">
      <div className="hero-preview-bar">
        <div className="dots"><i /><i /><i /></div>
        <div className="seg" style={{ transform: 'scale(0.8)' }}>
          <button type="button">KONUŞ</button>
          <button type="button" className="active">UYGULA</button>
        </div>
      </div>
      <div className="hero-preview-body">
        <div className="hero-chat">
          {showUser1 && <div className="hero-bubble user">15 kamyonluk filom var, Avrupa'ya taşıma yapıyoruz</div>}
          {showThink && (
            <div className="hero-bubble" style={{ alignSelf: 'flex-start' }}>
              <span className="thinking-dots hero-think"><i /><i /><i /></span>
            </div>
          )}
          {showAi1 && <div className="hero-bubble">Lojistik &amp; Taşımacılık için önerimi tuvale kurdum — 20 modül. Onaylarsan kuruyorum.</div>}
          {showUser2 && <div className="hero-bubble user">Onaylıyorum ✓</div>}
        </div>

        <div className="hero-canvas">
          {empty && (
            <div className="hero-canvas-empty">
              <span className="logo-orb" style={{ width: 34, height: 34, animation: 'pulse 2.4s ease-in-out infinite' }} />
              <span>Anlat, kurulmaya başlasın</span>
            </div>
          )}
          {showRec && (
            <div className="hero-panel">
              <div className="ttl">Öneri · Kanıtlı</div>
              SECTRAI AI-OS · Lojistik &amp; Taşımacılık
              <div className="evidence" style={{ marginTop: 6 }}>Kanıt: "kamyon", "filo" eşleşti · Ölçek: 15 kamyon</div>
            </div>
          )}
          {showWs && (
            <div className="hero-panel">
              <div className="ttl">Çalışma alanı önizleme</div>
              <div className="hero-mods">
                {WS_MODULES.map((m) => <span key={m} className="hero-mod">{m}</span>)}
              </div>
            </div>
          )}
          {showApprWait && (
            <div className="hero-panel">
              <div className="ttl">Onay kapısı</div>
              <div className="hero-risk"><span className="dot" /> orta risk · yeni çalışma alanı</div>
              <div className="hero-approve-row">
                <span className="hero-btn primary">Onayla ve kur</span>
                <span className="hero-btn ghost">Reddet</span>
              </div>
            </div>
          )}
          {showApproved && (
            <div className="hero-panel">
              <div className="ttl">Onay kapısı</div>
              <span className="hero-approve">✓ Onaylandı — kurulum tamamlandı</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
