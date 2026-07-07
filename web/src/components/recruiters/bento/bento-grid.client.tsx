"use client"

import { StaggerContainer, StaggerItem } from "@/components/motion"
import {
  CommandCell,
  JobPostCell,
  MatchingCell,
  SecurityCell,
  SignalCell,
  TeamCell,
} from "./bento-cells.client"

const LAYOUT = [
  { area: "match", Cell: MatchingCell },
  { area: "job", Cell: JobPostCell },
  { area: "signal", Cell: SignalCell },
  { area: "cmd", Cell: CommandCell },
  { area: "team", Cell: TeamCell },
  { area: "security", Cell: SecurityCell },
] as const

export function BentoGridAnimated() {
  return (
    <StaggerContainer className="bento-grid gap-4">
      {LAYOUT.map(({ area, Cell }) => (
        <StaggerItem key={area} className={`h-full bento-area-${area}`}>
          <Cell />
        </StaggerItem>
      ))}
    </StaggerContainer>
  )
}
