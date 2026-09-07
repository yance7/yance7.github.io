import { expect, test } from '@playwright/test'

const rapidSelectionSequence = [
  'jay-ye-hui-mei',
  'jj-second-heaven',
  'jay-common-jasmine-orange',
  'jj-cao-cao',
  'jay-ye-hui-mei',
  'jj-second-heaven',
  'jay-common-jasmine-orange',
  'jj-cao-cao',
  'jay-ye-hui-mei',
  'jj-second-heaven',
  'jay-common-jasmine-orange',
  'jj-cao-cao',
  'jay-ye-hui-mei',
  'jj-second-heaven',
  'jay-common-jasmine-orange',
  'jj-cao-cao',
  'jay-ye-hui-mei',
  'jj-second-heaven',
  'jj-cao-cao',
  'jay-common-jasmine-orange'
] as const

test('album wall keeps displayed metadata stable while a new cover decodes', async ({ page }) => {
  await page.goto('/concerts.html')
  await page.evaluate(() => {
    let decodeBlocked = true
    const pendingDecodes: Array<() => void> = []
    const nativeDecode = HTMLImageElement.prototype.decode

    Object.defineProperty(window, 'releaseAlbumDecode', {
      configurable: true,
      value: () => {
        decodeBlocked = false
        HTMLImageElement.prototype.decode = nativeDecode
        pendingDecodes.splice(0).forEach((resolve) => resolve())
      }
    })

    HTMLImageElement.prototype.decode = function () {
      const source = this.currentSrc || this.src
      if (!source.includes('jay-ye-hui-mei') || !decodeBlocked) {
        return nativeDecode ? nativeDecode.call(this) : Promise.resolve()
      }
      return new Promise<void>((resolve) => pendingDecodes.push(resolve))
    }
  })

  const wall = page.locator('.album-wall-section')
  const target = wall.locator('[data-album-id="jay-ye-hui-mei"]')
  const slot = wall.locator('.album-visual-slot')

  await target.click()
  await expect(slot).toHaveAttribute('aria-busy', 'true')
  await expect(wall.locator('.album-title')).toHaveText('范特西')
  await expect(wall.locator('.album-index')).toHaveText('01 / 42')
  await expect(wall.locator('.album-link')).toHaveAttribute('href', /535739206/)
  await expect(slot.locator('img[src$="jay-fantasy.jpg"]')).toHaveCount(1)

  await page.evaluate(() => {
    (window as unknown as Window & { releaseAlbumDecode: () => void }).releaseAlbumDecode()
  })
  await expect(slot).toHaveAttribute('aria-busy', 'false')
  await expect(slot).toHaveAttribute('data-spotlight-state', 'ready')
  await expect(wall.locator('.album-title')).toHaveText('叶惠美')
  await expect(wall.locator('.album-index')).toHaveText('02 / 42')
  await expect(slot.locator('img[src$="jay-ye-hui-mei.jpg"]')).toHaveCount(1)
})

test('album wall commits the final choice after twenty rapid selections', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/concerts.html')
  await page.evaluate(() => {
    const nativeDecode = HTMLImageElement.prototype.decode
    const pendingDecodes = new Set<() => void>()
    const decodeDelays = [
      ['jay-ye-hui-mei', 240],
      ['jj-second-heaven', 160],
      ['jay-common-jasmine-orange', 20]
    ] as const

    HTMLImageElement.prototype.decode = function () {
      const source = this.currentSrc || this.src
      const delay = decodeDelays.find(([albumId]) => source.includes(albumId))?.[1] ?? 0
      if (delay === 0) return nativeDecode.call(this)

      return new Promise<void>((resolve) => {
        let timer = 0
        const release = () => {
          window.clearTimeout(timer)
          pendingDecodes.delete(release)
          resolve()
        }
        timer = window.setTimeout(release, delay)
        pendingDecodes.add(release)
      })
    }

    Object.defineProperty(window, 'releaseAlbumDecodes', {
      configurable: true,
      value: () => {
        pendingDecodes.forEach((release) => release())
        HTMLImageElement.prototype.decode = nativeDecode
      }
    })
  })

  const wall = page.locator('.album-wall-section')
  for (const albumId of rapidSelectionSequence) {
    const tile = wall.locator(`[data-album-id="${albumId}"]`)
    await tile.dispatchEvent('click')
  }

  const finalTile = wall.locator('[data-album-id="jay-common-jasmine-orange"]')
  await expect(finalTile).toHaveAttribute('aria-selected', 'true')
  await expect(wall.locator('.album-visual-slot')).toHaveAttribute('aria-busy', 'false')
  await expect(wall.locator('.album-visual-slot')).toHaveAttribute('data-spotlight-state', 'ready')
  await expect(wall.locator('.album-title')).toHaveText('七里香')
  await expect(wall.locator('.album-index')).toHaveText('03 / 42')
  await expect(wall.locator('.album-link')).toHaveAttribute('href', /536114662/)
  await expect(wall.locator('.album-cover-frame img[src$="jay-common-jasmine-orange.jpg"]')).toHaveCount(1)
  await page.evaluate(() => {
    (window as unknown as Window & { releaseAlbumDecodes: () => void }).releaseAlbumDecodes()
  })
})
