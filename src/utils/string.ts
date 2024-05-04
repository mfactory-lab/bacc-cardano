/**
 * Checks if a string is a valid UTF-8 string.
 * @param bytes
 */
export function isValidUtf8(bytes: ArrayBufferLike) {
  const decoder = new TextDecoder('utf8', { fatal: true })
  try {
    decoder.decode(bytes)
  } catch {
    return false
  }
  return true
}
