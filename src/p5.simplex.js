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

  const permutation = [
  151, 160, 137, 91, 90, 15,
  131, 13, 201, 95, 96, 53, 194, 233, 7, 225,
  140, 36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23,
  190, 6, 148, 247, 120, 234, 75, 0, 26, 197, 62, 94, 252,
  219, 203, 117, 35, 11, 32, 57, 177, 33, 88, 237, 149, 56,
  87, 174, 20, 125, 136, 171, 168, 68, 175, 74, 165, 71, 134,
  139, 48, 27, 166, 77, 146, 158, 231, 83, 111, 229, 122, 60,
  211, 133, 230, 220, 105, 92, 41, 55, 46, 245, 40, 244, 102,
  143, 54, 65, 25, 63, 161, 1, 216, 80, 73, 209, 76, 132,
  187, 208, 89, 18, 169, 200, 196, 135, 130, 116, 188, 159,
  86, 164, 100, 109, 198, 173, 186, 3, 64, 52, 217, 226, 250,
  124, 123, 5, 202, 38, 147, 118, 126, 255, 82, 85, 212, 207,
  206, 59, 227, 47, 16, 58, 17, 182, 189, 28, 42, 223, 183,
  170, 213, 119, 248, 152, 2, 44, 154, 163, 70, 221, 153,
  101, 155, 167, 43, 172, 9, 129, 22, 39, 253, 19, 98, 108,
  110, 79, 113, 224, 232, 178, 185, 112, 104, 218, 246, 97,
  228, 251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162,
  241, 81, 51, 145, 235, 249, 14, 239, 107, 49, 192, 214,
  31, 181, 199, 106, 157, 184, 84, 204, 176, 115, 121, 50,
  45, 127, 4, 150, 254, 138, 236, 205, 93, 222, 114, 67, 29,
  24, 72, 243, 141, 128, 195, 78, 66, 215, 61, 156, 180
]

const perm = new Array(512)

for (let i = 0; i < 512; i++) {
  perm[i] = permutation[i & 255]
}

  let permutationInitialized = false

function seedPermutation(seed) {
  const values = new Array(256)

  for (let i = 0; i < 256; i++) {
    values[i] = i
  }

  let state = seed >>> 0

  function next() {
    state = (1664525 * state + 1013904223) % 4294967296
    return state / 4294967296
  }

  for (let i = 255; i > 0; i--) {
    const j = Math.floor(next() * (i + 1))
    const value = values[i]

    values[i] = values[j]
    values[j] = value
  }

  for (let i = 0; i < 512; i++) {
    perm[i] = values[i & 255]
  }

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

function simplex1D(x) {
  const i0 = Math.floor(x)
  const i1 = i0 + 1

  const x0 = x - i0
  const x1 = x0 - 1

  let t0 = 1 - x0 * x0
  t0 *= t0
  const n0 = t0 * t0 * grad1(perm[i0 & 255], x0)

  let t1 = 1 - x1 * x1
  t1 *= t1
  const n1 = t1 * t1 * grad1(perm[i1 & 255], x1)

  return 0.395 * (n0 + n1)
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

  let n0 = 0
  let n1 = 0
  let n2 = 0

  let t0 = 0.5 - x0 * x0 - y0 * y0
  if (t0 >= 0) {
    t0 *= t0
    n0 = t0 * t0 * grad2(perm[ii + perm[jj]], x0, y0)
  }

  let t1 = 0.5 - x1 * x1 - y1 * y1
  if (t1 >= 0) {
    t1 *= t1
    n1 = t1 * t1 * grad2(
      perm[ii + i1 + perm[jj + j1]],
      x1,
      y1
    )
  }

  let t2 = 0.5 - x2 * x2 - y2 * y2
  if (t2 >= 0) {
    t2 *= t2
    n2 = t2 * t2 * grad2(
      perm[ii + 1 + perm[jj + 1]],
      x2,
      y2
    )
  }

  return 40 * (n0 + n1 + n2)
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

  let n0 = 0
  let n1 = 0
  let n2 = 0
  let n3 = 0

  let t0 = 0.5 - x0 * x0 - y0 * y0 - z0 * z0
  if (t0 >= 0) {
    t0 *= t0
    n0 = t0 * t0 * grad3(
      perm[ii + perm[jj + perm[kk]]],
      x0,
      y0,
      z0
    )
  }

  let t1 = 0.5 - x1 * x1 - y1 * y1 - z1 * z1
  if (t1 >= 0) {
    t1 *= t1
    n1 = t1 * t1 * grad3(
      perm[ii + i1 + perm[jj + j1 + perm[kk + k1]]],
      x1,
      y1,
      z1
    )
  }

  let t2 = 0.5 - x2 * x2 - y2 * y2 - z2 * z2
  if (t2 >= 0) {
    t2 *= t2
    n2 = t2 * t2 * grad3(
      perm[ii + i2 + perm[jj + j2 + perm[kk + k2]]],
      x2,
      y2,
      z2
    )
  }

  let t3 = 0.5 - x3 * x3 - y3 * y3 - z3 * z3
  if (t3 >= 0) {
    t3 *= t3
    n3 = t3 * t3 * grad3(
      perm[ii + 1 + perm[jj + 1 + perm[kk + 1]]],
      x3,
      y3,
      z3
    )
  }

  return 72 * (n0 + n1 + n2 + n3)
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

      if (
        typeof originalResult !== 'number' ||
        Number.isNaN(originalResult)
      ) {
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
