import type { HomeHeroParticle } from './homeHeroParticlePhysics'
import type { HomeHeroParticleScene } from './homeHeroParticleScene'
import { getMimoParticleAppearance } from './mimoParticleModel'
import { parseHexColor } from './contrast'

export interface HomeHeroParticleColors { start: string; end: string }
export interface HomeHeroParticleRendererOptions {
  scene: HomeHeroParticleScene
  pixelRatio: number
  colors: HomeHeroParticleColors
}

const DOT_SIZE = 1.8

function parseColor(value: string): number[] {
  const hex = value.trim().match(/^#([\da-f]{3}|[\da-f]{6})$/i)?.[1]
  if (hex) {
    const expanded = hex.length === 3 ? [...hex].map(channel => channel + channel).join('') : hex
    const { r, g, b } = parseHexColor(`#${expanded}`)
    return [r, g, b]
  }
  const rgb = value.trim().match(/^rgb\(\s*(\d+(?:\.\d+)?)\s*(?:,\s*|\s+)(\d+(?:\.\d+)?)\s*(?:,\s*|\s+)(\d+(?:\.\d+)?)\s*\)$/i)
  if (rgb) {
    const channels = rgb.slice(1).map(Number)
    if (channels.every(channel => channel >= 0 && channel <= 255)) return channels
  }
  throw new Error(`Unsupported HomeHero particle color: ${value}`)
}

export class HomeHeroParticleRenderer {
  private readonly context: CanvasRenderingContext2D
  private readonly master = document.createElement('canvas')
  private readonly masterContext: CanvasRenderingContext2D
  private colorCache: string[] = []
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
    this.setColors(options.colors)
  }

  setColors(colors: HomeHeroParticleColors) {
    this.options.colors = colors
    const start = parseColor(colors.start)
    const end = parseColor(colors.end)
    this.colorCache = this.options.scene.particles.map((point, index) => {
      const { blend } = getMimoParticleAppearance(index, point.homeX, this.options.scene.width)
      return `rgb(${start.map((channel, i) => Math.round(channel + (end[i]! - channel) * blend)).join(',')})`
    })
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
    let previousColor: string | undefined
    let previousAlpha: number | undefined
    for (let index = 0; index < particles.length; index++) {
      const p = particles[index]!
      const x = home ? p.homeX : p.x
      const y = home ? p.homeY : p.y
      const color = this.colorCache[index]!
      const alpha = home ? 1 : p.opacity ?? 1
      // Keep the original point order and pixels; avoid redundant native state
      // assignments for consecutive dots that already use the same values.
      if (color !== previousColor) context.fillStyle = color
      if (alpha !== previousAlpha) context.globalAlpha = alpha
      previousColor = color
      previousAlpha = alpha
      context.fillRect(x - DOT_SIZE / 2, y - DOT_SIZE / 2, DOT_SIZE, DOT_SIZE)
    }
    context.globalAlpha = 1
  }
}
