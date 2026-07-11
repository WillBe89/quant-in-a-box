import { BrowserWindow, dialog } from 'electron'
import { writeFileSync } from 'fs'

/** Mirrors academy/modules.ts's ModuleId — duplicated here (rather than imported) because this
 *  file runs in the Electron main process and cannot import renderer-side TS/JSX modules. */
export type CertificateModuleId = 'assetTypes' | 'trend' | 'risk' | 'options' | 'final'

export interface CertificateRequest {
  recipientName: string
  moduleTitle: string
  moduleId: CertificateModuleId
  /** ISO timestamp of the attempt this badge/certificate is tied to. */
  earnedAtIso: string
}

export interface CertificateSaveResult {
  ok: boolean
  path?: string
  canceled?: boolean
  error?: string
}

/** Badge glyph markup, one per module — must stay visually in sync with the matching
 *  Icon* components in src/renderer/src/components/icons/Icons.tsx (IconBadgeAssetTypes,
 *  IconBadgeTrend, IconBadgeRisk, IconBadgeOptions, IconBadgeFinal). Duplicated as plain SVG
 *  markup strings, not imported, since this main-process file cannot pull in renderer-side
 *  React/JSX - same geometry as those icons, just hand-mirrored into a string. */
const BADGE_GLYPH_PATHS: Record<CertificateModuleId, string> = {
  assetTypes: '<circle cx="12" cy="12" r="9"/><path d="M8 15v-4M12 15V7M16 15v-6"/>',
  trend: '<circle cx="12" cy="12" r="9"/><path d="M7.5 14.5 11 11l2 2 3.5-4"/><path d="M14.5 9h2v2"/>',
  risk: '<circle cx="12" cy="12" r="9"/><path d="M7.8 14.2a4.3 4.3 0 0 1 8.4 0"/><path d="M12 14V10"/>',
  options:
    '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v3M12 10.5 9 14M12 10.5l3 3.5M9 14v2M15 14v2"/>',
  final:
    '<circle cx="12" cy="12" r="9"/><path d="m12 6.6 1.5 3.2 3.5.3-2.6 2.4.7 3.6L12 14.4l-3.1 1.7.7-3.6-2.6-2.4 3.5-.3L12 6.6Z"/><path d="M5.3 14.8c-1 1.2-1 3.2 0 4.6M18.7 14.8c1 1.2 1 3.2 0 4.6"/>'
}

const BADGE_ACCENT: Record<CertificateModuleId, string> = {
  assetTypes: '#2fe0c8',
  trend: '#3ed598',
  risk: '#f5b94b',
  options: '#8c7ef7',
  final: '#c9a227'
}

function badgeSvg(moduleId: CertificateModuleId): string {
  const color = BADGE_ACCENT[moduleId]
  return `<svg viewBox="0 0 24 24" width="96" height="96" fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${BADGE_GLYPH_PATHS[moduleId]}</svg>`
}

/** Strips everything except alphanumerics/dash/space/underscore — mirrors
 *  main/exportData.ts's sanitizeFileNamePart (kept as a small parallel helper here rather than
 *  a forced shared refactor, since exportData.ts's export is xlsx-specific and this module has
 *  no other reason to depend on it). */
export function sanitizeCertificateFileNamePart(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9\- _]/g, '').trim()
  return cleaned || 'certificate'
}

/** Human-readable date for the printed certificate, e.g. "July 11, 2026". Falls back to the
 *  raw ISO string if it doesn't parse, rather than printing "Invalid Date". */
