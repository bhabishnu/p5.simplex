const { test, expect } = require('@playwright/test')
const { P5_VERSIONS, loadP5WithAddon } = require('./support/p5')

// Expected values come from an independent generic N-D simplex reference
// (corners ordered by sorting, Gustavson's gradients and constants), not from
// src/. The reference agrees with the addon bit-for-bit, so values are exact.
const REFERENCE_SEEDS = [0, 1234, 4294967295]

// [coordinates, ...expected value for each REFERENCE_SEEDS entry]
const REFERENCE_CASES = [
  [[0.123], 0.5725030408862327, 0.3434565389153417, 0.5874850477393032],
  [[-0.123], 0.42897322805985766, 0.6634327161664136, 0.40611778682763827],
  [[3.75], 0.3528627109527588, 0.7286923789978027, 0.7778406047821045],
  [[-41.3], 0.4874280067549993, 0.6470359796675011, 0.5938333220300005],
  [[1000.5], 0.62498046875, 0.562490234375, 0.562490234375],
  [[2147483648.3], 0.6967152687358171, 0.2810556634532292, 0.5876994197664454],
  [[0.123, 0.456], 0.23380749449335236, 0.45901264471893405, 0.46924700345089493],
  [[-0.123, -0.456], 0.5284943422650225, 0.36151349242932596, 0.5516238810572619],
  [[12.34, -5.67], 0.8728130054167016, 0.6106826215311569, 0.8616714185491244],
  [[-100.25, 37.5], 0.19950941164738867, 0.3989362931996549, 0.715016453856224],
  [[-1000000.75, 2500.5], 0.17721593118984214, 0.17421891204965023, 0.28990550907906115],
  // Seed 1234 hashes the last corner through perm[511], the end of the copied half.
  [[-1.2, 3.7], 0.5094052235263294, 0.5654938156307197, 0.6782631033905838],
  [[0.123, 0.456, 0.789], 0.6061988525365396, 0.3977113023828554, 0.4128982440071999],
  [[-0.123, -0.456, -0.789], 0.4794095797907302, 0.5066199810082156, 0.4930084967759281],
  [[1.5, -2.25, 3.125], 0.5790749898663274, 0.539642639734127, 0.5295188780184146],
  [[-17.3, 8.6, -0.4], 0.7564253771851863, 0.23461856903703604, 0.7474693234074083],
  [[123456.789, -98765.4321, 5555.5], 0.8832106644728254, 0.5980283967666066, 0.18079413066580052]
]

for (const version of P5_VERSIONS) {
  test(`p5.js ${version} reseeds simplex noise deterministically`, async ({ page }) => {
    await loadP5WithAddon(page, version)

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

  test(`p5.js ${version} keeps p5 noiseSeed behavior while simplex mode is active`, async ({ page }) => {
    await loadP5WithAddon(page, version)

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

  test(`p5.js ${version} follows p5 seed coercion`, async ({ page }) => {
  await loadP5WithAddon(page, version)

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

  test(`p5.js ${version} shares simplex seed state across instances`, async ({ page }) => {
  await loadP5WithAddon(page, version)

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

  test(`p5.js ${version} uses one random draw for null and undefined seeds`, async ({ page }) => {
  await loadP5WithAddon(page, version)

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

  test(`p5.js ${version} matches seeded simplex reference values exactly`, async ({ page }) => {
    await loadP5WithAddon(page, version)

    const points = REFERENCE_CASES.map(([point]) => point)

    const actual = await page.evaluate(({ seeds, points }) => {
      const sketch = new p5(function() {})
      sketch.noiseMode(sketch.SIMPLEX)

      return seeds.flatMap(seed => {
        sketch.noiseSeed(seed)
        return points.map(point => ({ seed, point, value: sketch.noise(...point) }))
      })
    }, { seeds: REFERENCE_SEEDS, points })

    const expected = REFERENCE_SEEDS.flatMap((seed, column) =>
      REFERENCE_CASES.map(([point, ...values]) => ({ seed, point, value: values[column] }))
    )

    expect(actual).toEqual(expected)
  })
}
