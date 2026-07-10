/**
 * Explicit color values mirroring styles/theme.css, keyed by theme.
 * The chart canvas can't rely on reading CSS custom properties off the DOM here:
 * React fires effects child-before-parent, so a chart effect keyed on `theme` would
 * run before the ancestor effect that flips `data-theme` on <html>, reading stale colors.
 */
export interface ChartColors {
  text: string
  border: string
  gain: string
  loss: string
  accentA: string
  accentB: string
}

const DARK: ChartColors = {
  text: '#8c96a6',
  border: 'rgba(232, 236, 242, 0.08)',
  gain: '#3ed598',
  loss: '#fb7195',
  accentA: '#2fe0c8',
  accentB: '#8c7ef7'
}

const LIGHT: ChartColors = {
  text: '#5b6472',
  border: 'rgba(19, 23, 34, 0.09)',
  gain: '#0e9a54',
  loss: '#d6335a',
  accentA: '#0ba89a',
  accentB: '#6b5ce0'
}

export function chartColors(theme: 'dark' | 'light'): ChartColors {
  return theme === 'dark' ? DARK : LIGHT
}
