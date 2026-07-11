import { describe, expect, it } from 'vitest'
import {
  buildCertificateHtml,
  formatCertificateFilename,
  formatEarnedDateLabel,
  sanitizeCertificateFileNamePart
} from './certificate'

// This file covers only certificate.ts's pure helpers. generateCertificatePdf/
// saveCertificateViaDialog orchestrate a real Electron BrowserWindow and dialog.showSaveDialog -
// not unit-testable in plain Node/vitest, so they need a live Electron run to verify instead.

describe('sanitizeCertificateFileNamePart', () => {
  it('strips characters outside alphanumerics/dash/space/underscore', () => {
    expect(sanitizeCertificateFileNamePart('Risk & Portfolio!')).toBe('Risk  Portfolio')
  })

  it('falls back to "certificate" for an empty/fully-stripped input', () => {
    expect(sanitizeCertificateFileNamePart('***')).toBe('certificate')
    expect(sanitizeCertificateFileNamePart('')).toBe('certificate')
  })

  it('trims surrounding whitespace', () => {
    expect(sanitizeCertificateFileNamePart('  Trend & Momentum  ')).toBe('Trend  Momentum')
  })
})

describe('formatEarnedDateLabel', () => {
  it('formats an ISO date as a readable long-form date', () => {
    expect(formatEarnedDateLabel('2026-07-11T12:00:00.000Z')).toBe('July 11, 2026')
  })

  it('falls back to the raw string for an unparseable date rather than "Invalid Date"', () => {
    expect(formatEarnedDateLabel('not-a-date')).toBe('not-a-date')
  })
})

describe('formatCertificateFilename', () => {
  it('builds a sanitized, date-stamped .pdf filename', () => {
    expect(formatCertificateFilename('Risk & Portfolio', '2026-07-11T12:00:00.000Z')).toBe(
      'Risk  Portfolio-certificate-2026-07-11.pdf'
    )
  })

  it('uses "undated" for an unparseable date rather than crashing', () => {
    expect(formatCertificateFilename('Final Exam', 'not-a-date')).toBe('Final Exam-certificate-undated.pdf')
  })
})

describe('buildCertificateHtml', () => {
  const req = {
    recipientName: 'Ada Lovelace',
    moduleTitle: 'Risk & Portfolio',
    moduleId: 'risk' as const,
    earnedAtIso: '2026-07-11T12:00:00.000Z'
  }

  it('includes the recipient name, module title, and formatted date', () => {
    const html = buildCertificateHtml(req)
    expect(html).toContain('Ada Lovelace')
    expect(html).toContain('Risk &amp; Portfolio')
    expect(html).toContain('July 11, 2026')
  })

  it('escapes HTML-significant characters in the recipient name', () => {
    const html = buildCertificateHtml({ ...req, recipientName: '<script>alert(1)</script>' })
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('sets print-color-adjust: exact (both prefixed and unprefixed) so backgrounds/borders survive printToPDF', () => {
    const html = buildCertificateHtml(req)
    expect(html).toContain('print-color-adjust: exact')
    expect(html).toContain('-webkit-print-color-adjust: exact')
  })

  it('embeds an inline SVG badge glyph', () => {
    const html = buildCertificateHtml(req)
    expect(html).toContain('<svg')
    expect(html).toContain('</svg>')
  })

  it('renders a different accent color per module id', () => {
    const riskHtml = buildCertificateHtml({ ...req, moduleId: 'risk' })
    const finalHtml = buildCertificateHtml({ ...req, moduleId: 'final' })
    expect(riskHtml).not.toBe(finalHtml)
  })
})