export function formatEarnedDateLabel(earnedAtIso: string): string {
  const d = new Date(earnedAtIso)
  if (Number.isNaN(d.getTime())) return earnedAtIso
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

/** Default save-dialog filename, e.g. "risk-certificate-2026-07-11.pdf". */
export function formatCertificateFilename(moduleTitle: string, earnedAtIso: string): string {
  const d = new Date(earnedAtIso)
  const datePart = Number.isNaN(d.getTime()) ? 'undated' : d.toISOString().slice(0, 10)
  return `${sanitizeCertificateFileNamePart(moduleTitle)}-certificate-${datePart}.pdf`
}

/** Escapes text interpolated into the HTML template so a recipient name containing `<`, `&`,
 *  etc. can't break the markup. */
function escapeHtml(raw: string): string {
  return raw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** Builds the self-contained certificate HTML template. Landscape Letter, bordered layout, the
 *  recipient's name in a large display font, the module/badge name, the earned date, and the
 *  module's own badge glyph as inline SVG. `print-color-adjust: exact` (plus the -webkit-
 *  prefixed form) is required on the colored/background elements — `printBackground: true`
 *  alone is not sufficient; Chromium's print stylesheet otherwise silently strips them. */
export function buildCertificateHtml(req: CertificateRequest): string {
  const accent = BADGE_ACCENT[req.moduleId]
  const name = escapeHtml(req.recipientName)
  const title = escapeHtml(req.moduleTitle)
  const dateLabel = escapeHtml(formatEarnedDateLabel(req.earnedAtIso))

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
  html, body { margin: 0; padding: 0; width: 100%; height: 100%; }
  body {
    font-family: -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif;
    background: #0b0f16;
    color: #e9edf3;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .certificate {
    width: 100%;
    height: 100%;
    border: 14px solid ${accent};
    outline: 1px solid rgba(255,255,255,0.25);
    outline-offset: -22px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 40px;
  }
  .eyebrow { letter-spacing: 3px; text-transform: uppercase; font-size: 14px; color: ${accent}; margin-bottom: 18px; }
  .name { font-size: 52px; font-weight: 700; margin: 6px 0 18px; }
  .module { font-size: 22px; margin-bottom: 6px; }
  .date { font-size: 14px; color: #9aa4b2; margin-bottom: 22px; }
  .glyph { margin-bottom: 10px; }
</style>
</head>
<body>
  <div class="certificate">
    <div class="glyph">${badgeSvg(req.moduleId)}</div>
    <div class="eyebrow">Certificate of Completion</div>
    <div class="name">${name}</div>
    <div class="module">${title}</div>
    <div class="date">Earned ${dateLabel}</div>
  </div>
</body>
</html>`
}

/** Creates a hidden BrowserWindow, loads the certificate template as a data URL, waits for
 *  did-finish-load (skipping this can produce a blank/partial capture), prints to a landscape
 *  Letter-sized PDF buffer, then destroys the window. */
export async function generateCertificatePdf(req: CertificateRequest): Promise<Buffer> {
  const win = new BrowserWindow({ show: false })
  try {
    const html = buildCertificateHtml(req)
    const loaded = new Promise<void>((resolve, reject) => {
      win.webContents.once('did-finish-load', () => resolve())
      win.webContents.once('did-fail-load', (_event, code, description) => {
        reject(new Error(`Certificate template failed to load (${code}): ${description}`))
      })
    })
    await win.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(html)}`)
    await loaded
    const buffer = await win.webContents.printToPDF({
      printBackground: true,
      pageSize: 'Letter',
      landscape: true,
      margins: { marginType: 'none' }
    })
    return buffer
  } finally {
    win.destroy()
  }
}

/** Shows a native save dialog defaulted to `defaultFileName` and, unless the user cancels,
 *  writes `buffer` to wherever they picked — same Buffer-to-dialog-to-writeFileSync shape as
 *  main/exportData.ts's saveWorkbookViaDialog, kept as a small parallel helper here (a PDF save
 *  dialog and an xlsx save dialog differ only in the file-type filter). */
export async function saveCertificateViaDialog(buffer: Buffer, defaultFileName: string): Promise<CertificateSaveResult> {
  try {
    const result = await dialog.showSaveDialog({
      defaultPath: defaultFileName,
      filters: [{ name: 'PDF Document', extensions: ['pdf'] }]
    })
    if (result.canceled || !result.filePath) {
      return { ok: false, canceled: true }
    }
    writeFileSync(result.filePath, buffer)
    return { ok: true, path: result.filePath }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}
