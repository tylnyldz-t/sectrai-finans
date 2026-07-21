/** Future real providers must be server-side, gateway-managed, and fail closed. */
export class SyntheticFinanceAIProvider {
  async assess({ task }) {
    const signals = []
    if (task.evidence.length === 0) signals.push('Zorunlu kanıt henüz yüklenmedi.')
    if (task.status === 'PENDING_REVIEW') signals.push('Checker incelemesi insan onayı olmadan tamamlanamaz.')
    if (task.status === 'REJECTED') signals.push('Red gerekçesindeki revizyon worker tarafından kapatılmalı.')
    if (task.status === 'LOCKED') signals.push('Bağımlı önceki görev onaylanana kadar adım kilitli.')
    if (signals.length === 0) signals.push('Kural-temelli ön denetimde ek gecikme sinyali yok; insan incelemesi yine zorunlu.')
    return {
      label: 'AI-ASSISTED · SENTETİK DEMO',
      taskId: task.id,
      signals,
      decision: 'HUMAN_REVIEW_REQUIRED',
    }
  }
}

export function createFinanceAIProvider() { return new SyntheticFinanceAIProvider() }
