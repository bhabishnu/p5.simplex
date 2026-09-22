(function() {
  const installed = Symbol.for('p5.simplex.addon.installed')

    function simplex(p5, fn) {
      if (Object.prototype.hasOwnProperty.call(fn, installed)) {
        return
      }

      Object.defineProperty(fn, installed, {
        value: 1
      })
    }

    if (typeof p5 !== 'undefined') {
      if (typeof p5.registerAddon === 'function') {
        p5.registerAddon(simplex)
      } else {
        simplex(p5, p5.prototype)
      }
    }
  })()
  