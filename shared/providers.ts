// AI sağlayıcı kayıt defteri — GENİŞLETİLEBİLİR liste. Yeni sağlayıcı = tek satır ekle.
// Burada YALNIZ meta veri var (etiket/ipucu); anahtarlar ASLA burada durmaz — şifreli depoda (server/secrets.ts).

export interface ProviderInfo {
  id: string;
  label: string;
  /** Anahtar formatı ipucu (giriş alanı placeholder'ı) */
  hint: string;
  /** Sağlayıcı adı (fatura/model dokümantasyonu için) */
  vendor: string;
}

export const AI_PROVIDERS: ProviderInfo[] = [
  { id: 'anthropic', label: 'Claude (Anthropic)', hint: 'sk-ant-…', vendor: 'Anthropic' },
  { id: 'openai', label: 'ChatGPT (OpenAI)', hint: 'sk-…', vendor: 'OpenAI' },
  { id: 'deepseek', label: 'DeepSeek', hint: 'sk-…', vendor: 'DeepSeek' },
  { id: 'xai', label: 'Grok (xAI)', hint: 'xai-…', vendor: 'xAI' },
];

export const isKnownProvider = (id: string): boolean => AI_PROVIDERS.some((p) => p.id === id);

/** Sadece durum — anahtarın kendisi ASLA döndürülmez (owner kaydeder, tekrar görüntülenmez). */
export interface ProviderStatus {
  id: string;
  label: string;
  vendor: string;
  hint: string;
  configured: boolean;
  setAt: string | null;
  setBy: string | null;
  /** Sağlayıcıya gerçek çağrıyla doğrulandığı an (null = ayarlı ama doğrulanmadı). */
  verifiedAt: string | null;
}
