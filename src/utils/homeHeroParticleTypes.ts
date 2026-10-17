export interface HomeHeroParticleTarget {
  id: number
  homeX: number
  homeY: number
  x: number
  y: number
  vx: number
  vy: number
  row: number
  column: number
  settledForMs: number
  opacity?: number
}

export type HomeHeroParticle = HomeHeroParticleTarget

export interface HomeHeroParticleScene {
  width: number
  height: number
  gridStep: number
  particles: HomeHeroParticleTarget[]
  sampledCount: number
  cellSize: number
  cells: Map<string, number[]>
}

export interface HomeHeroGlyphLayout {
  fontSize: number
  x: number
  baseline: number
  bounds: { left: number; top: number; width: number; height: number }
}
