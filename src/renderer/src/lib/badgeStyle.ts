import type { ComponentType } from 'react'
import type { ModuleId } from '@renderer/academy/modules'
import {
  IconBadgeAssetTypes,
  IconBadgeTrend,
  IconBadgeRisk,
  IconBadgeOptions,
  IconBadgeFinal
} from '@renderer/components/icons/Icons'

export interface BadgeStyleEntry {
  Icon: ComponentType<{ size?: number; className?: string }>
  /** Accent color for the earned/full-color state of this badge's shelf slot. */
  accent: string
}

/** Fixed 5-entry lookup — deliberately NOT lib/portfolioStyle.ts's modulo-cycling pattern.
 *  That pattern exists to assign a look to an open-ended, user-created list (portfolios can
 *  keep growing); Modules are a small, permanently closed set of exactly 5, so every entry
 *  gets its own deliberate, permanent glyph and accent rather than being picked by index. */
export const BADGE_STYLES: Record<ModuleId, BadgeStyleEntry> = {
  assetTypes: { Icon: IconBadgeAssetTypes, accent: 'var(--accent-a)' },
  trend: { Icon: IconBadgeTrend, accent: 'var(--gain)' },
  risk: { Icon: IconBadgeRisk, accent: 'var(--warn)' },
  options: { Icon: IconBadgeOptions, accent: 'var(--accent-b)' },
  // Deliberately distinct from the other 4 (gold, not one of the reused semantic colors) —
  // the Final Exam badge should read as more prestigious, matching its laurel/star glyph.
  final: { Icon: IconBadgeFinal, accent: '#c9a227' }
}
