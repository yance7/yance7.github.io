export function getMimoFontSize(viewportWidth: number, containerWidth: number, textWidthAt100: number, remSize = 16) {
  const requested = Math.max(6 * remSize, Math.min(14 * remSize, viewportWidth * 0.18))
  return requested * textWidthAt100 / 100 > containerWidth * 0.92
    ? Math.max(18, containerWidth * 0.92 / textWidthAt100 * 100)
    : requested
}
