export type AlbumCoverSize = 640 | 1200

export function albumCoverFallback(id: string): string {
  return `/assets/albums/${id}.jpg`
}

export function albumCoverWebp(id: string, size: AlbumCoverSize): string {
  return `/assets/albums/thumbs/${id}-${size}.webp`
}

export function albumCoverSrcset(id: string): string {
  return `${albumCoverWebp(id, 640)} 640w, ${albumCoverWebp(id, 1200)} 1200w`
}
