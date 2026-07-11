import type { Asset } from '@renderer/types/market'

/**
 * Ranks matches so an exact/prefix symbol hit (e.g. "SOL" -> the Solana coin) always
 * outranks a long-tail stock/ETF whose name merely contains the query as a substring
 * (e.g. "... Solutions Inc."). With ~11k+ stock entries, unranked substring filtering
 * lets those crowd out the asset the user actually meant within the first few results.
 */
export function searchAssets(assets: Asset[], query: string, limit = 6): Asset[] {
  const q = query.trim().toLowerCase()
  if (!q) return []

  const scored: Array<{ asset: Asset; score: number }> = []
  for (const asset of assets) {
    const symbol = asset.symbol.toLowerCase()
    const name = asset.name.toLowerCase()
    let score: number
    if (symbol === q) score = 0
    else if (symbol.startsWith(q)) score = 1
    else if (name.startsWith(q)) score = 2
    else if (symbol.includes(q)) score = 3
    else if (name.includes(q)) score = 4
    else continue
    scored.push({ asset, score })
  }

  scored.sort((a, b) => a.score - b.score)
  return scored.slice(0, limit).map((s) => s.asset)
}
