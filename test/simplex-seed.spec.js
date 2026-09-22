const path = require('node:path')
const { test, expect } = require('@playwright/test')

const addonPath = path.resolve(__dirname, '../src/p5.simplex.js')

const versions = [
  { name: 'p5.js 1.11.13', package: 'p5-v1' },
  { name: 'p5.js 2.3.0', package: 'p5-v2' }
]

for (const version of versions) {
  test(`${version.name} reseeds simplex noise deterministically`, async ({ page }) => {
    const p5Path = path.resolve(
      __dirname,
      `../node_modules/${version.package}/lib/p5.min.js`
    )

    await page.addScriptTag({ path: p5Path })
    await page.addScriptTag({ path: addonPath })

    const result = await page.evaluate(() => {
      const sketch = new p5(function() {})
      sketch.noiseMode(sketch.SIMPLEX)

      sketch.noiseSeed(1234)
      const first = sketch.noise(0.123, 0.456)

      sketch.noiseSeed(5678)
      const different = sketch.noise(0.123, 0.456)

      sketch.noiseSeed(1234)
      const restored = sketch.noise(0.123, 0.456)

      return { first, different, restored }
    })

    expect(result.first).toBe(result.restored)
    expect(result.different).not.toBe(result.first)
  })

  test(`${version.name} keeps p5 noiseSeed behavior while simplex mode is active`, async ({ page }) => {
    const p5Path = path.resolve(
      __dirname,
      `../node_modules/${version.package}/lib/p5.min.js`
    )

    await page.addScriptTag({ path: p5Path })
    await page.addScriptTag({ path: addonPath })

    const result = await page.evaluate(() => {
      const sketch = new p5(function() {})

      sketch.noiseSeed(77)
      const expected = sketch.noise(0.123, 0.456)

      sketch.noiseMode(sketch.SIMPLEX)
      const returnValue = sketch.noiseSeed(99)

      sketch.noiseSeed(77)
      sketch.noiseMode('default')
      const restored = sketch.noise(0.123, 0.456)

      return {
        expected,
        restored,
        returnValue
      }
    })

    expect(result.restored).toBe(result.expected)
    expect(result.returnValue).toBeUndefined()
  })

  test(`${version.name} follows p5 seed coercion`, async ({ page }) => {
  const p5Path = path.resolve(
    __dirname,
    `../node_modules/${version.package}/lib/p5.min.js`
  )

  await page.addScriptTag({ path: p5Path })
  await page.addScriptTag({ path: addonPath })

  const result = await page.evaluate(() => {
    const sketch = new p5(function() {})
    sketch.noiseMode(sketch.SIMPLEX)

    const sample = seed => {
      sketch.noiseSeed(seed)
      return sketch.noise(0.123, 0.456)
    }

    return {
      int: sample(1234),
      float: sample(1234.9),

      negative: sample(-1),
      negativeFloat: sample(-1.9),
      unsigned: sample(4294967295),

      zero: sample(0),
      wrappedZero: sample(4294967296)
    }
  })

  expect(result.float).toBe(result.int)

  expect(result.negativeFloat).toBe(result.negative)
  expect(result.unsigned).toBe(result.negative)

  expect(result.wrappedZero).toBe(result.zero)
})

  test(`${version.name} shares simplex seed state across instances`, async ({ page }) => {
  const p5Path = path.resolve(
    __dirname,
    `../node_modules/${version.package}/lib/p5.min.js`
  )

  await page.addScriptTag({ path: p5Path })
  await page.addScriptTag({ path: addonPath })

  const result = await page.evaluate(() => {
    const a = new p5(function() {})
    const b = new p5(function() {})

    a.noiseMode(a.SIMPLEX)
    b.noiseMode(b.SIMPLEX)

    a.noiseSeed(11)
    const before = a.noise(0.123, 0.456)

    b.noiseSeed(22)

    return {
      before,
      afterA: a.noise(0.123, 0.456),
      afterB: b.noise(0.123, 0.456)
    }
  })

  expect(result.afterA).toBe(result.afterB)
  expect(result.afterA).not.toBe(result.before)
})

  test(`${version.name} uses one random draw for null and undefined seeds`, async ({ page }) => {
  const p5Path = path.resolve(
    __dirname,
    `../node_modules/${version.package}/lib/p5.min.js`
  )

  await page.addScriptTag({ path: p5Path })
  await page.addScriptTag({ path: addonPath })

  const result = await page.evaluate(() => {
    const sketch = new p5(function() {})
    sketch.noiseMode(sketch.SIMPLEX)

    const originalRandom = Math.random
    let calls = 0

    Math.random = function() {
      calls++
      return 0.25
    }

    try {
      sketch.noiseSeed(undefined)
      const undefinedValue = sketch.noise(0.123, 0.456)
      const callsAfterUndefined = calls

      sketch.noiseSeed(null)
      const nullValue = sketch.noise(0.123, 0.456)

      return {
        undefinedValue,
        nullValue,
        callsAfterUndefined,
        totalCalls: calls
      }
    } finally {
      Math.random = originalRandom
    }
  })

  expect(result.callsAfterUndefined).toBe(1)
  expect(result.totalCalls).toBe(2)
  expect(result.nullValue).toBe(result.undefinedValue)
})

  test(`${version.name} matches seeded simplex reference values`, async ({ page }) => {
  const p5Path = path.resolve(
    __dirname,
    `../node_modules/${version.package}/lib/p5.min.js`
  )

  await page.addScriptTag({ path: p5Path })
  await page.addScriptTag({ path: addonPath })

  const result = await page.evaluate(() => {
    const sketch = new p5(function() {})

    sketch.noiseMode(sketch.SIMPLEX)
    sketch.noiseSeed(1234)

    return {
      oneD: sketch.noise(0.123),
      twoD: sketch.noise(0.123, 0.456),
      threeD: sketch.noise(0.123, 0.456, 0.789)
    }
  })

  expect(result.oneD).toBeCloseTo(0.3434565389153417, 10)
  expect(result.twoD).toBeCloseTo(0.45901264471893405, 10)
  expect(result.threeD).toBeCloseTo(0.3977113023828554, 10)
})
}