export function isValidUtf8(bytes: AllowSharedBufferSource) {
  const decoder = new TextDecoder('utf8', { fatal: true })
  try {
    decoder.decode(bytes)
  } catch {
    return false
  }
  return true
}
