interface IconProps {
  size?: number
  className?: string
}

const base = {
  viewBox: '0 0 24 24',
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const
}

export function IconPortfolio({ size = 18, className }: IconProps): JSX.Element {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <rect x="3" y="8" width="18" height="12" rx="2" />
      <path d="M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M3 13h18" />
    </svg>
  )
}

export function IconLayoutGrid({ size = 18, className }: IconProps): JSX.Element {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="8" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
      <rect x="13" y="13" width="8" height="8" rx="1.5" />
    </svg>
  )
}

export function IconAcademy({ size = 18, className }: IconProps): JSX.Element {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <path d="M12 3 2 8l10 5 10-5-10-5Z" />
      <path d="M6 10.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-5.5" />
      <path d="M20.5 9v5.5" />
    </svg>
  )
}

export function IconSliders({ size = 18, className }: IconProps): JSX.Element {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <path d="M4 6h9M17 6h3" />
      <circle cx="14" cy="6" r="2.2" />
      <path d="M4 12h3M11 12h9" />
      <circle cx="8" cy="12" r="2.2" />
      <path d="M4 18h9M17 18h3" />
      <circle cx="14" cy="18" r="2.2" />
    </svg>
  )
}

export function IconGear({ size = 18, className }: IconProps): JSX.Element {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 13a7.4 7.4 0 0 0 0-2l1.9-1.5-2-3.4-2.2.9a7.6 7.6 0 0 0-1.8-1l-.3-2.3H9l-.3 2.3a7.6 7.6 0 0 0-1.8 1l-2.2-.9-2 3.4L4.6 11a7.4 7.4 0 0 0 0 2l-1.9 1.5 2 3.4 2.2-.9a7.6 7.6 0 0 0 1.8 1l.3 2.3h4.2l.3-2.3a7.6 7.6 0 0 0 1.8-1l2.2.9 2-3.4L19.4 13Z" />
    </svg>
  )
}

export function IconClose({ size = 18, className }: IconProps): JSX.Element {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <path d="M5 5l14 14M19 5 5 19" />
    </svg>
  )
}

export function IconStar({ size = 18, className, filled = false }: IconProps & { filled?: boolean }): JSX.Element {
  return (
    <svg width={size} height={size} className={className} {...base} fill={filled ? 'currentColor' : 'none'}>
      <path d="m12 3 2.6 5.8 6.2.6-4.7 4.2 1.4 6.2L12 16.9l-5.5 2.9 1.4-6.2-4.7-4.2 6.2-.6L12 3Z" />
    </svg>
  )
}

export function IconChevronDown({ size = 14, className }: IconProps): JSX.Element {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

export function IconArrowLeft({ size = 14, className }: IconProps): JSX.Element {
  const mirrored = document.documentElement.dir === 'rtl'
  return (
    <svg
      width={size}
      height={size}
      className={className}
      style={mirrored ? { transform: 'scaleX(-1)' } : undefined}
      {...base}
    >
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </svg>
  )
}

export function IconExternalLink({ size = 14, className }: IconProps): JSX.Element {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <path d="M14 4h6v6" />
      <path d="M20 4 10 14" />
      <path d="M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5" />
    </svg>
  )
}

export function IconInfo({ size = 14, className }: IconProps): JSX.Element {
  return (
    <svg width={size} height={size} className={className} {...base} strokeWidth={2}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.5" />
      <circle cx="12" cy="8" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function IconPlus({ size = 14, className }: IconProps): JSX.Element {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

export function IconStocks({ size = 18, className }: IconProps): JSX.Element {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <path d="M4 19V9M10 19V4M16 19v-6" />
      <path d="M2 19h20" />
    </svg>
  )
}

export function IconCrypto({ size = 18, className }: IconProps): JSX.Element {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 8.5h3.2a1.9 1.9 0 0 1 0 3.8H9.5m0-3.8v7.6m0-3.8h3.6a1.9 1.9 0 0 1 0 3.8H9.5m0-7.6V7m0 9v1.5" />
    </svg>
  )
}

export function IconBond({ size = 18, className }: IconProps): JSX.Element {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 10.5v3M10.9 11.2h2.2M10.9 12.8h2.2" />
      <path d="M6.5 8h.01M17.5 16h.01" />
    </svg>
  )
}

export function IconFx({ size = 18, className }: IconProps): JSX.Element {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <path d="M3 8h13l-3-3M21 16H8l3 3" />
    </svg>
  )
}

export function IconRealEstate({ size = 18, className }: IconProps): JSX.Element {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <path d="M4 11 12 4l8 7" />
      <path d="M6 10v9h12v-9" />
      <path d="M10 19v-5h4v5" />
    </svg>
  )
}

