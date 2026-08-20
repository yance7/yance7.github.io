export interface AlbumNavigationInput {
  key: string
  index: number
  total: number
  columns: number
}

export function getAlbumNavigationIndex({
  key,
  index,
  total,
  columns
}: AlbumNavigationInput): number | null {
  const itemCount = Number.isFinite(total) ? Math.max(0, Math.trunc(total)) : 0
  if (itemCount === 0) return null

  const safeIndex = Number.isFinite(index) ? Math.trunc(index) : 0
  const currentIndex = Math.min(Math.max(safeIndex, 0), itemCount - 1)
  const columnCount = Number.isFinite(columns) ? Math.max(1, Math.trunc(columns)) : 1
  const candidates: Record<string, number> = {
    ArrowLeft: currentIndex - 1,
    ArrowRight: currentIndex + 1,
    ArrowUp: currentIndex - columnCount,
    ArrowDown: currentIndex + columnCount,
    Home: 0,
    End: itemCount - 1
  }
  const candidate = candidates[key]
  return candidate === undefined
    ? null
    : Math.min(Math.max(candidate, 0), itemCount - 1)
}
