import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ModuleId } from '@renderer/academy/modules'
import { IconDownload } from '@renderer/components/icons/Icons'

const CERTIFICATE_NAME_STORAGE_KEY = 'qiab:certificateName:v1'
const STATUS_CLEAR_MS = 4000

function loadPersistedName(): string {
  try {
    return localStorage.getItem(CERTIFICATE_NAME_STORAGE_KEY) ?? ''
  } catch {
    return ''
  }
}

function savePersistedName(name: string): void {
  try {
    localStorage.setItem(CERTIFICATE_NAME_STORAGE_KEY, name)
  } catch {
    // best-effort persistence; ignore quota/availability errors
  }
}

type Status = 'idle' | 'busy' | 'success' | 'canceled' | 'error'

/** Small inline "Download certificate" control shared by both QuizResults and BadgeShelf —
 *  a text input (pre-filled with the last-used name, still editable per-download) plus a
 *  Generate button. Owns its own open/closed + request lifecycle so both call sites just pass
 *  the already-resolved display data for one earned badge. */
export default function CertificateNamePrompt({
  moduleId,
  moduleTitle,
  earnedAtIso,
  className
}: {
  moduleId: ModuleId
  moduleTitle: string
  earnedAtIso: string
  className?: string
}): JSX.Element {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(() => loadPersistedName())
  const [status, setStatus] = useState<Status>('idle')

  function flashStatus(next: Exclude<Status, 'idle' | 'busy'>): void {
    setStatus(next)
    setTimeout(() => setStatus((cur) => (cur === next ? 'idle' : cur)), STATUS_CLEAR_MS)
  }

  async function handleGenerate(): Promise<void> {
    const trimmed = name.trim()
    if (!trimmed) return
    savePersistedName(trimmed)
    setStatus('busy')
    const result = await window.api
      ?.downloadCertificate({ recipientName: trimmed, moduleId, moduleTitle, earnedAtIso })
      .catch(() => null)
    if (!result) {
      flashStatus('error')
    } else if (result.ok) {
      flashStatus('success')
      setOpen(false)
    } else if (result.canceled) {
      flashStatus('canceled')
    } else {
      flashStatus('error')
    }
  }

  if (!open) {
    return (
      <button className={'certificate-trigger-btn' + (className ? ` ${className}` : '')} onClick={() => setOpen(true)}>
        <IconDownload size={13} />
        {t('academy.certificate.downloadBtn')}
      </button>
    )
  }

  return (
    <div className={'certificate-prompt' + (className ? ` ${className}` : '')}>
      <label className="certificate-prompt-label" htmlFor={`cert-name-${moduleId}`}>
        {t('academy.certificate.nameLabel')}
      </label>
      <div className="certificate-prompt-row">
        <input
          id={`cert-name-${moduleId}`}
          type="text"
          value={name}
          placeholder={t('academy.certificate.namePlaceholder') ?? undefined}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleGenerate()
          }}
        />
        <button
          className="certificate-generate-btn"
          disabled={!name.trim() || status === 'busy'}
          onClick={() => handleGenerate()}
        >
          {t('academy.certificate.generateBtn')}
        </button>
      </div>
      {status !== 'idle' && status !== 'busy' && (
        <span className={'certificate-status' + (status === 'success' ? ' ok' : status === 'error' ? ' err' : '')}>
          {status === 'success'
            ? t('academy.certificate.success')
            : status === 'error'
              ? t('academy.certificate.error')
              : t('academy.certificate.canceled')}
        </span>
      )}
    </div>
  )
}
