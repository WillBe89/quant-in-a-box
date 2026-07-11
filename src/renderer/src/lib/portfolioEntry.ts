import type { Portfolio } from '@renderer/types/market'

/**
 * Zero-friction default for the common case: 0 saved portfolios creates and opens one,
 * exactly 1 opens it directly. With 2+ saved, callers should show a picker instead of
 * guessing which one the user wants (see PortfolioPicker).
 */
export function openDefaultPortfolio(ctx: {
  portfolios: Portfolio[]
  createPortfolio: (name?: string) => string
  openPortfolio: (id: string) => void
}): void {
  const { portfolios, createPortfolio, openPortfolio } = ctx
  if (portfolios.length === 0) {
    openPortfolio(createPortfolio())
    return
  }
  openPortfolio(portfolios[0].id)
}
