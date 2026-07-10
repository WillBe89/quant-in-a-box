import { useEffect } from 'react'
import { AppStateProvider, useAppState } from '@renderer/state/AppStateContext'
import Topbar from '@renderer/components/layout/Topbar'
import Rail from '@renderer/components/layout/Rail'
import Workspace from '@renderer/components/layout/Workspace'
import Dock from '@renderer/components/layout/Dock'
import TickerTape from '@renderer/components/layout/TickerTape'
import AcademyPanel from '@renderer/academy/AcademyPanel'
import '@renderer/components/layout/layout.css'

function Shell(): JSX.Element {
  const { theme } = useAppState()

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  return (
    <div className="app">
      <Topbar />
      <div className="body">
        <Rail />
        <Workspace />
        <Dock />
      </div>
      <TickerTape />
      <AcademyPanel />
    </div>
  )
}

export default function App(): JSX.Element {
  return (
    <AppStateProvider>
      <Shell />
    </AppStateProvider>
  )
}
