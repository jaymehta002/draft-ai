import { Skeleton } from "@/components/ui/skeleton"

export default function ExtensionLoading() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-2xl" />
        ))}
      </div>
    </div>
  )
}
