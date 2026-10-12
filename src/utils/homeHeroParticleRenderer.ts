import type { HomeHeroParticle } from './homeHeroParticlePhysics'
import type { HomeHeroParticleScene } from './homeHeroParticleScene'

export interface HomeHeroParticleColors { word: string }
export interface HomeHeroParticleRendererOptions {
  scene: HomeHeroParticleScene
  pixelRatio: number
  colors: HomeHeroParticleColors
}

const DOT_RADIUS = 0.8 // 1.6 CSS px diameter, independent of mask sampling.

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
    this.canvas.width = this.master.width = Math.ceil(width * options.pixelRatio)
    this.canvas.height = this.master.height = Math.ceil(height * options.pixelRatio)
    this.context.setTransform(options.pixelRatio, 0, 0, options.pixelRatio, 0, 0)
    this.masterContext.setTransform(options.pixelRatio, 0, 0, options.pixelRatio, 0, 0)
    this.buildMaster()
    this.drawStatic()
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
    if (!particles.length) {
      this.drawStatic()
      return
    }
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
    context.fillStyle = this.options.colors.word
    context.beginPath()
    for (const p of particles) {
      const x = home ? p.homeX : p.x
      const y = home ? p.homeY : p.y
      context.moveTo(x + DOT_RADIUS, y)
      context.arc(x, y, DOT_RADIUS, 0, Math.PI * 2)
    }
    context.fill()
  }
}
