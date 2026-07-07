import { StaggerContainer, StaggerItem } from "@/components/motion"

const STATS = [
  { value: "3×", label: "more thoughtful than generic templates" },
  { value: "Beta", label: "job seekers drafting daily" },
  { value: "~2s", label: "to a message tuned to the post" },
]

export function StatsSection() {
  return (
    <section className="border-y border-slate-100 bg-zinc-50 py-14">
      <div className="mx-auto max-w-6xl px-4 lg:px-8">
        <StaggerContainer className="grid gap-8 sm:grid-cols-3">
          {STATS.map((stat) => (
            <StaggerItem key={stat.label} className="text-center sm:text-left">
              <p className="font-serif text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                {stat.value}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{stat.label}</p>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  )
}
