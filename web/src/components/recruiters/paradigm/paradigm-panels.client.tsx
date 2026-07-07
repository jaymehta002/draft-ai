"use client"

import { Children } from "react"
import { StaggerContainer, StaggerItem } from "@/components/motion"

export function ParadigmPanels({ children }: { children: React.ReactNode }) {
  return (
    <StaggerContainer className="grid items-stretch gap-6 lg:grid-cols-2">
      {Children.map(children, (child, i) => (
        <StaggerItem key={i} className="h-full">
          {child}
        </StaggerItem>
      ))}
    </StaggerContainer>
  )
}
