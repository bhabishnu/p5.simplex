function setup() {
  createCanvas(500, 500)
  noiseMode(SIMPLEX)
  noiseSeed(1234)
  noLoop()
}

function draw() {
  loadPixels()

  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      const value = noise(x * 0.03, y * 0.03)
      const shade = value * 255

      set(x, y, shade)
    }
  }

  updatePixels()
}
