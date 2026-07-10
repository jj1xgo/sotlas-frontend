import store from './store.js'

function generateSessionId () {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback for non-secure contexts, where crypto.randomUUID is unavailable.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

export const maptilerSessionId = generateSessionId()

export function transformRequest (url) {
  let parsed
  try {
    parsed = new URL(url)
  } catch {
    return undefined
  }

  if (parsed.hostname !== 'api.maptiler.com') {
    return undefined
  }

  // Mirrors @maptiler/sdk's own guard: never append key if the URL already has one.
  if (!parsed.searchParams.has('key') && store.state.mapTilerApiKey) {
    parsed.searchParams.append('key', store.state.mapTilerApiKey)
  }
  parsed.searchParams.append('mtsid', maptilerSessionId)

  return { url: parsed.toString() }
}
