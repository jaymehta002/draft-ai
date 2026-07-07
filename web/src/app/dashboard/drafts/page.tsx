import { FadeIn } from "@/components/motion"
import { DraftsPanel } from "@/components/panels/drafts-panel"
import { getDraftsData } from "@/app/actions"

export default async function DraftsPage() {
  const draftsData = await getDraftsData()

  return (
    <FadeIn className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {draftsData && <DraftsPanel drafts={draftsData.drafts} />}
    </FadeIn>
  )
}
