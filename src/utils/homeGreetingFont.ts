type GreetingFontState = 'ready' | 'fallback'

let readiness: Promise<GreetingFontState> | undefined

export function loadHomeGreetingFont(sample: string): Promise<GreetingFontState> {
  if (readiness) return readiness
  readiness = new Promise(resolve => {
    const deadline = setTimeout(() => resolve('fallback'), 1000)
    const finish = (state: GreetingFontState) => {
      clearTimeout(deadline)
      resolve(state)
    }
    try {
      const font = '400 40px "Yance Hero WenKai"'
      document.fonts.load(font, sample).then(faces => {
        finish(faces.length > 0 && document.fonts.check(font, sample) ? 'ready' : 'fallback')
      }, () => finish('fallback'))
    } catch {
      finish('fallback')
    }
  })
  return readiness
}
