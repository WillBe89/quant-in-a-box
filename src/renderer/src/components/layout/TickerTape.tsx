import { ALL_ASSETS } from '@renderer/data/mockData'

export default function TickerTape(): JSX.Element {
  const doubled = [...ALL_ASSETS, ...ALL_ASSETS]
  return (
    <footer className="ticker">
      <div className="ticker-track">
        {doubled.map((a, i) => {
          const up = a.changePct >= 0
          return (
            <div className="tick tnum" key={`${a.symbol}-${i}`}>
              <span className="t-sym">{a.symbol}</span>
              <span>{a.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              <span className={'t-chg ' + (up ? 'up' : 'down')}>
                {up ? '+' : ''}
                {a.changePct.toFixed(2)}%
              </span>
            </div>
          )
        })}
      </div>
    </footer>
  )
}
