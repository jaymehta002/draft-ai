import { FadeIn } from "@/components/motion"
import { TemplatesGallery } from "@/components/panels/templates-gallery"
import { getUserWinningTemplates } from "@/app/actions"

export default async function TemplatesPage() {
  const templates = await getUserWinningTemplates()

  return (
    <FadeIn className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          Messages that got replies
        </h2>
        <p className="text-sm text-muted-foreground">
          Copy or adapt your winning conversations
        </p>
      </div>
      <TemplatesGallery templates={templates} />
    </FadeIn>
  )
}
