const { test, expect } = require('@playwright/test')
const {
  P5_VERSIONS,
  loadP5,
  loadAddon,
  loadP5WithAddon
} = require('./support/p5')

for (const version of P5_VERSIONS) {
  test(`p5.js ${version} exposes simplex API without changing default noise`, async ({ page }) => {
    await loadP5(page, version)

    const before = await page.evaluate(() => {
      const sketch = new p5(function() {})

      sketch.noiseSeed(1234)

      return [
        sketch.noise(0.123),
        sketch.noise(0.123, 0.456),
        sketch.noise(0.123, 0.456, 0.789)
      ]
    })

    await loadAddon(page)

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

  test(`p5.js ${version} switches to simplex noise`, async ({ page }) => {
  await loadP5WithAddon(page, version)

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

  test(`p5.js ${version} randomizes unseeded simplex once`, async ({ page }) => {
  await loadP5WithAddon(page, version)

  const result = await page.evaluate(() => {
    const sketch = new p5(function() {})

    sketch.noiseMode(sketch.SIMPLEX)

    const originalRandom = Math.random
    let first
    let second

    Math.random = () => 0.25

    try {
      first = sketch.noise(0.123, 0.456)
      second = sketch.noise(0.123, 0.456)
    } finally {
      Math.random = originalRandom
    }

    sketch.noiseSeed(1073741824)
    const explicit = sketch.noise(0.123, 0.456)

    return { first, second, explicit }
  })

  expect(result.first).toBe(result.second)
  expect(result.first).toBe(result.explicit)
})

  test(`p5.js ${version} keeps simplex mode isolated per instance`, async ({ page }) => {
  await loadP5WithAddon(page, version)

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

  test(`p5.js ${version} restores native and simplex values across repeated mode switches`, async ({ page }) => {
    await loadP5WithAddon(page, version)

    const result = await page.evaluate(() => {
      const sketch = new p5(function() {})
      const points = [[0.123], [0.123, 0.456], [0.123, 0.456, 0.789]]
      const sample = () => points.map(point => sketch.noise(...point))

      sketch.noiseSeed(1234)

      // Any mode other than SIMPLEX uses native noise; 'default' matches the
      // other tests and does not settle the public spelling.
      const native = sample()
      sketch.noiseMode(sketch.SIMPLEX)
      const simplex = sample()
      sketch.noiseMode('default')
      const nativeAgain = sample()
      sketch.noiseMode(sketch.SIMPLEX)
      const simplexAgain = sample()

      return { native, simplex, nativeAgain, simplexAgain }
    })

    expect(result.simplex).toEqual([
      0.3434565389153417,
      0.45901264471893405,
      0.3977113023828554
    ])
    expect(result.nativeAgain).toEqual(result.native)
    expect(result.simplexAgain).toEqual(result.simplex)

    result.simplex.forEach((value, i) => {
      expect(value).not.toBe(result.native[i])
    })
  })

  test(`p5.js ${version} routes simplex noise in global mode`, async ({ page }) => {
  await loadP5WithAddon(page, version)

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

  test(`p5.js ${version} falls back to default noise for unknown modes`, async ({ page }) => {
  await loadP5WithAddon(page, version)

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

  test(`p5.js ${version} handles default and extra arguments in simplex mode`, async ({ page }) => {
  await loadP5WithAddon(page, version)

  const result = await page.evaluate(() => {
    const sketch = new p5(function() {})

    sketch.noiseMode(sketch.SIMPLEX)

    return {
      noArgs: sketch.noise(),
      undefinedX: sketch.noise(undefined),

      one: sketch.noise(0.123),
      oneWithUndefined: sketch.noise(0.123, undefined),

      two: sketch.noise(0.123, 0.456),
      twoWithUndefined: sketch.noise(0.123, 0.456, undefined),

      three: sketch.noise(0.123, 0.456, 0.789),
      extra: sketch.noise(0.123, 0.456, 0.789, 12345)
    }
  })

  expect(Number.isNaN(result.noArgs)).toBe(true)
  expect(Number.isNaN(result.undefinedX)).toBe(true)
  expect(result.oneWithUndefined).toBe(result.one)
  expect(result.twoWithUndefined).toBe(result.two)
  expect(result.extra).toBe(result.three)
})

  test(`p5.js ${version} coerces numeric coordinates like default noise in simplex mode`, async ({ page }) => {
  await loadP5WithAddon(page, version)

  const result = await page.evaluate(() => {
    const sketch = new p5(function() {})

    sketch.noiseMode(sketch.SIMPLEX)
    sketch.noiseSeed(1234)

    return {
      one: sketch.noise(0.123),
      oneString: sketch.noise('0.123'),

      two: sketch.noise(0.123, 0.456),
      twoString: sketch.noise('0.123', '0.456'),

      three: sketch.noise(0.123, 0.456, 0.789),
      threeString: sketch.noise('0.123', '0.456', '0.789'),
      threeMixed: sketch.noise(0.123, '0.456', 0.789),

      twoZeroY: sketch.noise(0.123, 0),
      twoNullY: sketch.noise(0.123, null)
    }
  })

  expect(result.two).not.toBe(0.5)
  expect(result.three).not.toBe(0.5)

  expect(result.oneString).toBe(result.one)
  expect(result.twoString).toBe(result.two)
  expect(result.threeString).toBe(result.three)
  expect(result.threeMixed).toBe(result.three)
  expect(result.twoNullY).toBe(result.twoZeroY)
})

  test(`p5.js ${version} returns NaN for non-finite coordinates like default noise`, async ({ page }) => {
  await loadP5WithAddon(page, version)

  const result = await page.evaluate(() => {
    const sketch = new p5(function() {})

    const cases = [
      [NaN],
      [Infinity],
      [-Infinity],
      ['abc'],
      [0.123, NaN],
      [Infinity, 0.456],
      [0.123, -Infinity],
      [0.123, 0.456, NaN],
      [0.123, Infinity, 0.789],
      [0.123, 0.456, -Infinity]
    ]

    sketch.noiseSeed(1234)
    const defaultValues = cases.map(args => sketch.noise(...args))

    sketch.noiseMode(sketch.SIMPLEX)
    const simplexValues = cases.map(args => sketch.noise(...args))

    return {
      defaultNaN: defaultValues.map(Number.isNaN),
      simplexNaN: simplexValues.map(Number.isNaN),
      finite: sketch.noise(0.123, 0.456, 0.789)
    }
  })

  expect(result.defaultNaN.every(Boolean)).toBe(true)
  expect(result.simplexNaN).toEqual(result.defaultNaN)
  expect(Number.isFinite(result.finite)).toBe(true)
})
}

// p5.strands shader builders are only exercised on the 2.3 line.
for (const version of ['2.3.0', '2.3.4']) {
  test(`p5.js ${version} leaves strands noise untouched in simplex mode`, async ({ page }) => {
    await loadP5WithAddon(page, version)

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
}

test('p5.js 1.11.13 skips native noise for CPU simplex samples', async ({ page }) => {
  await loadP5(page, '1.11.13')

  await page.evaluate(() => {
    const originalNoise = p5.prototype.noise

    window.__nativeNoiseCalls = 0

    p5.prototype.noise = function() {
      window.__nativeNoiseCalls++
      return originalNoise.apply(this, arguments)
    }
  })

  await loadAddon(page)

  const result = await page.evaluate(() => {
    const sketch = new p5(function() {})
    sketch.noiseMode(sketch.SIMPLEX)

    const originalRandom = Math.random
    let randomCalls = 0

    Math.random = () => {
      randomCalls++
      return 0.25
    }

    try {
      sketch.noise(0.123, 0.456)

      return {
        nativeNoiseCalls: window.__nativeNoiseCalls,
        randomCalls
      }
    } finally {
      Math.random = originalRandom
    }
  })

  expect(result.nativeNoiseCalls).toBe(0)
  expect(result.randomCalls).toBe(1)
})