export function IconSparkle({ size = 18, className }: IconProps): JSX.Element {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
      <path d="M12 8a4 4 0 0 0 4 4 4 4 0 0 0-4 4 4 4 0 0 0-4-4 4 4 0 0 0 4-4Z" />
    </svg>
  )
}

export function IconAlertTriangle({ size = 18, className }: IconProps): JSX.Element {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <path d="M10.6 3.9 2.4 18a1.8 1.8 0 0 0 1.55 2.7h16.1A1.8 1.8 0 0 0 21.6 18L13.4 3.9a1.8 1.8 0 0 0-2.8 0Z" />
      <path d="M12 9.5v4" />
      <path d="M12 17h.01" />
    </svg>
  )
}

export function IconGripDots({ size = 14, className }: IconProps): JSX.Element {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <path d="M9 6h.01M9 12h.01M9 18h.01M15 6h.01M15 12h.01M15 18h.01" strokeWidth={2.4} />
    </svg>
  )
}

export function IconExpand({ size = 14, className }: IconProps): JSX.Element {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <path d="M9 4H4v5M15 4h5v5M15 20h5v-5M9 20H4v-5" />
    </svg>
  )
}

export function IconCheck({ size = 14, className }: IconProps): JSX.Element {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <path d="M4 12.5l5 5L20 6" />
    </svg>
  )
}

export function IconFaceGood({ size = 14, className }: IconProps): JSX.Element {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 10.3h.01M15.5 10.3h.01" strokeWidth={2.4} />
      <path d="M8 14.3c1.2 1.4 2.6 2.1 4 2.1s2.8-.7 4-2.1" />
    </svg>
  )
}

export function IconFaceNeutral({ size = 14, className }: IconProps): JSX.Element {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 10.3h.01M15.5 10.3h.01" strokeWidth={2.4} />
      <path d="M8 15.3h8" />
    </svg>
  )
}

export function IconFaceBad({ size = 14, className }: IconProps): JSX.Element {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 10.3h.01M15.5 10.3h.01" strokeWidth={2.4} />
      <path d="M8 16.4c1.2-1.4 2.6-2.1 4-2.1s2.8.7 4 2.1" />
    </svg>
  )
}

export function IconDownload({ size = 18, className }: IconProps): JSX.Element {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <path d="M12 3v12m0 0-4-4m4 4 4-4" />
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </svg>
  )
}

export function IconLock({ size = 14, className }: IconProps): JSX.Element {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      <path d="M12 14.5v2.2" />
    </svg>
  )
}

/* Academy badge glyphs (lib/badgeStyle.ts) — one per Module. Same hand-drawn stroke language
 * as every other icon in this file (viewBox 0 0 24 24, 1.8 stroke, round caps/joins), each set
 * in a circular medallion so they read as "badges" rather than plain feature icons. The Final
 * Exam glyph (a star with laurel flourishes) is deliberately more ornate than the other four so
 * it reads as more prestigious/complete. NOTE: main/certificate.ts renders the printed PDF
 * certificate in Electron's main process and cannot import React/JSX from this renderer file —
 * its BADGE_GLYPHS constant duplicates this same path geometry as plain SVG markup strings and
 * must be kept visually in sync with these components by hand. */

export function IconBadgeAssetTypes({ size = 40, className }: IconProps): JSX.Element {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 15v-4M12 15V7M16 15v-6" />
    </svg>
  )
}

export function IconBadgeTrend({ size = 40, className }: IconProps): JSX.Element {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <circle cx="12" cy="12" r="9" />
      <path d="M7.5 14.5 11 11l2 2 3.5-4" />
      <path d="M14.5 9h2v2" />
    </svg>
  )
}

export function IconBadgeRisk({ size = 40, className }: IconProps): JSX.Element {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <circle cx="12" cy="12" r="9" />
      <path d="M7.8 14.2a4.3 4.3 0 0 1 8.4 0" />
      <path d="M12 14V10" />
    </svg>
  )
}

export function IconBadgeOptions({ size = 40, className }: IconProps): JSX.Element {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v3M12 10.5 9 14M12 10.5l3 3.5M9 14v2M15 14v2" />
    </svg>
  )
}

export function IconBadgeFinal({ size = 40, className }: IconProps): JSX.Element {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <circle cx="12" cy="12" r="9" />
      <path d="m12 6.6 1.5 3.2 3.5.3-2.6 2.4.7 3.6L12 14.4l-3.1 1.7.7-3.6-2.6-2.4 3.5-.3L12 6.6Z" />
      <path d="M5.3 14.8c-1 1.2-1 3.2 0 4.6M18.7 14.8c1 1.2 1 3.2 0 4.6" />
    </svg>
  )
}
