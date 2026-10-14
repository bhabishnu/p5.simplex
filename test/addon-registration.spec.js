const { test, expect } = require('@playwright/test')
const {
  P5_VERSIONS,
  loadP5,
  loadAddon,
  loadP5WithAddon
} = require('./support/p5')

const markerKey = 'p5.simplex.addon.installed'

for (const version of P5_VERSIONS) {
  // p5.registerAddon exists from p5.js 2.0 onwards.
  const registerAddon = !version.startsWith('1.')

  for (const mode of ['global', 'instance']) {
    test(`p5.js ${version} registers in ${mode} mode`, async ({ page }) => {
      await loadP5(page, version)

      await page.evaluate(trackRegistration => {
        window.__noiseBefore = {
          noise: p5.prototype.noise,
          noiseSeed: p5.prototype.noiseSeed,
          noiseDetail: p5.prototype.noiseDetail
      }

      window.__registerAddonCalls = 0

      if (trackRegistration) {
        const original = p5.registerAddon

        p5.registerAddon = function(...args) {
          window.__registerAddonCalls++
          return original.apply(this, args)
        }
      }
    }, registerAddon)

    await loadAddon(page)

    const firstLoad = await page.evaluate(key => {
      const marker = Symbol.for(key)
        const descriptor = Object.getOwnPropertyDescriptor(p5.prototype, marker)

      return {
        installed: descriptor?.value === 1,
        enumerable: descriptor?.enumerable,
        noiseUnchanged: p5.prototype.noise === window.__noiseBefore.noise,
        seedUnchanged: p5.prototype.noiseSeed === window.__noiseBefore.noiseSeed,
        detailUnchanged: p5.prototype.noiseDetail === window.__noiseBefore.noiseDetail,
        registerAddonCalls: window.__registerAddonCalls
      }
    }, markerKey)


      expect(firstLoad.installed).toBe(true)
      expect(firstLoad.enumerable).toBe(false)
      expect(firstLoad.noiseUnchanged).toBe(false)
      expect(firstLoad.seedUnchanged).toBe(false)
      expect(firstLoad.detailUnchanged).toBe(true)
      expect(firstLoad.registerAddonCalls).toBe(registerAddon ? 1 : 0)

      await loadAddon(page)

      const markerCount = await page.evaluate(key =>
        Object.getOwnPropertySymbols(p5.prototype)
        .filter(symbol => Symbol.keyFor(symbol) === key)
        .length
        , markerKey)

        expect(markerCount).toBe(1)

  const publicApi = await page.evaluate(mode => {
  let sketch

  if (mode === 'global') {
    window.setup = function() {}
    sketch = new p5()
  } else {
    sketch = new p5(function() {})
  }

  return {
    noiseMode: typeof p5.prototype.noiseMode,
    simplex: typeof p5.prototype.SIMPLEX,
    instanceNoiseMode: typeof sketch.noiseMode,
    instanceSimplex: typeof sketch.SIMPLEX
  }
}, mode)

      expect(publicApi).toEqual({
        noiseMode: 'function',
        simplex: 'string',
        instanceNoiseMode: 'function',
        instanceSimplex: 'string'
      })
    })
  }
  test(`p5.js ${version} keeps noise APIs and output unchanged when reloaded`, async ({ page }) => {
    await loadP5WithAddon(page, version)

    // Samples the same seeded sketch in both modes without reseeding it.
    const sample = () => page.evaluate(() => {
      const sketch = window.__sketch
      const points = [[0.123], [0.123, 0.456], [0.123, 0.456, 0.789]]

      sketch.noiseMode('default')
      const native = points.map(point => sketch.noise(...point))

      sketch.noiseMode(sketch.SIMPLEX)
      const simplex = points.map(point => sketch.noise(...point))

      return { native, simplex }
    })

    await page.evaluate(() => {
      window.__sketch = new p5(function() {})
      window.__sketch.noiseSeed(1234)

      window.__noiseRef = p5.prototype.noise
      window.__noiseSeedRef = p5.prototype.noiseSeed
      window.__noiseModeRef = p5.prototype.noiseMode
    })

    const before = await sample()

    await loadAddon(page)

    const after = await sample()

    const result = await page.evaluate(() => ({
      noiseSame: p5.prototype.noise === window.__noiseRef,
      noiseSeedSame: p5.prototype.noiseSeed === window.__noiseSeedRef,
      noiseModeSame: p5.prototype.noiseMode === window.__noiseModeRef
    }))

    expect(result.noiseSame).toBe(true)
    expect(result.noiseSeedSame).toBe(true)
    expect(result.noiseModeSame).toBe(true)

    expect(before.simplex).toEqual([
      0.3434565389153417,
      0.45901264471893405,
      0.3977113023828554
    ])
    expect(after).toEqual(before)
  })
}
