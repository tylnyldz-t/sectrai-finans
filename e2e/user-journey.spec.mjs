import { expect, test } from '@playwright/test'
import { rm } from 'node:fs/promises'

const dataFile = '/tmp/sectrai-finans-e2e.json'
test.beforeEach(async () => { await rm(dataFile, { force: true }) })

test('cashflow creation, AI briefing, owner decision, and reload persistence work end-to-end', async ({ page }) => {
  await page.goto('http://127.0.0.1:4178')
  await expect(page.getByRole('heading', { name: 'Kanıt görünür, karar sende.' })).toBeVisible()
  await page.getByRole('combobox', { name: 'Şablon' }).selectOption('stress')
  await page.getByRole('button', { name: 'Senaryoyu kaydet' }).click()
  await expect(page.getByRole('status')).toContainText('JSON depoya kaydedildi')
  await expect(page.getByText('Stres senaryosu · 90 gün')).toBeVisible()
  await page.getByRole('button', { name: 'AI açıklamasını hazırla' }).click()
  await expect(page.getByText('AI-GENERATED · SENTETİK DEMO')).toBeVisible()
  await page.getByRole('button', { name: 'Takip incelemesine al' }).click()
  await expect(page.getByText('Owner kararı kaydedildi')).toBeVisible()
  await page.reload()
  await expect(page.getByText('Stres senaryosu · 90 gün')).toBeVisible()
  await expect(page.getByText('Owner kararı kaydedildi')).toBeVisible()
})
