import type { HomeHeroParticle } from './homeHeroParticlePhysics'
import type { HomeHeroParticleScene } from './homeHeroParticleScene'
import { getMimoParticleAppearance } from './mimoParticleModel'

export interface HomeHeroParticleColors { word: string }
export interface HomeHeroParticleRendererOptions {
  scene: HomeHeroParticleScene
  pixelRatio: number
  colors: HomeHeroParticleColors
}

const DOT_SIZE = 1.8

export class HomeHeroParticleRenderer {
  private readonly context: CanvasRenderingContext2D
  private readonly master = document.createElement('canvas')
  private readonly masterContext: CanvasRenderingContext2D
  readonly stats = { activeDraws: 0, cacheCount: 1 }

  constructor(private canvas: HTMLCanvasElement, private options: HomeHeroParticleRendererOptions) {
    const context = canvas.getContext('2d', { alpha: true })
    const masterContext = this.master.getContext('2d', { alpha: true })
    if (!context || !masterContext) throw new Error('HomeHero particle canvas is unavailable')
    this.context = context
    this.masterContext = masterContext
    const { width, height } = options.scene
    this.canvas.width = this.master.width = Math.floor(width * options.pixelRatio)
    this.canvas.height = this.master.height = Math.floor(height * options.pixelRatio)
    this.context.setTransform(options.pixelRatio, 0, 0, options.pixelRatio, 0, 0)
    this.masterContext.setTransform(options.pixelRatio, 0, 0, options.pixelRatio, 0, 0)
    this.buildMaster()
  }

  setColors(colors: HomeHeroParticleColors) {
    this.options.colors = colors
    this.buildMaster()
  }

  drawStatic() {
    const { width, height } = this.options.scene
    this.context.clearRect(0, 0, width, height)
    this.context.drawImage(this.master, 0, 0, this.master.width, this.master.height, 0, 0,
      this.master.width / this.options.pixelRatio, this.master.height / this.options.pixelRatio)
  }

  drawActive(particles: readonly HomeHeroParticle[]) {
    const { width, height, particles: glyph } = this.options.scene
    this.context.clearRect(0, 0, width, height)
    // Measurements favor one current-position batch for the dense glyph.
    // Every dot is submitted once, with no residual trail.
    this.drawPoints(this.context, glyph, false)
    this.stats.activeDraws += 1
  }

  destroy() {
    this.canvas.width = 0
    this.master.width = 0
  }

  private buildMaster() {
    this.masterContext.clearRect(0, 0, this.options.scene.width, this.options.scene.height)
    this.drawPoints(this.masterContext, this.options.scene.particles, true)
  }

  private drawPoints(context: CanvasRenderingContext2D, particles: readonly HomeHeroParticle[], home: boolean) {
    for (const [index, p] of particles.entries()) {
      const x = home ? p.homeX : p.x
      const y = home ? p.homeY : p.y
      context.fillStyle = p.color ?? getMimoParticleAppearance(index, p.homeX, this.options.scene.width).color
      context.globalAlpha = home ? 1 : p.opacity ?? 1
      context.fillRect(x - DOT_SIZE / 2, y - DOT_SIZE / 2, DOT_SIZE, DOT_SIZE)
    }
    context.globalAlpha = 1
  }
}
