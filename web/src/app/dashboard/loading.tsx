import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl gap-6">
        <Skeleton className="hidden h-[calc(100vh-4rem)] w-20 rounded-2xl lg:block" />
        <div className="flex-1 space-y-6">
          <Skeleton className="h-16 w-full rounded-2xl" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-36 rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      </div>
    </div>
  )
}
