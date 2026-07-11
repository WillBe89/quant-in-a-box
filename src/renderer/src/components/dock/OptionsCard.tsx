import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppState } from '@renderer/state/AppStateContext'
import { dataService } from '@renderer/data/dataService'
import CardHead from './CardHead'
import type { DockCardProps } from './dockCardProps'
import type { Asset, OptionQuote } from '@renderer/types/market'

export function useOptionChain(symbol: Asset): OptionQuote[] {
  const [chain, setChain] = useState<OptionQuote[]>([])

  useEffect(() => {
    let cancelled = false
    dataService.getOptionChain(symbol).then((data) => {
      if (!cancelled) setChain(data)
    })
    return () => {
      cancelled = true
    }
  }, [symbol])

  return chain
}

export function OptionsCardBody({ chain }: { chain: OptionQuote[] }): JSX.Element {
  const { t } = useTranslation()
  return (
    <div className="greeks-table">
      <table className="greeks">
        <thead>
          <tr>
            <th>{t('dock.options.strike')}</th>
            <th>Δ</th>
            <th>Γ</th>
            <th>Θ</th>
            <th>{t('dock.options.vega')}</th>
            <th>{t('dock.options.iv')}</th>
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
  )
}

export default function OptionsCard(props: DockCardProps): JSX.Element {
  const { t } = useTranslation()
  const { symbol } = useAppState()
  const chain = useOptionChain(symbol)
  const [collapsed, setCollapsed] = useState(false)

  return (
    <section className={'card' + (collapsed ? ' collapsed' : '')} data-card="options">
      <CardHead
        title={t('dock.options.title')}
        lessonId="greeks"
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        {...props}
      />
      <div className="card-body">
        <OptionsCardBody chain={chain} />
      </div>
    </section>
  )
}
