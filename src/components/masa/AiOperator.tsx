// F6 Masa — AI Operatör paneli (orta sütun). "Konuş, o yapsın — sen onayla":
// kullanıcı chat'te "Masa'da şunları görmek istiyorum: X, Y" der → operatör eşleşen modül
// kartlarını ÖNERİR → kullanıcı "Ekle" ile ONAYLAYINCA Masa canvas'ına döşenir. AI kendi
// başına eklemez (maker-checker). Eşleşmeyen istekler için Modül Studio'ya yönlendirir.

import { useState, type FormEvent } from 'react';
import { Database, Mic, Paperclip, PanelLeftClose, Send, Sparkles, LayoutGrid } from 'lucide-react';
import { t } from '@/lib/i18n';

interface Proposal { ids: string[]; labels: string[]; unmatched: string[] }
interface Msg { role: 'user' | 'ai'; text: string; proposal?: Proposal; done?: boolean }

export function AiOperator({
  workspaceTitle,
  moduleLabels,
  onCommand,
  onApplyCards,
  onCollapse,
}: {
  workspaceTitle: string;
  moduleLabels: string[];
  /** Kullanıcı komutunu modüllere eşler: yanıt + eşleşen kartlar + eşleşmeyen istekler. */
  onCommand: (text: string) => { reply: string; proposal: Proposal | null };
  /** Onaylanan kart id'lerini Masa canvas'ına döşer (aç + öne al). */
  onApplyCards: (ids: string[]) => void;
  onCollapse: () => void;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [realMode, setRealMode] = useState(false);
  const [voice, setVoice] = useState(false);
  const [autonomy, setAutonomy] = useState(false);

  const examples = [
    'Masa\'da ' + (moduleLabels.slice(0, 2).join(' ve ') || 'modülleri') + ' görmek istiyorum',
    moduleLabels[0] ? `${moduleLabels[0]} için yeni kayıt ekle` : 'Yeni kayıt ekle',
    'Bu ayın özetini çıkar',
  ];

  const send = (text: string) => {
    const t = text.trim();
    if (!t) return;
    const { reply, proposal } = onCommand(t);
    setMessages((m) => [...m, { role: 'user', text: t }, { role: 'ai', text: reply, proposal: proposal ?? undefined }]);
    setInput('');
  };
  const submit = (e: FormEvent) => { e.preventDefault(); send(input); };

  const accept = (index: number, p: Proposal) => {
    onApplyCards(p.ids);
    setMessages((m) => m.map((msg, i) => i === index ? { ...msg, done: true } : msg));
    setMessages((m) => [...m, { role: 'ai', text: `✓ ${p.labels.length} kart Masa'na eklendi ve öne alındı.` }]);
  };
  const dismiss = (index: number) => setMessages((m) => m.map((msg, i) => i === index ? { ...msg, done: true } : msg));

  return (
    <aside className="masa-op" aria-label={t("AI Operatör")}>
      <div className="masa-op-head">
        <span className="masa-op-ic" aria-hidden="true"><Sparkles size={15} /></span>
        <div className="masa-op-titles">
          <div className="masa-op-title">{t("SECTRAI AI Operatör")}</div>
          <div className="masa-op-sub">{t("Konuş, o yapsın — sen onayla")}</div>
        </div>
        <button className="masa-ic" title={t("Paneli kapat")} aria-label={t("AI panelini kapat")} onClick={onCollapse}>
          <PanelLeftClose size={15} aria-hidden="true" />
        </button>
      </div>

      <div className="masa-op-ctx"><span className="masa-op-chip">{workspaceTitle}</span></div>

      <div className="masa-op-body">
        <section className="masa-op-external-proposal" aria-labelledby="masa-op-external-title">
          <div className="masa-op-external-head">
            <span className="masa-op-external-icon" aria-hidden="true"><Database size={14} /></span>
            <strong id="masa-op-external-title">{t("Dış veri toplama")}</strong>
            <span className="masa-op-external-status">{t("ONAY BEKLİYOR")}</span>
          </div>
          <p>{t("Kamuya açık listelerden veri derleme önerisi")}</p>
          <small>{t("Çıktı, ilgili modülün kayıt listesine öneri olarak düşer; sen onaylamadan çalışma başlamaz.")}</small>
        </section>

        {messages.length === 0 ? (
          <div className="masa-op-intro">
            <p className="masa-op-intro-t">{t("Ne yapmak istersin? Masa'da görmek istediklerini yaz — kartlarla döşeyeyim:")}</p>
            <div className="masa-op-examples">
              {examples.map((ex) => (
                <button key={ex} type="button" className="masa-op-ex" onClick={() => send(ex)}>{t(ex)}</button>
              ))}
            </div>
            <p className="masa-op-note">{t("Önce öneririm, sen onaylayınca Masa'na eklenir — AI kendi başına eklemez.")}</p>
          </div>
        ) : (
          <div className="masa-op-thread">
            {messages.map((m, i) => (
              <div key={i} className={`masa-op-bubble ${m.role}`}>
                <div>{m.role === 'ai' ? t(m.text) : m.text}</div>
                {m.proposal && !m.done && (
                  <div className="masa-op-proposal">
                    <div className="masa-op-proposal-t"><LayoutGrid size={13} aria-hidden="true" /> {t("Masa'na eklenecek kartlar")}</div>
                    <div className="masa-op-proposal-chips">
                      {m.proposal.labels.map((l) => <span key={l} className="masa-op-chip sm">{t(l)}</span>)}
                    </div>
                    {m.proposal.unmatched.length > 0 && (
                      <p className="masa-op-proposal-note">{t("Eşleşmeyen:")} {m.proposal.unmatched.join(', ')} {t("— Modül Studio ile yeni modül oluşturabilirsin.")}</p>
                    )}
                    <div className="masa-op-proposal-actions">
                      <button type="button" className="masa-op-accept" disabled={m.proposal.ids.length === 0} onClick={() => accept(i, m.proposal!)}>{t("Kartları ekle")}</button>
                      <button type="button" className="masa-op-dismiss" onClick={() => dismiss(i)}>{t("Vazgeç")}</button>
                    </div>
                  </div>
                )}
                {m.done && <small className="masa-op-done">{t("✓ uygulandı")}</small>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="masa-op-foot">
        <div className="masa-op-modes">
          <button type="button" className={`masa-mode${realMode ? ' on' : ''}`} onClick={() => setRealMode((v) => !v)} title={t("Gerçek-mod: kapalıyken gölge (yazma yok)")}>
            {t(realMode ? 'Gerçek-mod' : 'Gölge mod')}
          </button>
          <button type="button" className={`masa-mode${voice ? ' on' : ''}`} onClick={() => setVoice((v) => !v)} title={t("Sesli giriş (önizleme)")}>
            {t(voice ? 'Ses açık' : 'Ses kapalı')}
          </button>
          <button type="button" className={`masa-mode${autonomy ? ' on' : ''}`} onClick={() => setAutonomy((v) => !v)} title={t("Otonom mod: kapalıyken her adım onay ister")}>
            {t(autonomy ? 'Otonom açık' : 'Otonom kapalı')}
          </button>
        </div>
        <form className="masa-op-input" onSubmit={submit}>
          <button type="button" className="masa-ic" title={t("Ek (önizleme)")} aria-label={t("Ek ekle")}><Paperclip size={15} aria-hidden="true" /></button>
          <button type="button" className="masa-ic" title={t("Sesle yaz (önizleme)")} aria-label={t('Sesle yaz')}><Mic size={15} aria-hidden="true" /></button>
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={t("Masa'da ne görmek istersin?…")} aria-label={t("AI operatöre komut")} />
          <button type="submit" className="masa-ic send" title={t("Gönder")} aria-label={t("Gönder")} disabled={!input.trim()}><Send size={15} aria-hidden="true" /></button>
        </form>
      </div>
    </aside>
  );
}
