const { test, expect } = require('@playwright/test')
const { P5_VERSIONS, loadP5WithAddon } = require('./support/p5')

// Largest |gradient| of the [0, 1] output, found by dense sampling plus
// hill-climbing for seeds 0, 1234 and 4294967295: 1.6664 (1D), 3.2542 (2D)
// and 3.2623 (3D). The slope between two nearby samples of a continuous
// function cannot exceed that, so a jump shows up as a larger slope.
const MAX_SLOPE = { 1: 1.7, 2: 3.3, 3: 3.3 }

// Straight walks through negative and positive cells, with unit directions.
const CONTINUITY_LINES = [
  { start: [-20], direction: [1] },
  { start: [-15.3, -9.1], direction: [0.8, 0.6] },
  { start: [-9.7, -14.2, -6.1], direction: [0.48, 0.6, 0.64] }
]

for (const version of P5_VERSIONS) {
  test(`p5.js ${version} keeps simplex output finite and inside [0, 1]`, async ({ page }) => {
    await loadP5WithAddon(page, version)

    const result = await page.evaluate(() => {
      const sketch = new p5(function() {})
      sketch.noiseMode(sketch.SIMPLEX)
      sketch.noiseSeed(1234)

      // Steps that do not line up with the integer or simplex lattice.
      const fine = Array.from({ length: 1000 }, (_, i) => -50 + i * 0.1013)
      const coarse = Array.from({ length: 41 }, (_, i) => -50 + i * 2.437)

      const points = fine.map(x => [x])

      for (const x of coarse) {
        for (const y of coarse) {
          points.push([x, y + 0.29])

          for (const z of coarse) {
            points.push([x, y + 0.29, z - 0.53])
          }
        }
      }

      const outOfRange = points
        .map(point => ({ point, value: sketch.noise(...point) }))
        .filter(({ value }) => !(Number.isFinite(value) && value >= 0 && value <= 1))

      return { count: points.length, outOfRange: outOfRange.slice(0, 10) }
    })

    expect(result.count).toBe(1000 + 41 ** 2 + 41 ** 3)
    expect(result.outOfRange).toEqual([])
  })

  test(`p5.js ${version} keeps simplex noise continuous between nearby samples`, async ({ page }) => {
    await loadP5WithAddon(page, version)

    const slopes = await page.evaluate(lines => {
      const sketch = new p5(function() {})
      sketch.noiseMode(sketch.SIMPLEX)

      const step = 1e-3
      const steps = 40000
      const results = []

      for (const seed of [0, 1234, 4294967295]) {
        sketch.noiseSeed(seed)

        for (const { start, direction } of lines) {
          const at = k => start.map((value, d) => value + k * step * direction[d])

          let previous = sketch.noise(...at(0))
          let maxSlope = 0

          for (let k = 1; k <= steps; k++) {
            const current = sketch.noise(...at(k))
            maxSlope = Math.max(maxSlope, Math.abs(current - previous) / step)
            previous = current
          }

          results.push({ seed, dimensions: start.length, maxSlope })
        }
      }

      return results
    }, CONTINUITY_LINES)

    expect(slopes).toHaveLength(9)

    for (const { seed, dimensions, maxSlope } of slopes) {
      const label = `seed ${seed}, ${dimensions}D`

      expect(maxSlope, label).toBeGreaterThan(0)
      expect(maxSlope, label).toBeLessThanOrEqual(MAX_SLOPE[dimensions])
    }
  })

  test(`p5.js ${version} keeps negative and large simplex coordinates finite and unmirrored`, async ({ page }) => {
    await loadP5WithAddon(page, version)

    const result = await page.evaluate(() => {
      const sketch = new p5(function() {})
      sketch.noiseMode(sketch.SIMPLEX)

      const large = [
        [1e15 + 0.5],
        [-1e15 - 0.5, 3],
        [1e300, 1, -1e300],
        [-Number.MAX_VALUE, Number.MAX_VALUE],
        [Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE]
      ]
      const mirrored = [[0.3], [0.3, 0.7], [0.3, 0.7, 1.1]]

      const sample = () => {
        sketch.noiseSeed(1234)

        return {
          large: large.map(point => sketch.noise(...point)),
          positive: mirrored.map(point => sketch.noise(...point)),
          negative: mirrored.map(point => sketch.noise(...point.map(c => -c)))
        }
      }

      return { first: sample(), second: sample() }
    })

    for (const value of result.first.large) {
      expect(Number.isFinite(value)).toBe(true)
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThanOrEqual(1)
    }

    // Native noise mirrors negative coordinates; simplex does not.
    result.first.negative.forEach((value, i) => {
      expect(value).not.toBe(result.first.positive[i])
    })

    expect(result.second).toEqual(result.first)
  })
}
