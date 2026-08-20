const closingPunctuation = new Set('，。！？；：、…）》」』”’),.;:!?]}'.split(''))

export function splitLyricChars(value: string) {
  const chunks: string[] = []
  for (const char of value) {
    if (closingPunctuation.has(char) && chunks.length > 0) {
      chunks[chunks.length - 1] += char
    } else {
      chunks.push(char)
    }
  }
  return chunks
}
