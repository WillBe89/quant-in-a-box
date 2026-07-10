import RiskCard from '@renderer/components/dock/RiskCard'
import OptionsCard from '@renderer/components/dock/OptionsCard'
import NewsCard from '@renderer/components/dock/NewsCard'

export default function Dock(): JSX.Element {
  return (
    <aside className="dock">
      <RiskCard />
      <OptionsCard />
      <NewsCard />
    </aside>
  )
}
