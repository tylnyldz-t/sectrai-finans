import { Puck, type Config, type Data } from '@puckeditor/core'
import '@puckeditor/core/puck.css'
import type { CardType } from './lib/api'

type PuckWidgetType = 'Workflow' | 'Ledger' | 'Roles' | 'Audit'
type PuckComponents = Record<PuckWidgetType, Record<string, never>>

const cardMeta: Record<CardType, { puckType: PuckWidgetType; title: string; detail: string }> = {
  workflow: { puckType: 'Workflow', title: 'İş akışı', detail: 'Kanıt, onay kilidi ve revizyon' },
  ledger: { puckType: 'Ledger', title: 'Kayıt defterleri', detail: 'Sentetik finans incelemeleri' },
  roles: { puckType: 'Roles', title: 'Ekip & roller', detail: 'Profesyonel hizmet hiyerarşisi' },
  audit: { puckType: 'Audit', title: 'Denetim izi', detail: 'Append-only olay günlüğü' },
}
const cardForPuck = Object.fromEntries(Object.entries(cardMeta).map(([type, meta]) => [meta.puckType, type as CardType])) as Record<PuckWidgetType, CardType>

function preview(title: string, detail: string) {
  return function Preview() {
    return <section className="puck-card-preview"><span aria-hidden="true">⠿</span><div><strong>{title}</strong><small>{detail}</small></div><em>İZİNLİ PRESET</em></section>
  }
}

const config: Config<PuckComponents, Record<string, never>> = {
  root: { render: ({ children }) => <div className="finance-puck-canvas">{children}</div> },
  components: {
    Workflow: { label: 'İş akışı kartı', render: preview('İş akışı', 'Kanıt, onay kilidi ve revizyon') },
    Ledger: { label: 'Kayıt defteri kartı', render: preview('Kayıt defterleri', 'Sentetik finans incelemeleri') },
    Roles: { label: 'Ekip ve roller kartı', render: preview('Ekip & roller', '4 katmanlı meslek hiyerarşisi') },
    Audit: { label: 'Denetim izi kartı', render: preview('Denetim izi', 'Append-only olay günlüğü') },
  },
}

function dataFor(cards: Array<{ type: CardType }>): Data {
  return { content: cards.map((card) => ({ type: cardMeta[card.type].puckType, props: {} })) } as unknown as Data
}
function cardsFor(data: Data): Array<{ type: CardType }> {
  if (!Array.isArray(data.content)) throw new Error('PUCK_CARD_DATA_INVALID')
  const cards = data.content.map((item) => cardForPuck[item.type as PuckWidgetType]).filter((type): type is CardType => Boolean(type)).map((type) => ({ type }))
  if (!cards.length || new Set(cards.map((card) => card.type)).size !== cards.length) throw new Error('Her izinli kart yalnız bir kez eklenebilir.')
  return cards
}

export default function PuckCardEditor({ cards, onSave }: { cards: Array<{ type: CardType }>; onSave: (cards: Array<{ type: CardType }>) => void }) {
  return <Puck key={JSON.stringify(cards)} config={config} data={dataFor(cards)} headerTitle="Finans Masa Kartları" permissions={{ insert: true, delete: true, duplicate: false, drag: true, edit: false }} onPublish={(data) => onSave(cardsFor(data as Data))} />
}
