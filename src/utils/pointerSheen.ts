export interface PointerSheenBounds {
  left: number
  top: number
  width: number
  height: number
}

export interface PointerSheenPosition {
  x: number
  y: number
}

function clamp(value: number) {
  return Math.min(Math.max(value, 0), 100)
}

export function getPointerSheenPosition(
  bounds: PointerSheenBounds,
  clientX: number,
  clientY: number
): PointerSheenPosition {
  if (bounds.width <= 0 || bounds.height <= 0) return { x: 50, y: 50 }

  return {
    x: clamp(((clientX - bounds.left) / bounds.width) * 100),
    y: clamp(((clientY - bounds.top) / bounds.height) * 100)
  }
}
