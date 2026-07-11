import { app, safeStorage } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'fs'

const KEY_FILE_NAME = 'anthropic-key.enc'

function keyFilePath(): string {
  return join(app.getPath('userData'), KEY_FILE_NAME)
}

/** In-memory cache, populated once at startup and kept in sync on every save/clear —
 *  this is what aiInsights.ts actually reads, never the file or `process.env` directly. */
let cachedKey: string | null = null

/** Call once from `app.whenReady()`, before any AI IPC handler is registered. Precedence:
 *  a previously-saved encrypted key wins over `.env`'s ANTHROPIC_API_KEY (which stays as
 *  the fallback for dev/CI setups that never touch the Customize UI). */
export function loadAnthropicKeyIntoMemory(): void {
  try {
    const path = keyFilePath()
    if (existsSync(path) && safeStorage.isEncryptionAvailable()) {
      const encrypted = readFileSync(path)
      cachedKey = safeStorage.decryptString(encrypted)
      return
    }
  } catch {
    // corrupt/unreadable file — fall through to the .env fallback rather than crash
  }
  cachedKey = process.env.ANTHROPIC_API_KEY || null
}

export function getAnthropicKey(): string | null {
  return cachedKey
}

export function saveAnthropicKey(key: string): { ok: boolean; reason?: string } {
  const trimmed = key.trim()
  if (!trimmed) return { ok: false, reason: 'empty key' }
  if (!safeStorage.isEncryptionAvailable()) {
    // Most common on Linux without a keyring backend (gnome-keyring/kwallet) available —
    // refuse rather than silently write the key to disk in plaintext.
    return { ok: false, reason: 'OS-level encryption is unavailable on this machine' }
  }
  try {
    writeFileSync(keyFilePath(), safeStorage.encryptString(trimmed))
    cachedKey = trimmed
    return { ok: true }
  } catch (e) {
    return { ok: false, reason: (e as Error).message }
  }
}

export function clearAnthropicKey(): void {
  cachedKey = null
  try {
    const path = keyFilePath()
    if (existsSync(path)) unlinkSync(path)
  } catch {
    // best-effort; if the file can't be removed the in-memory key is already cleared
  }
}
