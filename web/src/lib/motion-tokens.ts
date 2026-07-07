export const EASE_OUT = [0.16, 1, 0.3, 1] as const

export const EASE_SPRING = { type: "spring" as const, stiffness: 400, damping: 30 }

export const REVEAL_INITIAL = { opacity: 0, y: 16 }
export const REVEAL_ANIMATE = { opacity: 1, y: 0 }

export const STAGGER = 0.06

export const FLOAT_TRANSITION = {
  duration: 6,
  repeat: Infinity,
  ease: "easeInOut" as const,
}
