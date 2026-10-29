export function createHeroGlyphFontLoader(fonts: Pick<FontFaceSet, 'load' | 'add'>, createFace: () => FontFace) {
  let readiness: Promise<void> | undefined
  return () => {
    if (!readiness) {
      readiness = (async () => {
        const faces = await fonts.load('400 100px Amiri, serif', 'YANCE')
        if (faces.some(face => face.family.replace(/["']/g, '').toLowerCase() === 'amiri' && face.status === 'loaded')) return
        const face = await createFace().load()
        fonts.add(face)
      })().catch(error => {
        readiness = undefined
        throw error
      })
    }
    return readiness
  }
}
