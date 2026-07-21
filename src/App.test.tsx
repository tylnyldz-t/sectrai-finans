import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import App from './App'

afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('Sectrai Finans Masa shell', () => {
  it('uses the copied landing shell and switches KONUŞ, UYGULA, and MASA as real views', () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    render(<App />)
    expect(screen.getByRole('tab', { name: 'KONUŞ' })).not.toBeNull()
    expect(screen.getByRole('tab', { name: 'UYGULA' })).not.toBeNull()
    expect(screen.getByRole('tab', { name: 'MASA' })).not.toBeNull()
    expect(screen.getByText('Eklentiler')).not.toBeNull()
    expect(screen.getByText('Sabitlenenler')).not.toBeNull()
    fireEvent.click(screen.getByRole('tab', { name: 'UYGULA' }))
    expect(screen.getByLabelText('Finans uygulama tuvali')).not.toBeNull()
    fireEvent.click(screen.getByRole('tab', { name: 'MASA' }))
    expect(screen.getByText('Rol kapsamındaki sentetik çalışma alanı yükleniyor…')).not.toBeNull()
  })
})
