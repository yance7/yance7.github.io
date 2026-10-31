export type HomeHeroSlideId = `hero-0${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9}` | `hero-1${0 | 1 | 2 | 3}`

export interface HomeHeroSlidePresentation {
  position: {
    desktop: string
    mobile: string
  }
  scrim: number
  labelKey: `page.home.slideshow.photos.${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13}`
}

export const HOME_HERO_IMAGE_SIZES = '(max-width: 760px) calc(100vw - 40px), calc(min(1260px, 100vw) - 10vw)'

export const homeHeroPresentation: Record<HomeHeroSlideId, HomeHeroSlidePresentation> = {
  'hero-01': { position: { desktop: '35% 60%', mobile: '28% 52%' }, scrim: 0.34, labelKey: 'page.home.slideshow.photos.1' },
  'hero-02': { position: { desktop: '70% 56%', mobile: '72% 50%' }, scrim: 0.33, labelKey: 'page.home.slideshow.photos.2' },
  'hero-03': { position: { desktop: '50% 45%', mobile: '50% 45%' }, scrim: 0.36, labelKey: 'page.home.slideshow.photos.3' },
  'hero-04': { position: { desktop: '45% 55%', mobile: '42% 50%' }, scrim: 0.35, labelKey: 'page.home.slideshow.photos.4' },
  'hero-05': { position: { desktop: '65% 52%', mobile: '66% 50%' }, scrim: 0.33, labelKey: 'page.home.slideshow.photos.5' },
  'hero-06': { position: { desktop: '50% 50%', mobile: '50% 50%' }, scrim: 0.36, labelKey: 'page.home.slideshow.photos.6' },
  'hero-07': { position: { desktop: '44% 25%', mobile: '42% 45%' }, scrim: 0.35, labelKey: 'page.home.slideshow.photos.7' },
  'hero-08': { position: { desktop: '50% 70%', mobile: '48% 66%' }, scrim: 0.34, labelKey: 'page.home.slideshow.photos.8' },
  'hero-09': { position: { desktop: '54% 48%', mobile: '56% 48%' }, scrim: 0.34, labelKey: 'page.home.slideshow.photos.9' },
  'hero-10': { position: { desktop: '50% 54%', mobile: '52% 54%' }, scrim: 0.36, labelKey: 'page.home.slideshow.photos.10' },
  'hero-11': { position: { desktop: '50% 53%', mobile: '50% 54%' }, scrim: 0.35, labelKey: 'page.home.slideshow.photos.11' },
  'hero-12': { position: { desktop: '50% 61%', mobile: '50% 62%' }, scrim: 0.35, labelKey: 'page.home.slideshow.photos.12' },
  'hero-13': { position: { desktop: '50% 58%', mobile: '50% 60%' }, scrim: 0.35, labelKey: 'page.home.slideshow.photos.13' }
}
