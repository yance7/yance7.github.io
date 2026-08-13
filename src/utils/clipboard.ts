export interface LegacyCopyTextArea {
  value: string
  style: Pick<CSSStyleDeclaration, 'position' | 'opacity'>
  select: () => void
  remove: () => void
}

export interface LegacyCopyDocument<T extends LegacyCopyTextArea = LegacyCopyTextArea> {
  createTextarea: () => T
  appendTextarea: (textarea: T) => void
  execCopy: () => boolean
}

export function legacyCopyText<T extends LegacyCopyTextArea>(text: string, documentRef: LegacyCopyDocument<T>) {
  const textarea = documentRef.createTextarea()
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  documentRef.appendTextarea(textarea)
  try {
    textarea.select()
    return documentRef.execCopy()
  } finally {
    textarea.remove()
  }
}
