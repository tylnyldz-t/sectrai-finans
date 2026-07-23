// Sohbet bölmesi — CHAT'te tam genişlik, WORK'te 1/4'e kayar (StudioCanvas composer deseni).
// Hızlı-ekleme çipleri mesaj kutusunun HEMEN ALTINDA (Taylan akışı, adım 5).

import { useEffect, useRef, useState } from 'react';
import { Briefcase, Send, User } from 'lucide-react';
import type { Conversation, Purpose } from '@shared/types.ts';
import { rich } from '@/lib/rich';
import { t } from '@/lib/i18n';

interface Props {
  conversation: Conversation;
  view: 'chat' | 'work';
  busy: boolean;
  onSend: (text: string) => void;
  onPurpose: (purpose: Purpose) => void;
  /** Mobil UYGULA görünümünde sohbet, Masa'nın üstüne açılan bottom-sheet'tir. */
  mobileSheetOpen?: boolean;
  onMobileSheetToggle?: () => void;
}

export function ChatPane({ conversation, view, busy, onSend, onPurpose, mobileSheetOpen = false, onMobileSheetToggle }: Props) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [conversation.messages.length, view]);

  const send = () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    onSend(text);
  };

  const handleChip = (value: string) => {
    if (busy) return;
    if (value === '__purpose:business') onPurpose('business');
    else if (value === '__purpose:individual') onPurpose('individual');
    else onSend(value);
  };

  const lastAi = [...conversation.messages].reverse().find((m) => m.role === 'ai');
  const showPurposeChips = view === 'work' && conversation.purpose === null;
  const aiChips = view === 'work' && !showPurposeChips ? lastAi?.chips ?? [] : [];

  return (
    <div className={`chat-pane${view === 'work' ? ' squeezed' : ''}${mobileSheetOpen ? ' mobile-sheet-open' : ''}`}>
      {view === 'work' && (
        <button className="mobile-chat-sheet-handle" onClick={onMobileSheetToggle} aria-expanded={mobileSheetOpen} aria-label={t(mobileSheetOpen ? 'Sohbeti küçült' : 'Sohbeti aç')}>
          <span />
        </button>
      )}
      <div className="chat-scroll" ref={scrollRef}>
        <div className="chat-inner">
          {conversation.messages.map((m) => (
            <div key={m.id} className={`bubble ${m.role}`}>
              <span className="who">
                {m.role === 'ai' ? <><span className="ai-dot" aria-hidden="true" />SECTRAI</> : t('SEN')}
              </span>
              <div className="body">{rich(m.role === 'ai' ? t(m.text) : m.text)}</div>
            </div>
          ))}
          {busy && (
            <div className="bubble">
              <span className="who"><span className="ai-dot" aria-hidden="true" />SECTRAI</span>
              <div className="body" aria-label={t("Yapay zekâ düşünüyor")}>
                <span className="thinking-dots" aria-hidden="true"><i /><i /><i /></span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="composer-zone">
        <div className="composer-inner">
          <div className="composer">
            <label className="sr-only" htmlFor="chat-input" style={{ position: 'absolute', left: -9999 }}>
              {t("Mesajını yaz")}
            </label>
            <input
              id="chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder={t(view === 'work' ? 'İhtiyacını anlat — sistemin kurulsun…' : 'Bir şeyler sor…')}
              disabled={busy}
            />
            <button className="send" onClick={send} disabled={busy || !input.trim()} aria-label={t("Gönder")}>
              <Send size={16} aria-hidden="true" />
            </button>
          </div>

          {showPurposeChips && (
            <div className="quick-chips" aria-label={t("Hızlı seçim")}>
              <span className="lbl">{t("Ne için:")}</span>
              <button className="chip" onClick={() => handleChip('__purpose:business')} disabled={busy}>
                <Briefcase size={13} aria-hidden="true" /> {t("İş")}
              </button>
              <button className="chip" onClick={() => handleChip('__purpose:individual')} disabled={busy}>
                <User size={13} aria-hidden="true" /> {t('Bireysel')}
              </button>
            </div>
          )}
          {aiChips.length > 0 && (
            <div className="quick-chips" aria-label={t("Öneri çipleri")}>
              {aiChips.map((c) => (
                <button
                  key={c.value}
                  className={`chip${c.label.startsWith('✦') ? ' chip-accent' : ''}`}
                  onClick={() => handleChip(c.value)}
                  disabled={busy}
                >
                  {t(c.label)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
