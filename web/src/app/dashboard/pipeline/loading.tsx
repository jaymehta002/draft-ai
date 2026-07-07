import { FadeIn } from "@/components/motion"
import { Skeleton } from "@/components/ui/skeleton"

export default function PipelineLoading() {
  return (
    <FadeIn className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <Skeleton className="h-8 w-48 mb-6" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-96 w-full rounded-xl" />
        ))}
      </div>
    </FadeIn>
  )
}
