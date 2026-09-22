# p5.simplex

A standalone p5.js addon that adds Simplex noise through:

```js
noiseMode(SIMPLEX)
```

Built in response to [processing/p5.js#6152](https://github.com/processing/p5.js/issues/6152).

## Compatibility

Tested with:

- p5.js 1.11.13
- p5.js 2.3.0
- global mode
- instance mode

## Usage

Load p5.js first, then the addon:

```html
<script src="p5.min.js"></script>
<script src="p5.simplex.js"></script>
```

Then switch the existing `noise()` API to Simplex noise:

```js
function setup() {
  noiseMode(SIMPLEX)

  console.log(noise(0.1))
  console.log(noise(0.1, 0.2))
  console.log(noise(0.1, 0.2, 0.3))
}
```

Switching to any other mode returns `noise()` to p5's default implementation:

```js
noiseMode(SIMPLEX)
const simplexValue = noise(0.1, 0.2)

noiseMode('default')
const defaultValue = noise(0.1, 0.2)
```

## Seeding

`noiseSeed()` also seeds Simplex noise:

```js
noiseMode(SIMPLEX)

noiseSeed(1234)
const a = noise(0.1, 0.2)

noiseSeed(1234)
const b = noise(0.1, 0.2)

console.log(a === b) // true
```

The addon preserves p5's existing `noiseSeed()` behavior when switching back to the default noise implementation.

## Current scope

- CPU-side 1D, 2D and 3D Simplex noise
- p5.js 1.x and 2.x
- `noiseSeed()` integration
- p5.js 2.x Strands/shader noise is left untouched

`noiseDetail()` behavior for Simplex mode is not defined yet.

## Development

Install dependencies:

```bash
npm install
```

Run the test suite:

```bash
npm test
```

The test suite covers both supported p5.js versions using Playwright.

## Status

Work in progress.
