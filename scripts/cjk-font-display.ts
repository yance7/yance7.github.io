type FontFaceRule = {
  walkDecls: (property: string, callback: (declaration: { value: string }) => void) => void
}

type PostcssRoot = {
  walkAtRules: (name: string, callback: (rule: FontFaceRule) => void) => void
}

const optionalCjkFamilies = new Set(['Noto Sans SC Variable', 'Noto Sans HK Variable'])

export function getCjkFontDisplay(fontFamily: string, fontDisplay: string) {
  if (fontDisplay !== 'swap' || !optionalCjkFamilies.has(fontFamily)) return fontDisplay
  return 'optional'
}

export function optionalCjkFontDisplayPostcssPlugin() {
  return {
    postcssPlugin: 'optional-cjk-font-display',
    Once(root: PostcssRoot) {
      root.walkAtRules('font-face', (rule) => {
        let fontFamily = ''
        rule.walkDecls('font-family', (declaration) => {
          fontFamily = declaration.value.replace(/^['"]|['"]$/g, '')
        })
        if (!optionalCjkFamilies.has(fontFamily)) return

        rule.walkDecls('font-display', (declaration) => {
          declaration.value = getCjkFontDisplay(fontFamily, declaration.value)
        })
      })
    }
  }
}
