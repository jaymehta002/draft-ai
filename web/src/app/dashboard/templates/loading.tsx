import { FadeIn } from "@/components/motion"
import { Skeleton } from "@/components/ui/skeleton"

export default function TemplatesLoading() {
  return (
    <FadeIn className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <Skeleton className="h-8 w-64 mb-6" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-48 w-full rounded-xl" />
        ))}
      </div>
    </FadeIn>
  )
}
