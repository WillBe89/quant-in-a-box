import type { Transition } from 'motion/react'

export const springSnappy: Transition = { type: 'spring', stiffness: 380, damping: 32 }
export const springGentle: Transition = { type: 'spring', stiffness: 260, damping: 30 }

export const easeStandard = [0.2, 0.8, 0.2, 1] as const
export const easeEmphasized = [0.16, 1, 0.3, 1] as const

export const fadeScaleIn = {
  initial: { opacity: 0, scale: 0.97 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.22, ease: easeEmphasized } },
  exit: { opacity: 0, scale: 0.97, transition: { duration: 0.15, ease: easeStandard } }
}

export const backdropFade = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.18, ease: easeStandard } },
  exit: { opacity: 0, transition: { duration: 0.15, ease: easeStandard } }
}
