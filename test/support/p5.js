const path = require('node:path')

// Every version is installed under the exact npm alias `p5-<version>`.
const P5_VERSIONS = ['1.11.13', '2.0.0', '2.3.0', '2.3.4']

const addonPath = path.resolve(__dirname, '../../src/p5.simplex.js')

function p5Path(version) {
  return path.resolve(
    __dirname,
    `../../node_modules/p5-${version}/lib/p5.min.js`
  )
}

async function loadP5(page, version) {
  await page.addScriptTag({ path: p5Path(version) })

  const loaded = await page.evaluate(() => p5.prototype.VERSION)

  if (loaded !== version) {
    throw new Error(`Expected p5.js ${version} but loaded p5.js ${loaded}`)
  }
}

async function loadAddon(page) {
  await page.addScriptTag({ path: addonPath })
}

async function loadP5WithAddon(page, version) {
  await loadP5(page, version)
  await loadAddon(page)
}

module.exports = { P5_VERSIONS, loadP5, loadAddon, loadP5WithAddon }
