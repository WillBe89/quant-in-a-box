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
  return (
    <svg width={size} height={size} className={className} {...base}>
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
