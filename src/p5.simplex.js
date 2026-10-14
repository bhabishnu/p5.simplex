/*
 * Simplex noise ported from Stefan Gustavson's simplexnoise1234.c:
 * https://github.com/stegu/perlin-noise
 *
 * The original Simplex noise implementation was released into the
 * public domain by its author.
 *
 * The 1D implementation uses the 0.395 scale factor described in
 * Gustavson's source comments so the output approximately fills [-1, 1].
 */

(function() {
  const installed = Symbol.for('p5.simplex.addon.installed')

  const perm = new Uint8Array(512)

  let permutationInitialized = false

function seedPermutation(seed) {
  let state = seed >>> 0

  function next() {
    state = (1664525 * state + 1013904223) % 4294967296
    return state / 4294967296
  }

  for (let i = 0; i < 256; i++) {
    perm[i] = i
  }

  for (let i = 255; i > 0; i--) {
    const j = Math.floor(next() * (i + 1))
    const value = perm[i]

    perm[i] = perm[j]
    perm[j] = value
  }

  // The second half repeats the first so corner hashes need no extra wrap.
  perm.copyWithin(256, 0, 256)

  permutationInitialized = true
}

function grad1(hash, x) {
  const h = hash & 15
  let grad = 1 + (h & 7)

  if (h & 8) {
    grad = -grad
  }

  return grad * x
}

function grad2(hash, x, y) {
  const h = hash & 7
  const u = h < 4 ? x : y
  const v = h < 4 ? y : x

  return ((h & 1) ? -u : u) +
    ((h & 2) ? -2 * v : 2 * v)
}

function grad3(hash, x, y, z) {
  const h = hash & 15
  const u = h < 8 ? x : y
  const v = h < 4 ? y : (h === 12 || h === 14 ? x : z)

  return ((h & 1) ? -u : u) +
    ((h & 2) ? -v : v)
}

// Each corner contributes (r^2 - d^2)^4 * grad. In 2D and 3D, `t >= 0` drops
// corners outside the radius and also maps NaN distances (from overflowing
// coordinates) to 0, so do not invert it to `t < 0`. In 1D |d| <= 1 always,
// so there is no cutoff.
function corner1D(hash, x) {
  let t = 1 - x * x
  t *= t
  return t * t * grad1(hash, x)
}

function corner2D(hash, x, y) {
  let t = 0.5 - x * x - y * y
  if (t >= 0) {
    t *= t
    return t * t * grad2(hash, x, y)
  }
  return 0
}

function corner3D(hash, x, y, z) {
  let t = 0.5 - x * x - y * y - z * z
  if (t >= 0) {
    t *= t
    return t * t * grad3(hash, x, y, z)
  }
  return 0
}

function simplex1D(x) {
  const i0 = Math.floor(x)
  const i1 = i0 + 1

  const x0 = x - i0
  const x1 = x0 - 1

  return 0.395 * (
    corner1D(perm[i0 & 255], x0) +
    corner1D(perm[i1 & 255], x1)
  )
}

function simplex2D(x, y) {
  const F2 = 0.3660254037844386
  const G2 = 0.21132486540518713

  const s = (x + y) * F2
  const i = Math.floor(x + s)
  const j = Math.floor(y + s)

  const t = (i + j) * G2
  const x0 = x - (i - t)
  const y0 = y - (j - t)

  let i1
  let j1

  if (x0 > y0) {
    i1 = 1
    j1 = 0
  } else {
    i1 = 0
    j1 = 1
  }

  const x1 = x0 - i1 + G2
  const y1 = y0 - j1 + G2
  const x2 = x0 - 1 + 2 * G2
  const y2 = y0 - 1 + 2 * G2

  const ii = i & 255
  const jj = j & 255

  return 40 * (
    corner2D(perm[ii + perm[jj]], x0, y0) +
    corner2D(perm[ii + i1 + perm[jj + j1]], x1, y1) +
    corner2D(perm[ii + 1 + perm[jj + 1]], x2, y2)
  )
}

function simplex3D(x, y, z) {
  const F3 = 1 / 3
  const G3 = 1 / 6

  const s = (x + y + z) * F3
  const i = Math.floor(x + s)
  const j = Math.floor(y + s)
  const k = Math.floor(z + s)

  const t = (i + j + k) * G3
  const x0 = x - (i - t)
  const y0 = y - (j - t)
  const z0 = z - (k - t)

  let i1, j1, k1
  let i2, j2, k2

  if (x0 >= y0) {
    if (y0 >= z0) {
      i1 = 1; j1 = 0; k1 = 0
      i2 = 1; j2 = 1; k2 = 0
    } else if (x0 >= z0) {
      i1 = 1; j1 = 0; k1 = 0
      i2 = 1; j2 = 0; k2 = 1
    } else {
      i1 = 0; j1 = 0; k1 = 1
      i2 = 1; j2 = 0; k2 = 1
    }
  } else {
    if (y0 < z0) {
      i1 = 0; j1 = 0; k1 = 1
      i2 = 0; j2 = 1; k2 = 1
    } else if (x0 < z0) {
      i1 = 0; j1 = 1; k1 = 0
      i2 = 0; j2 = 1; k2 = 1
    } else {
      i1 = 0; j1 = 1; k1 = 0
      i2 = 1; j2 = 1; k2 = 0
    }
  }

  const x1 = x0 - i1 + G3
  const y1 = y0 - j1 + G3
  const z1 = z0 - k1 + G3

  const x2 = x0 - i2 + 2 * G3
  const y2 = y0 - j2 + 2 * G3
  const z2 = z0 - k2 + 2 * G3

  const x3 = x0 - 1 + 3 * G3
  const y3 = y0 - 1 + 3 * G3
  const z3 = z0 - 1 + 3 * G3

  const ii = i & 255
  const jj = j & 255
  const kk = k & 255

  return 72 * (
    corner3D(perm[ii + perm[jj + perm[kk]]], x0, y0, z0) +
    corner3D(perm[ii + i1 + perm[jj + j1 + perm[kk + k1]]], x1, y1, z1) +
    corner3D(perm[ii + i2 + perm[jj + j2 + perm[kk + k2]]], x2, y2, z2) +
    corner3D(perm[ii + 1 + perm[jj + 1 + perm[kk + 1]]], x3, y3, z3)
  )
}

function simplex(p5, fn) {
  if (Object.prototype.hasOwnProperty.call(fn, installed)) {
    return
  }

  Object.defineProperty(fn, installed, {
    value: 1
  })

  const originalNoise = fn.noise
  const originalNoiseSeed = fn.noiseSeed

  const needsNativeNoiseDispatch =
    typeof p5.registerAddon === 'function'

  fn.SIMPLEX = 'simplex'

  fn.noiseMode = function(mode) {
    this._noiseMode = mode
  }

  fn.noiseSeed = function(seed) {
  const normalizedSeed = seed == null
    ? (Math.random() * 4294967296) >>> 0
    : seed >>> 0

  const result = originalNoiseSeed.call(this, normalizedSeed)

  seedPermutation(normalizedSeed)

  return result
}

  fn.noise = function(x, y, z) {
    if (this._noiseMode !== fn.SIMPLEX) {
      return originalNoise.apply(this, arguments)
    }

    if (needsNativeNoiseDispatch) {
      const originalResult = originalNoise.apply(this, arguments)

      if (typeof originalResult !== 'number') {
        return originalResult
      }
    }

    let dimensions = 3

    if (
      arguments.length === 1 ||
      (arguments.length === 2 && y === undefined)
    ) {
      dimensions = 1
    } else if (
      arguments.length === 2 ||
      (arguments.length === 3 && z === undefined)
    ) {
      dimensions = 2
    }

    x = Number(x)
    y = y === undefined ? 0 : Number(y)
    z = z === undefined ? 0 : Number(z)

    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
      return NaN
    }

    if (!permutationInitialized) {
      seedPermutation((Math.random() * 4294967296) >>> 0)
    }

    let raw

    if (dimensions === 1) {
      raw = simplex1D(x)
    } else if (dimensions === 2) {
      raw = simplex2D(x, y)
    } else {
      raw = simplex3D(x, y, z)
    }

    return (raw + 1) * 0.5
  }
}

  if (typeof p5 !== 'undefined') {
    if (typeof p5.registerAddon === 'function') {
      p5.registerAddon(simplex)
    } else {
      simplex(p5, p5.prototype)
    }
  }
})()
