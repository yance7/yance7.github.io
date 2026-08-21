export interface RgbColor {
  r: number
  g: number
  b: number
}

export function parseHexColor(value: string): RgbColor {
  const match = /^#([0-9a-f]{6})$/i.exec(value.trim())
  if (!match) throw new Error(`Expected a six-digit hex color, received: ${value}`)

  const hex = match[1]
  if (!hex) throw new Error(`Expected a six-digit hex color, received: ${value}`)
  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16)
  }
}

function relativeLuminance(color: RgbColor): number {
  const linearize = (channel: number) => {
    const srgb = channel / 255
    return srgb <= .03928 ? srgb / 12.92 : ((srgb + .055) / 1.055) ** 2.4
  }

  return .2126 * linearize(color.r) + .7152 * linearize(color.g) + .0722 * linearize(color.b)
}

export function getContrastRatio(foreground: string, background: string): number {
  const foregroundLuminance = relativeLuminance(parseHexColor(foreground))
  const backgroundLuminance = relativeLuminance(parseHexColor(background))
  const lighter = Math.max(foregroundLuminance, backgroundLuminance)
  const darker = Math.min(foregroundLuminance, backgroundLuminance)
  return (lighter + .05) / (darker + .05)
}
