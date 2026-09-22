const path = require('node:path')
const { test, expect } = require('@playwright/test')

const addonPath = path.resolve(__dirname, '../src/p5.simplex.js')

const versions = [
  { name: 'p5.js 1.11.13', package: 'p5-v1' },
  { name: 'p5.js 2.3.0', package: 'p5-v2' }
]

for (const version of versions) {
  test(`${version.name} exposes simplex API without changing default noise`, async ({ page }) => {
    const p5Path = path.resolve(
      __dirname,
      `../node_modules/${version.package}/lib/p5.min.js`
    )

    await page.addScriptTag({ path: p5Path })

    const before = await page.evaluate(() => {
      const sketch = new p5(function() {})

      sketch.noiseSeed(1234)

      return [
        sketch.noise(0.123),
        sketch.noise(0.123, 0.456),
        sketch.noise(0.123, 0.456, 0.789)
      ]
    })

    await page.addScriptTag({ path: addonPath })

    const after = await page.evaluate(() => {
      const sketch = new p5(function() {})

      sketch.noiseSeed(1234)

      return {
        hasNoiseMode: typeof sketch.noiseMode === 'function',
        hasSimplex: typeof sketch.SIMPLEX !== 'undefined',
        values: [
          sketch.noise(0.123),
          sketch.noise(0.123, 0.456),
          sketch.noise(0.123, 0.456, 0.789)
        ]
      }
    })

    expect(after.hasNoiseMode).toBe(true)
    expect(after.hasSimplex).toBe(true)
    expect(after.values).toEqual(before)
  })

  test(`${version.name} switches to simplex noise`, async ({ page }) => {
  const p5Path = path.resolve(
    __dirname,
    `../node_modules/${version.package}/lib/p5.min.js`
  )

  await page.addScriptTag({ path: p5Path })
  await page.addScriptTag({ path: addonPath })

  const result = await page.evaluate(() => {
    const sketch = new p5(function() {})

    sketch.noiseSeed(1234)
    const defaultValue = sketch.noise(0.123, 0.456)

    sketch.noiseMode(sketch.SIMPLEX)
    const simplexValue = sketch.noise(0.123, 0.456)

    return {
      defaultValue,
      simplexValue,
      simplexMode: sketch._noiseMode
    }
  })

  expect(result.simplexMode).toBe('simplex')
  expect(Number.isFinite(result.simplexValue)).toBe(true)
  expect(result.simplexValue).toBeGreaterThanOrEqual(0)
  expect(result.simplexValue).toBeLessThanOrEqual(1)
  expect(result.simplexValue).not.toBe(result.defaultValue)
})

  test(`${version.name} matches simplex reference values`, async ({ page }) => {
  const p5Path = path.resolve(
    __dirname,
    `../node_modules/${version.package}/lib/p5.min.js`
  )

  await page.addScriptTag({ path: p5Path })
  await page.addScriptTag({ path: addonPath })

  const values = await page.evaluate(() => {
    const sketch = new p5(function() {})

    sketch.noiseMode(sketch.SIMPLEX)

    return {
      oneD: sketch.noise(0.123),
      twoD: sketch.noise(0.123, 0.456),
      threeD: sketch.noise(0.123, 0.456, 0.789),
      negative1D: sketch.noise(-0.25),
      negative2D: sketch.noise(-0.25, 0.75),
      negative3D: sketch.noise(-0.25, 0.75, -1.125)
    }
  })

  expect(values.oneD).toBeCloseTo(0.6823514402090586, 10)
  expect(values.twoD).toBeCloseTo(0.4686595747396688, 10)
  expect(values.threeD).toBeCloseTo(0.6145049050715903, 10)

  expect(values.negative1D).toBeCloseTo(0.22200570106506345, 10)
  expect(values.negative2D).toBeCloseTo(0.6415918437609047, 10)
  expect(values.negative3D).toBeCloseTo(0.7115989327430725, 10)
})

  test(`${version.name} keeps simplex mode isolated per instance`, async ({ page }) => {
  const p5Path = path.resolve(
    __dirname,
    `../node_modules/${version.package}/lib/p5.min.js`
  )

  await page.addScriptTag({ path: p5Path })
  await page.addScriptTag({ path: addonPath })

  const result = await page.evaluate(() => {
    const a = new p5(function() {})
    const b = new p5(function() {})

    a.noiseSeed(1234)
    b.noiseSeed(1234)

    const defaultA = a.noise(0.123, 0.456)
    const defaultB = b.noise(0.123, 0.456)

    a.noiseMode(a.SIMPLEX)

    const simplexA1 = a.noise(0.123, 0.456)
    const simplexA2 = a.noise(0.123, 0.456)
    const stillDefaultB = b.noise(0.123, 0.456)

    a.noiseMode('default')
    const restoredA = a.noise(0.123, 0.456)

    return {
      defaultA,
      defaultB,
      simplexA1,
      simplexA2,
      stillDefaultB,
      restoredA
    }
  })

  expect(result.defaultA).toBe(result.defaultB)
  expect(result.simplexA1).toBe(result.simplexA2)
  expect(result.simplexA1).not.toBe(result.defaultA)
  expect(result.stillDefaultB).toBe(result.defaultB)
  expect(result.restoredA).toBe(result.defaultA)
})

  test(`${version.name} routes simplex noise in global mode`, async ({ page }) => {
  const p5Path = path.resolve(
    __dirname,
    `../node_modules/${version.package}/lib/p5.min.js`
  )

  await page.addScriptTag({ path: p5Path })
  await page.addScriptTag({ path: addonPath })

  const result = await page.evaluate(() => {
    window.setup = function() {}
    new p5()

    noiseSeed(1234)
    const defaultValue = noise(0.123, 0.456)

    noiseMode(SIMPLEX)
    const simplexValue = noise(0.123, 0.456)

    return {
      hasNoiseMode: typeof noiseMode === 'function',
      simplexConstant: SIMPLEX,
      defaultValue,
      simplexValue
    }
  })

  expect(result.hasNoiseMode).toBe(true)
  expect(result.simplexConstant).toBe('simplex')
  expect(result.simplexValue).not.toBe(result.defaultValue)
  expect(result.simplexValue).toBeGreaterThanOrEqual(0)
  expect(result.simplexValue).toBeLessThanOrEqual(1)
})

  test(`${version.name} falls back to default noise for unknown modes`, async ({ page }) => {
  const p5Path = path.resolve(
    __dirname,
    `../node_modules/${version.package}/lib/p5.min.js`
  )

  await page.addScriptTag({ path: p5Path })
  await page.addScriptTag({ path: addonPath })

  const result = await page.evaluate(() => {
    const sketch = new p5(function() {})

    sketch.noiseSeed(1234)
    const expected = sketch.noise(0.123, 0.456, 0.789)

    sketch.noiseMode('unknown')
    const actual = sketch.noise(0.123, 0.456, 0.789)

    return { expected, actual }
  })

  expect(result.actual).toBe(result.expected)
})

  test(`${version.name} handles default and extra arguments in simplex mode`, async ({ page }) => {
  const p5Path = path.resolve(
    __dirname,
    `../node_modules/${version.package}/lib/p5.min.js`
  )

  await page.addScriptTag({ path: p5Path })
  await page.addScriptTag({ path: addonPath })

  const result = await page.evaluate(() => {
    const sketch = new p5(function() {})

    sketch.noiseMode(sketch.SIMPLEX)

    return {
      noArgs: sketch.noise(),
      undefinedX: sketch.noise(undefined),
      three: sketch.noise(0.123, 0.456, 0.789),
      extra: sketch.noise(0.123, 0.456, 0.789, 12345)
    }
  })

  expect(Number.isNaN(result.noArgs)).toBe(true)
  expect(Number.isNaN(result.undefinedX)).toBe(true)
  expect(result.extra).toBe(result.three)
})
}

test('p5.js 2.3.0 leaves strands noise untouched in simplex mode', async ({ page }) => {
  const p5Path = path.resolve(
    __dirname,
    '../node_modules/p5-v2/lib/p5.min.js'
  )

  await page.addScriptTag({ path: p5Path })
  await page.addScriptTag({ path: addonPath })

  const observations = await page.evaluate(() =>
    new Promise((resolve, reject) => {
      new p5(sketch => {
        sketch.setup = function() {
          try {
            sketch.createCanvas(1, 1, sketch.WEBGL)
            sketch.noLoop()
            sketch.noiseMode(sketch.SIMPLEX)

            let captured

            const capture = result => {
              captured = {
                type: typeof result,
                isStrandsNode: result.isStrandsNode,
                dimension: result.dimension
              }
            }

            sketch.buildFilterShader(() => {
              sketch.getColor(() => {
                const result = sketch.noise(0.123, 0.456)
                capture(result)
                return [result, 0, 0, 1]
              })
            }, { sketch, capture })

            resolve(captured)
          } catch (error) {
            reject(error)
          }
        }
      })
    })
  )

  expect(observations).toEqual({
    type: 'object',
    isStrandsNode: true,
    dimension: 1
  })
})