// Independent browser oracle for the MiMo mask, stride, homes and palette.
// Keep this separate from production functions so regressions remain observable.
export function readMimoReferenceGlyph(stage: HTMLElement) {
  const width = Math.floor(stage.getBoundingClientRect().width - stage.clientLeft * 2)
  const height = Math.floor(stage.getBoundingClientRect().height - stage.clientTop * 2)
  const mask = document.createElement('canvas')
  // Match the production readback backend, while keeping sampling independent.
  const context = mask.getContext('2d', { willReadFrequently: true })!
  const rem = Number.parseFloat(getComputedStyle(document.documentElement).fontSize)
  let size = Math.max(6 * rem, Math.min(14 * rem, innerWidth * .18))
  context.font = `400 ${size}px Amiri, serif`
  let metrics = context.measureText('YANCE')
  if (Math.max(1, metrics.width) > width * .92) {
    size = Math.max(18, width * .92 / Math.max(1, metrics.width) * size)
    context.font = `400 ${size}px Amiri, serif`
    metrics = context.measureText('YANCE')
  }
  const left = Math.ceil(metrics.actualBoundingBoxLeft || 0)
  const right = Math.ceil(metrics.actualBoundingBoxRight || metrics.width)
  const ascent = Math.ceil(metrics.actualBoundingBoxAscent || .78 * size)
  const descent = Math.ceil(metrics.actualBoundingBoxDescent || .22 * size)
  const padding = Math.max(12, Math.ceil(.08 * size))
  mask.width = Math.max(1, left + right) + 2 * padding
  mask.height = Math.max(1, ascent + descent) + 2 * padding
  context.font = `400 ${size}px Amiri, serif`
  context.fillStyle = '#fff'
  context.fillText('YANCE', padding - left, padding + ascent)
  const rgba = context.getImageData(0, 0, mask.width, mask.height).data
  const raw: { x: number; y: number }[] = []
  for (let y = 0; y < mask.height; y += 2) for (let x = 0; x < mask.width; x += 2) {
    if (rgba[(y * mask.width + x) * 4 + 3]! > 40) raw.push({ x: width / 2 - mask.width / 2 + x, y: height / 2 - mask.height / 2 + y })
  }
  const budget = Math.max(900, Math.min(5200, Math.floor(width * height / 90)))
  const stride = Math.max(1, Math.ceil(raw.length / budget))
  const points = raw.filter((_point, index) => index % stride === 0).map((point, index) => {
    const seed = ((9301 * index + 49297) % 233280) / 233280
    const blend = Math.max(0, Math.min(1, point.x / Math.max(1, width) + (seed - .5) * .35))
    return { ...point, color: `rgb(${Math.round(45 + 17 * blend)},${Math.round(58 + 21 * blend)},${Math.round(30 + 12 * blend)})` }
  })
  return { width, height, ratio: Math.min(devicePixelRatio || 1, 2), points }
}
