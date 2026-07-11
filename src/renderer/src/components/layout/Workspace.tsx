import { useTranslation } from 'react-i18next'
import { useAppState, type LayoutTemplateId } from '@renderer/state/AppStateContext'
import ChartSlot from './ChartSlot'

const TEMPLATES: LayoutTemplateId[] = ['single', 'twoEqual', 'twoFocus', 'threeEqual', 'threeGrid']
const VISIBLE_SLOT_COUNT: Record<LayoutTemplateId, number> = {
  single: 1,
  twoEqual: 2,
  twoFocus: 2,
  threeEqual: 3,
  threeGrid: 3
}

export default function Workspace(): JSX.Element {
  const { t } = useTranslation()
  const { layoutTemplate, setLayoutTemplate, chartSlots, focusedSlotId, setFocusedSlotId } = useAppState()
  const visibleSlots = chartSlots.slice(0, VISIBLE_SLOT_COUNT[layoutTemplate])

  return (
    <main className="workspace">
      <div className="layout-template-picker">
        <div className="segmented">
          {TEMPLATES.map((tpl) => (
            <button
              key={tpl}
              className={layoutTemplate === tpl ? 'active' : ''}
              onClick={() => setLayoutTemplate(tpl)}
              title={t(`workspace.template.${tpl}`) ?? undefined}
            >
              {t(`workspace.template.${tpl}`)}
            </button>
          ))}
        </div>
      </div>
      <div className={'chart-slot-row chart-slot-row-' + layoutTemplate}>
        {visibleSlots.map((slot) => (
          <ChartSlot
            key={slot.id}
            slotId={slot.id}
            focused={slot.id === focusedSlotId}
            onFocus={() => setFocusedSlotId(slot.id)}
          />
        ))}
      </div>
    </main>
  )
}
