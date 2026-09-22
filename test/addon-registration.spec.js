const path = require('node:path')
const { test, expect } = require('@playwright/test')

const addonPath = path.resolve(__dirname, '../src/p5.simplex.js')
const markerKey = 'p5.simplex.addon.installed'

const versions = [
  { name: 'p5.js 1.11.13', package: 'p5-v1', registerAddon: false},
  {name: 'p5.js 2.3.0', package: 'p5-v2', registerAddon: true }
]

for (const version of versions) {
  for (const mode of ['global', 'instance']) {
    test(`${version.name} registers in ${mode} mode`, async ({ page }) => {
      const p5Path = path.resolve(
        __dirname,
        `../node_modules/${version.package}/lib/p5.min.js`
      )

      await page.addScriptTag({ path: p5Path })
      
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
    }, version.registerAddon)

    await page.addScriptTag({ path: addonPath})

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
      expect(firstLoad.seedUnchanged).toBe(true)
      expect(firstLoad.detailUnchanged).toBe(true)
      expect(firstLoad.registerAddonCalls).toBe(version.registerAddon ? 1 : 0)

      await page.addScriptTag({ path: addonPath })

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
}
