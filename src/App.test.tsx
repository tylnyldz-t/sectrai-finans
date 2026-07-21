import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import App from './App'

afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('Sectrai Finans investor demo', () => {
  it('labels the synthetic boundary, exposes the four-level role control, and keeps the logout route', () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    render(<App />)
    expect(screen.getAllByText(/SENTETİK DEMO/).length).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: 'Oturumu kapat' }).getAttribute('href')).toBe('/__admin-logout')
    expect(screen.getByText(/Finansal karar destek sistemi değildir/)).not.toBeNull()
    expect(screen.getByRole('combobox', { name: 'Demo rolü' })).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Görevler & Onaylar' })).not.toBeNull()
  })
})
