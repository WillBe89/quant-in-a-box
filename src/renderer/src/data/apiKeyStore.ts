const API_KEYS_STORAGE_KEY = 'qiab:apiKeys:v1'

interface StoredApiKeys {
  finnhub?: string
  twelveData?: string
}

function loadApiKeys(): StoredApiKeys {
  try {
    const raw = localStorage.getItem(API_KEYS_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') return parsed
    }
  } catch {
    // fall through to empty
  }
  return {}
}

function saveApiKeys(keys: StoredApiKeys): void {
  try {
    localStorage.setItem(API_KEYS_STORAGE_KEY, JSON.stringify(keys))
  } catch {
    // best-effort persistence; ignore quota/availability errors
  }
}

/** UI-entered key takes priority; falls back to the build-time .env value so existing dev setups keep working. */
export function getFinnhubKey(): string | undefined {
  return loadApiKeys().finnhub || import.meta.env.VITE_FINNHUB_API_KEY || undefined
}

export function setFinnhubKey(key: string): void {
  saveApiKeys({ ...loadApiKeys(), finnhub: key })
}

export function clearFinnhubKey(): void {
  const keys = loadApiKeys()
  delete keys.finnhub
  saveApiKeys(keys)
}

export function getTwelveDataKey(): string | undefined {
  return loadApiKeys().twelveData || import.meta.env.VITE_TWELVE_DATA_API_KEY || undefined
}

export function setTwelveDataKey(key: string): void {
  saveApiKeys({ ...loadApiKeys(), twelveData: key })
}

export function clearTwelveDataKey(): void {
  const keys = loadApiKeys()
  delete keys.twelveData
  saveApiKeys(keys)
}
