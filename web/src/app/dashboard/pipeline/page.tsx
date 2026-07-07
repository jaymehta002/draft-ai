import { FadeIn } from "@/components/motion"
import { PipelineKanban } from "@/components/panels/pipeline-kanban"
import { getPipelineData } from "@/app/actions"

export default async function PipelinePage() {
  const data = await getPipelineData()

  return (
    <FadeIn className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-4">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          Conversation pipeline
        </h2>
        <p className="text-sm text-muted-foreground">
          Drafted → Started → Awaiting → Replied
        </p>
      </div>
      <PipelineKanban columns={data.columns} />
    </FadeIn>
  )
}
