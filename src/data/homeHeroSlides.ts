import assetManifest from './homeHeroAssets.json'
import { homeHeroPresentation, type HomeHeroSlideId, type HomeHeroSlidePresentation } from './homeHeroPresentation'

export { HOME_HERO_IMAGE_SIZES } from './homeHeroPresentation'

interface HomeHeroImageCandidate {
  src: string
  width: number
  height: number
  bytes: number
  sha256: string
}

interface HomeHeroSlideSources {
  webp: readonly HomeHeroImageCandidate[]
  jpeg: readonly HomeHeroImageCandidate[]
}

interface HomeHeroAssetRecord {
  id: HomeHeroSlideId
  sourceFormat: 'png' | 'jpeg'
  width: number
  height: number
  sources: HomeHeroSlideSources
}

export interface HomeHeroSlide extends HomeHeroAssetRecord, HomeHeroSlidePresentation {}

const manifest = assetManifest as { version: 1; slides: HomeHeroAssetRecord[] }

export const homeHeroSlides: readonly HomeHeroSlide[] = manifest.slides.map((asset) => ({
  ...asset,
  ...homeHeroPresentation[asset.id]
}))
