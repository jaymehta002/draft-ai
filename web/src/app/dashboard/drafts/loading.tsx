import { Skeleton } from "@/components/ui/skeleton"

export default function DraftsLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <Skeleton className="h-[calc(100vh-8rem)] w-full rounded-2xl" />
    </div>
  )
}
