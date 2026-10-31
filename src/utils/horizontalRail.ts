export type RailCardGeometry = {
  offsetLeft: number
  offsetWidth: number
}

export type RailDirection = -1 | 1

const endpointTolerance = 1

export function getRailDestinations(
  cards: readonly RailCardGeometry[],
  viewportWidth: number,
  maxScrollLeft: number,
  safeEdge = 4
) {
  const upperBound = Math.max(0, maxScrollLeft)

  return cards.map((card, index) => {
    const left = card.offsetLeft
    const right = left + card.offsetWidth
    const target = index === 0
      ? left - safeEdge
      : index === cards.length - 1
        ? right - viewportWidth + safeEdge
        : left + card.offsetWidth / 2 - viewportWidth / 2

    return Math.max(0, Math.min(upperBound, target))
  })
}

export function findNearestDestinationIndex(destinations: readonly number[], scrollLeft: number) {
  if (!destinations.length) return -1

  const first = destinations[0]!
  const lastIndex = destinations.length - 1
  const last = destinations[lastIndex]!
  const nearestIndex = destinations.reduce((nearest, destination, index) => {
    return Math.abs(destination - scrollLeft) < Math.abs(destinations[nearest]! - scrollLeft)
      ? index
      : nearest
  }, 0)
  const nearestDestination = destinations[nearestIndex]!

  if (nearestDestination === first) return 0
  if (nearestDestination === last) return lastIndex
  return nearestIndex
}

export function findNextRailDestinationIndex(
  destinations: readonly number[],
  scrollLeft: number,
  direction: RailDirection,
  pendingIndex?: number
) {
  if (!destinations.length) return -1

  const hasPendingDestination = pendingIndex !== undefined
    && Number.isInteger(pendingIndex)
    && pendingIndex >= 0
    && pendingIndex < destinations.length
  const nearestIndex = hasPendingDestination ? -1 : findNearestDestinationIndex(destinations, scrollLeft)
  const nearestDestination = nearestIndex >= 0 ? destinations[nearestIndex]! : undefined
  const currentPosition = hasPendingDestination
    ? destinations[pendingIndex]!
    : nearestDestination !== undefined && Math.abs(nearestDestination - scrollLeft) <= endpointTolerance
      ? nearestDestination
      : scrollLeft

  if (direction > 0) {
    const nextIndex = destinations.findIndex(destination => destination > currentPosition + endpointTolerance)
    if (nextIndex < 0) return -1

    const nextPosition = destinations[nextIndex]!
    let lastIndex = nextIndex
    while (lastIndex + 1 < destinations.length && destinations[lastIndex + 1] === nextPosition) {
      lastIndex += 1
    }
    return lastIndex
  }

  for (let index = destinations.length - 1; index >= 0; index -= 1) {
    const destination = destinations[index]!
    if (destination >= currentPosition - endpointTolerance) continue

    while (index > 0 && destinations[index - 1] === destination) index -= 1
    return index
  }

  return -1
}

export function isRailDestinationPending(position: number, start: number, target: number) {
  return Math.abs(position - target) > 1
    && position >= Math.min(start, target) - 2
    && position <= Math.max(start, target) + 2
}
