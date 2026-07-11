import { useMemo, useState } from 'react'
import type { Asset } from '@renderer/types/market'
import { ALL_ASSETS } from '@renderer/data/mockData'
import { searchAssets } from '@renderer/lib/assetSearch'

/**
 * Reusable asset search box, lifted out of Topbar (which was the original, always-visible
 * home for this exact search-box/search-results markup). Deliberately has no click-outside
 * handling of its own — callers that show it inside a dismissible popover own that behavior
 * (see lib/useDismissablePopover.ts) so this component works unmodified in both contexts.
 */
export default function AssetSearchBox({
  onSelect,
  placeholder,
  autoFocus
}: {
  onSelect: (asset: Asset) => void
  placeholder: string
  autoFocus?: boolean
}): JSX.Element {
  const [query, setQuery] = useState('')
  const matches = useMemo(() => searchAssets(ALL_ASSETS, query), [query])

  return (
    <div className="search-box">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.3-4.3" />
      </svg>
      <input
        type="text"
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus={autoFocus}
      />
      {matches.length > 0 && (
        <div className="search-results">
          {matches.map((a) => (
            <button
              key={a.symbol}
              className="search-result"
              onClick={() => {
                onSelect(a)
                setQuery('')
              }}
            >
              <span className="sr-sym">{a.symbol}</span>
              <span className="sr-name">{a.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
