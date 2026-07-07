import { FadeIn } from "@/components/motion"
import { getDMsData } from "@/app/actions"
import { DMsPageClient } from "@/app/dashboard/dms/dms-page-client"

export default async function DMsPage() {
  const dmsData = await getDMsData()

  return (
    <FadeIn className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {dmsData && <DMsPageClient dms={dmsData.dms} />}
    </FadeIn>
  )
}
