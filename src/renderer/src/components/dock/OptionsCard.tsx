import { useEffect, useState } from 'react'
import { useAppState } from '@renderer/state/AppStateContext'
import { dataService } from '@renderer/data/dataService'
import CardHead from './CardHead'
import type { OptionQuote } from '@renderer/types/market'

export default function OptionsCard(): JSX.Element {
  const { symbol } = useAppState()
  const [chain, setChain] = useState<OptionQuote[]>([])
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    let cancelled = false
    dataService.getOptionChain(symbol).then((data) => {
      if (!cancelled) setChain(data)
    })
    return () => {
      cancelled = true
    }
  }, [symbol])

  return (
    <section className={'card' + (collapsed ? ' collapsed' : '')} data-card="options">
      <CardHead title="Options · Greeks" lessonId="greeks" collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <div className="card-body">
        <div className="greeks-table">
          <table className="greeks">
            <thead>
              <tr>
                <th>Strike</th>
                <th>Δ</th>
                <th>Γ</th>
                <th>Θ</th>
                <th>Vega</th>
                <th>IV</th>
              </tr>
            </thead>
            <tbody>
              {chain.map((o) => (
                <tr key={o.strike}>
                  <td>{o.strike.toFixed(0)}C</td>
                  <td>{o.delta.toFixed(2)}</td>
                  <td>{o.gamma.toFixed(3)}</td>
                  <td>{o.theta.toFixed(2)}</td>
                  <td>{o.vega.toFixed(2)}</td>
                  <td>{(o.impliedVol * 100).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
