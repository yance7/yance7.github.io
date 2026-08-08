export function originalImageUrl(name: string) {
  return `/assets/concerts/${name}`
}

export function thumbnailUrl(name: string) {
  return `/assets/concerts/thumbs/${name.replace(/\.[^.]+$/, '.webp')}`
}
