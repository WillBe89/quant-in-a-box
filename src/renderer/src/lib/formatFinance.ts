/** Threshold-based formatter shared by `formatMarketCap`/`formatShareCount` — both operate
 *  directly in millions-space (Finnhub's own convention for these two fields), so callers
 *  never need to convert to raw units first. */
function formatMillions(millions: number, prefix: string): string {
  const abs = Math.abs(millions)
  if (abs >= 1_000_000) return `${prefix}${(millions / 1_000_000).toFixed(2)}T`
  if (abs >= 1_000) return `${prefix}${(millions / 1_000).toFixed(1)}B`
  return `${prefix}${millions.toFixed(1)}M`
}

export function formatMarketCap(millions: number): string {
  return formatMillions(millions, '$')
}

export function formatShareCount(millions: number): string {
  return formatMillions(millions, '')
}
