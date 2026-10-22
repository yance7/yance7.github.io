export function getCenteredScrollLeft(cardCenter: number, viewportWidth: number, maxScrollLeft: number) {
  return Math.max(0, Math.min(Math.max(0, maxScrollLeft), cardCenter - viewportWidth / 2))
}

export function findNearestCenteredIndex(centers: number[], viewportCenter: number) {
  return centers.reduce((nearest, center, index) => nearest < 0 || Math.abs(center - viewportCenter) < Math.abs(centers[nearest]! - viewportCenter) ? index : nearest, -1)
}

export function getRailInset(viewportWidth: number, cardWidth: number, trackSpan: number, count: number) {
  if (!count || (count > 1 && trackSpan <= viewportWidth - 4)) return 2
  return Math.max(2, (viewportWidth - cardWidth) / 2)
}
