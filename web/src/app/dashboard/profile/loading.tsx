import { Skeleton } from "@/components/ui/skeleton"

export default function ProfileLoading() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      <Skeleton className="h-32 w-full rounded-2xl" />
      <Skeleton className="h-96 w-full rounded-2xl" />
    </div>
  )
}
