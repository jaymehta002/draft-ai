import { ShimmerSkeleton } from "@/components/motion"

export default function DraftsLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl">
      <ShimmerSkeleton className="h-[calc(100vh-8rem)] rounded-2xl border border-slate-100 bg-white" />
    </div>
  )
}
