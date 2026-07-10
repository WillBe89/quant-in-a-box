import type { AssetClass } from '@renderer/types/market'
import { useAppState } from '@renderer/state/AppStateContext'

const RAIL_ITEMS: Array<{ id: AssetClass | 'all'; icon: string; label: string }> = [
  { id: 'all', icon: '◎', label: 'All assets' },
  { id: 'stocks', icon: '▤', label: 'Stocks & ETFs' },
  { id: 'crypto', icon: '◈', label: 'Crypto' },
  { id: 'bonds', icon: '≋', label: 'Bonds & fixed income' },
  { id: 'fx', icon: '⇄', label: 'FX & commodities' },
  { id: 're', icon: '⌂', label: 'Real estate (REIT proxy)' }
]

export default function Rail(): JSX.Element {
  const { assetClass, setAssetClass, selectSymbol, openAcademy, openPortfolio, watchlist } = useAppState()

  return (
    <aside className="rail">
      {RAIL_ITEMS.map((item) => (
        <button
          key={item.id}
          className={'rail-btn' + (assetClass === item.id ? ' active' : '')}
          onClick={() => setAssetClass(item.id)}
        >
          {item.icon}
          <span className="lbl">{item.label}</span>
        </button>
      ))}
      <div className="rail-divider" />
      <div className="rail-watch">
        {watchlist.length === 0 && (
          <div className="rail-watch-empty" title="Star a symbol to pin it here">
            ☆
          </div>
        )}
        {watchlist.map((a) => (
          <button key={a.symbol} className="rail-dot" title={`${a.name} — in your watchlist`} onClick={() => selectSymbol(a)}>
            {a.symbol.slice(0, 4)}
          </button>
        ))}
      </div>
      <div className="rail-spacer" />
      <button className="rail-btn" onClick={openPortfolio} title="Your portfolio">
        💼
        <span className="lbl">Your portfolio</span>
      </button>
      <button className="rail-btn rail-learn" onClick={() => openAcademy()} title="Teaching zone">
        🎓
        <span className="lbl">Teaching zone</span>
      </button>
    </aside>
  )
}
