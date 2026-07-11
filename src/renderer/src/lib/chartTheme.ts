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
  gainAreaTop: string
  gainAreaBottom: string
  lossAreaTop: string
  lossAreaBottom: string
  candleBorderUp: string
  candleBorderDown: string
}

const DARK: ChartColors = {
  text: '#8c96a6',
  border: 'rgba(232, 236, 242, 0.08)',
  gain: '#3ed598',
  loss: '#fb7195',
  accentA: '#2fe0c8',
  accentB: '#8c7ef7',
  gainAreaTop: 'rgba(62, 213, 152, 0.32)',
  gainAreaBottom: 'rgba(62, 213, 152, 0.04)',
  lossAreaTop: 'rgba(251, 113, 149, 0.32)',
  lossAreaBottom: 'rgba(251, 113, 149, 0.04)',
  // Darker/richer than the fill so candle bodies read with a visible edge rather than a flat block.
  candleBorderUp: '#1f8f63',
  candleBorderDown: '#c8375c'
}

const LIGHT: ChartColors = {
  text: '#5b6472',
  border: 'rgba(19, 23, 34, 0.09)',
  gain: '#0e9a54',
  loss: '#d6335a',
  accentA: '#0ba89a',
  accentB: '#6b5ce0',
  gainAreaTop: 'rgba(14, 154, 84, 0.28)',
  gainAreaBottom: 'rgba(14, 154, 84, 0.03)',
  lossAreaTop: 'rgba(214, 51, 90, 0.28)',
  lossAreaBottom: 'rgba(214, 51, 90, 0.03)',
  candleBorderUp: '#0a7943',
  candleBorderDown: '#a52547'
}

export function chartColors(theme: 'dark' | 'light'): ChartColors {
  return theme === 'dark' ? DARK : LIGHT
}
