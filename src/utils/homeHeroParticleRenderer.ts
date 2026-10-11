import type { HomeHeroParticle } from './homeHeroParticlePhysics'
import type { HomeHeroParticleScene } from './homeHeroParticleScene'

export interface HomeHeroParticleColors { word: string; field: string; trail: string; ambient: string }
export interface HomeHeroParticleRendererOptions {
  scene: HomeHeroParticleScene
  pixelRatio: number
  colors: HomeHeroParticleColors
  ambient: HomeHeroParticle[]
}
interface Bounds { left: number; top: number; right: number; bottom: number }
const TILE_SIZE = 64

function getHomeHeroParticleTrail(p: HomeHeroParticle) {
  if (p.kind !== 'word') return { x: p.x, y: p.y, length: 0 }
  const dx = p.x - p.homeX
  const dy = p.y - p.homeY
  const displacement = Math.hypot(dx, dy)
  const speed = Math.hypot(p.vx, p.vy)
  if (displacement < 1 || speed < 12) return { x: p.x, y: p.y, length: 0 }
  const x = dx * 0.65 + p.vx * 0.028
  const y = dy * 0.65 + p.vy * 0.028
  const magnitude = Math.hypot(x, y)
  const length = Math.min(24, displacement * 0.5 + speed * 0.022)
  return { x: p.x - x / (magnitude || 1) * length, y: p.y - y / (magnitude || 1) * length, length }
}

export class HomeHeroParticleRenderer {
  private readonly context: CanvasRenderingContext2D
  private readonly master = document.createElement('canvas')
  private readonly masterContext: CanvasRenderingContext2D
  private readonly columns: number
  private readonly rows: number
  private readonly homeTiles = new Map<number, HomeHeroParticle[]>()
  private previousTiles = new Set<number>()
  private readonly staticParticles: HomeHeroParticle[]
  readonly stats = { dirtyTiles: 0, dirtyFraction: 0, fullRestores: 0, cacheCount: 1 }

  constructor(private canvas: HTMLCanvasElement, private options: HomeHeroParticleRendererOptions) {
    const context = canvas.getContext('2d', { alpha: true })
    const masterContext = this.master.getContext('2d', { alpha: true })
    if (!context || !masterContext) throw new Error('HomeHero particle canvas is unavailable')
    this.context = context
    this.masterContext = masterContext
    const { width, height } = options.scene
    this.columns = Math.ceil(width / TILE_SIZE)
    this.rows = Math.ceil(height / TILE_SIZE)
    this.canvas.width = this.master.width = Math.ceil(width * options.pixelRatio)
    this.canvas.height = this.master.height = Math.ceil(height * options.pixelRatio)
    this.context.setTransform(options.pixelRatio, 0, 0, options.pixelRatio, 0, 0)
    this.masterContext.setTransform(options.pixelRatio, 0, 0, options.pixelRatio, 0, 0)
    this.staticParticles = [...options.scene.particles, ...options.ambient]
    for (const p of this.staticParticles) {
      for (const tile of this.tilesFor({ left: p.homeX - 3, top: p.homeY - 3, right: p.homeX + 3, bottom: p.homeY + 3 })) {
        const bucket = this.homeTiles.get(tile)
        if (bucket) bucket.push(p)
        else this.homeTiles.set(tile, [p])
      }
    }
    this.buildMaster()
    this.drawStatic()
  }

  setColors(colors: HomeHeroParticleColors) {
    this.options.colors = colors
    this.buildMaster()
    // The next active draw must restore every tile in the new palette.
    this.previousTiles = new Set(Array.from({ length: this.columns * this.rows }, (_, i) => i))
  }

  drawStatic() {
    const { width, height } = this.options.scene
    this.context.clearRect(0, 0, width, height)
    this.context.drawImage(this.master, 0, 0, this.master.width, this.master.height, 0, 0,
      this.master.width / this.options.pixelRatio, this.master.height / this.options.pixelRatio)
    this.previousTiles.clear()
    this.stats.dirtyTiles = 0
    this.stats.dirtyFraction = 0
  }

