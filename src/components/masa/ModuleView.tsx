import { type ReactNode } from 'react'

export function ModuleView({ children }: { children: ReactNode }) {
  return <section className="masa-content module-content">{children}</section>
}
