import { type ReactNode } from 'react'

export function MasaModuleCard({ title, detail, children }: { title: string; detail: string; children: ReactNode }) {
  return <article className="panel-card"><div className="panel-head">MODÜL</div><h2 className="panel-title">{title}</h2><p className="panel-sub">{detail}</p>{children}</article>
}
