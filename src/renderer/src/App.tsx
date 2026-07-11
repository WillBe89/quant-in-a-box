import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { MotionConfig } from 'motion/react'
import { AppStateProvider, useAppState } from '@renderer/state/AppStateContext'
import Topbar from '@renderer/components/layout/Topbar'
import Rail from '@renderer/components/layout/Rail'
import Workspace from '@renderer/components/layout/Workspace'
import Dock from '@renderer/components/layout/Dock'
import ResizeHandle from '@renderer/components/layout/ResizeHandle'
import TickerTape from '@renderer/components/layout/TickerTape'
import AcademyPanel from '@renderer/academy/AcademyPanel'
import PortfolioWorkspace from '@renderer/components/portfolio/PortfolioWorkspace'
import PortfolioOverviewPanel from '@renderer/components/portfolio/PortfolioOverviewPanel'
import CustomizePanel from '@renderer/components/customize/CustomizePanel'
import DockCardOverlay from '@renderer/components/dock/DockCardOverlay'
import '@renderer/components/layout/layout.css'

function Shell(): JSX.Element {
  const { t } = useTranslation()
  const { theme, dockWidthPx, setDockWidthPx, glassTiers } = useAppState()

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    document.documentElement.setAttribute('data-glass-panels', String(glassTiers.panels))
    document.documentElement.setAttribute('data-glass-chrome', String(glassTiers.chrome))
    document.documentElement.setAttribute('data-glass-chart', String(glassTiers.chart))
  }, [glassTiers])

  return (
    <div className="app">
      <Topbar />
      <div className="body" style={{ ['--dock-width' as string]: `${dockWidthPx}px` }}>
        <Rail />
        <Workspace />
        <ResizeHandle
          axis="horizontal"
          value={dockWidthPx}
          onChange={setDockWidthPx}
          min={260}
          max={520}
          invert
          ariaLabel={t('workspace.resizeDock') ?? 'Resize dashboard width'}
        />
        <Dock />
      </div>
      <TickerTape />
      <AcademyPanel />
      <PortfolioWorkspace />
      <PortfolioOverviewPanel />
      <CustomizePanel />
      <DockCardOverlay />
    </div>
  )
}

export default function App(): JSX.Element {
  return (
    <MotionConfig reducedMotion="user">
      <AppStateProvider>
        <Shell />
      </AppStateProvider>
    </MotionConfig>
  )
}
