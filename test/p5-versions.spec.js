const { test, expect } = require('@playwright/test')
const { devDependencies } = require('../package.json')
const { P5_VERSIONS } = require('./support/p5')

test('package.json pins every tested p5.js version exactly', () => {
  for (const version of P5_VERSIONS) {
    const alias = `p5-${version}`

    expect(devDependencies[alias], alias).toBe(`npm:p5@${version}`)
  }
})