  drawActive(particles: readonly HomeHeroParticle[]) {
    if (particles.length === 0) {
      this.drawStatic()
      return
    }
    const active = new Set(particles.map(p => p.id))
    const currentTiles = new Set<number>()
    for (const p of particles) {
      const trail = getHomeHeroParticleTrail(p)
      const bounds = { left: Math.min(p.x, p.homeX, trail.x) - 4, top: Math.min(p.y, p.homeY, trail.y) - 4,
        right: Math.max(p.x, p.homeX, trail.x) + 4, bottom: Math.max(p.y, p.homeY, trail.y) + 4 }
      for (const tile of this.tilesFor(bounds)) {
        currentTiles.add(tile)
      }
    }
    const dirty = new Set([...this.previousTiles, ...currentTiles])
    this.stats.dirtyTiles = dirty.size
    this.stats.dirtyFraction = dirty.size / (this.columns * this.rows)
    // A broad intro may cover most tiles. One full restore is cheaper then.
    if (this.stats.dirtyFraction > 0.6) {
      this.context.clearRect(0, 0, this.options.scene.width, this.options.scene.height)
      this.drawHomes(this.context, this.staticParticles.filter(p => !active.has(p.id)))
      this.drawDynamic(this.context, particles)
      this.stats.fullRestores += 1
    } else {
      const cachedTiles = new Set<number>()
      const changedHomeTiles = new Set<number>()
      const settledHomes = new Map<number, HomeHeroParticle>()
      for (const tile of dirty) {
        const homes = this.homeTiles.get(tile) ?? []
        if (homes.some(p => active.has(p.id))) {
          changedHomeTiles.add(tile)
          for (const p of homes) if (!active.has(p.id)) settledHomes.set(p.id, p)
        } else cachedTiles.add(tile)
      }
      // Union clips retain local restoration while submitting each dot only
      // once, even when its home, displacement and trail span several tiles.
      this.clipTiles(dirty, () => {
        this.context.clearRect(0, 0, this.options.scene.width, this.options.scene.height)
        if (cachedTiles.size) this.clipTiles(cachedTiles, () => {
          this.context.drawImage(this.master, 0, 0, this.master.width, this.master.height, 0, 0,
            this.master.width / this.options.pixelRatio, this.master.height / this.options.pixelRatio)
        })
        if (changedHomeTiles.size) this.clipTiles(changedHomeTiles, () => {
          this.drawHomes(this.context, [...settledHomes.values()])
        })
        this.drawDynamic(this.context, particles)
      })
    }
    this.previousTiles = currentTiles
  }

  private clipTiles(tiles: ReadonlySet<number>, draw: () => void) {
    this.context.save()
    this.context.beginPath()
    for (const tile of tiles) {
      const x = tile % this.columns * TILE_SIZE
      const y = Math.floor(tile / this.columns) * TILE_SIZE
      this.context.rect(x, y, Math.min(TILE_SIZE, this.options.scene.width - x), Math.min(TILE_SIZE, this.options.scene.height - y))
    }
    this.context.clip()
    try { draw() } finally {
      this.context.restore()
    }
  }

  destroy() {
    this.canvas.width = 0
    this.master.width = 0
    this.previousTiles.clear()
    this.homeTiles.clear()
  }

  private tilesFor(bounds: Bounds) {
    const tiles: number[] = []
    const left = Math.max(0, Math.floor(bounds.left / TILE_SIZE))
    const right = Math.min(this.columns - 1, Math.floor(bounds.right / TILE_SIZE))
    const top = Math.max(0, Math.floor(bounds.top / TILE_SIZE))
    const bottom = Math.min(this.rows - 1, Math.floor(bounds.bottom / TILE_SIZE))
    for (let y = top; y <= bottom; y += 1) for (let x = left; x <= right; x += 1) tiles.push(y * this.columns + x)
    return tiles
  }

  private buildMaster() {
    this.masterContext.clearRect(0, 0, this.options.scene.width, this.options.scene.height)
    this.drawHomes(this.masterContext, this.staticParticles)
  }

  private drawHomes(context: CanvasRenderingContext2D, particles: readonly HomeHeroParticle[]) {
    for (const kind of ['field', 'word', 'ambient'] as const) {
      context.fillStyle = this.options.colors[kind]
      context.globalAlpha = kind === 'field' ? 0.42 : kind === 'ambient' ? 0.24 : 1
      const radius = kind === 'word' ? this.options.scene.gridStep * 0.34 : this.options.scene.gridStep * 0.19
      context.beginPath()
      for (const p of particles) {
        if (kind === 'ambient' ? p.id >= 0 : p.id < 0 || p.kind !== kind) continue
        context.moveTo(p.homeX + radius, p.homeY)
        context.arc(p.homeX, p.homeY, radius, 0, Math.PI * 2)
      }
      context.fill()
    }
    context.globalAlpha = 1
  }

  private drawDynamic(context: CanvasRenderingContext2D, particles: readonly HomeHeroParticle[]) {
    context.strokeStyle = this.options.colors.trail
    context.lineWidth = 1.05
    context.lineCap = 'round'
    context.globalAlpha = 0.65
    context.beginPath()
    for (const p of particles) {
      const trail = getHomeHeroParticleTrail(p)
      if (trail.length < 1) continue
      context.moveTo(trail.x, trail.y)
      context.lineTo(p.x, p.y)
    }
    context.stroke()
    for (const kind of ['field', 'word', 'ambient'] as const) {
      context.fillStyle = this.options.colors[kind]
      context.globalAlpha = kind === 'field' ? 0.42 : kind === 'ambient' ? 0.24 : 1
      const radius = this.options.scene.gridStep * (kind === 'word' ? 0.34 : 0.19)
      context.beginPath()
      for (const p of particles) {
        if (kind === 'ambient' ? p.id >= 0 : p.id < 0 || p.kind !== kind) continue
        context.moveTo(p.x + radius, p.y)
        context.arc(p.x, p.y, radius, 0, Math.PI * 2)
      }
      context.fill()
    }
    context.globalAlpha = 1
  }
}
