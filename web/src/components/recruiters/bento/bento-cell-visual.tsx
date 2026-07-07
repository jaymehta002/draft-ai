"use client"

import type { BentoCell } from "@/lib/recruiters-content"
import { MatchingMorph } from "./matching-morph.client"
import { JobPostTypewriter } from "./job-post-typewriter.client"
import { CommandCenterTilt } from "./command-center-tilt.client"

function StaticBentoVisual({ id }: { id: string }) {
  const icons: Record<string, string> = {
    signal: "◎",
    team: "◈",
    security: "⬡",
  }

  return (
    <div className="flex h-24 items-center justify-center rounded-xl bg-white/[0.03]">
      <span className="text-3xl text-[#5085fb]/40">{icons[id] ?? "·"}</span>
    </div>
  )
}

export function BentoCellVisual({ cell }: { cell: BentoCell }) {
  switch (cell.animation) {
    case "morph":
      return <MatchingMorph />
    case "typewriter":
      return <JobPostTypewriter prompt={cell.examplePrompt ?? ""} />
    case "tilt":
      return <CommandCenterTilt />
    default:
      return <StaticBentoVisual id={cell.id} />
  }
}
