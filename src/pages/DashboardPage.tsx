import { type ReactNode } from 'react'

/** Finans Masa kapısı: kaynak landing kabuğundaki masa ana yerleşiminin domain-portu. */
export function DashboardPage({ children }: { children: ReactNode }) {
  return <div className="masa-shell">{children}</div>
}
