import { expect, test } from '@playwright/test'
import { rm } from 'node:fs/promises'

const dataFile = '/tmp/sectrai-finans-e2e.json'
test.beforeEach(async () => { await rm(dataFile, { force: true }) })

test('worker proof, checker approval, sequential unlocking, and reload persistence work end-to-end', async ({ page }) => {
  await page.goto('http://127.0.0.1:4178')
  await expect(page.getByRole('heading', { name: 'Kanıt görünür, geçiş kilitli.' })).toBeVisible()
  await page.getByRole('combobox', { name: 'Demo rolü' }).selectOption('L3_WORKER')
  await page.getByRole('button', { name: 'Görevler & Onaylar' }).click()
  await expect(page.getByRole('heading', { name: 'Görevler & Onaylar' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'İncelemeye gönder' }).first()).toBeDisabled()
  await page.locator('input[type=file]').first().setInputFiles({ name: 'mutabakat.pdf', mimeType: 'application/pdf', buffer: Buffer.from('synthetic proof') })
  await page.getByRole('button', { name: 'Kanıtı yükle' }).first().click()
  await expect(page.getByRole('status')).toContainText('hash doğrulamasıyla')
  await page.getByRole('button', { name: 'İncelemeye gönder' }).first().click()
  await expect(page.getByRole('status')).toContainText('checker incelemesine')
  await page.getByRole('combobox', { name: 'Demo rolü' }).selectOption('L2_CHECKER')
  await page.getByRole('button', { name: 'Görevler & Onaylar' }).click()
  await page.getByRole('button', { name: 'Kanıtı onayla' }).click()
  await expect(page.getByRole('status')).toContainText('bağımlı görevler')
  await page.reload()
  await page.getByRole('combobox', { name: 'Demo rolü' }).selectOption('L3_WORKER')
  await page.getByRole('button', { name: 'Görevler & Onaylar' }).click()
  await expect(page.getByText('Müvekkil takip aksiyonunu kayda al')).toBeVisible()
  await expect(page.getByText('Kanıt bekliyor')).toBeVisible()
  await page.getByRole('combobox', { name: 'Demo rolü' }).selectOption('L1_ADMIN')
  await page.getByRole('button', { name: 'Kart Düzeni (Puck)' }).click()
  await expect(page.getByRole('heading', { name: 'Masa kart düzeni' })).toBeVisible()
  await expect(page.locator('.Puck')).toBeVisible()
})
