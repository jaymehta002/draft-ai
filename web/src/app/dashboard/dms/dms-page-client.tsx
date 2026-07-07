"use client"

import { useRouter } from "next/navigation"
import { DMsPanel } from "@/components/panels/dms-panel"
import { markDMResponded, type getDMsData } from "@/app/actions"

export function DMsPageClient({ dms }: { dms: Awaited<ReturnType<typeof getDMsData>>["dms"] }) {
  const router = useRouter()

  return (
    <DMsPanel
      dms={dms}
      onMarkReplied={async (id) => {
        await markDMResponded(id)
        router.refresh()
      }}
    />
  )
}

