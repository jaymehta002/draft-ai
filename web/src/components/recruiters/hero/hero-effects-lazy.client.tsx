"use client"

import dynamic from "next/dynamic"

export const HeroEffectsLazy = dynamic(
  () => import("./hero-effects.client").then((m) => m.HeroEffects),
  { ssr: false }
)
