/** Future real providers must be server-side, gateway-managed, and fail closed. */
export class SyntheticFinanceAIProvider {
  async explain({ module, item }) {
    const labels = {
      collections: 'tahsilat riski',
      claims: 'hasar inceleme kaydı',
      aml: 'AML uyarı kaydı',
    }
    return {
      label: 'AI-GENERATED · SENTETİK DEMO',
      text: `${item.title} için ${labels[module]} görünümü, yalnız görünür sentetik kanıtları özetler: ${item.evidence.join(' ')} Bu bir finansal, hukuki veya uyum kararı değildir.`,
      evidenceIds: item.evidenceIds,
    }
  }
}

export function createFinanceAIProvider() { return new SyntheticFinanceAIProvider() }
