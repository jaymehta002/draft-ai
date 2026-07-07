import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="space-y-6">
        <Skeleton className="h-10 w-40 rounded-xl" />
        <Skeleton className="h-[calc(100vh-10rem)] w-full rounded-2xl" />
      </div>
    </div>
  )
}
