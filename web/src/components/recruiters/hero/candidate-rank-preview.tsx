"use client"

import { FloatingCard } from "@/components/motion"
import { cn } from "@/lib/utils"

const CANDIDATES = [
  {
    rank: 1,
    name: "Alex Chen",
    role: "Staff Backend Engineer",
    match: 97,
    skills: ["Go", "K8s", "gRPC"],
    highlight: true,
  },
  {
    rank: 2,
    name: "Jordan Park",
    role: "Senior Platform Engineer",
    match: 94,
    skills: ["Rust", "AWS", "Terraform"],
  },
  {
    rank: 3,
    name: "Sam Rivera",
    role: "Backend Lead",
    match: 91,
    skills: ["Python", "Postgres", "Kafka"],
  },
]

export function CandidateRankPreview() {
  return (
    <FloatingCard className="relative mx-auto w-full max-w-md">
      <div className="space-y-3">
        {CANDIDATES.map((c, i) => (
          <div
            key={c.name}
            className={cn(
              "rounded-xl border border-slate-100 bg-white p-4 shadow-sm transition-[box-shadow,transform] duration-200",
              c.highlight && "border-primary/20 shadow-[0_8px_30px_rgba(20,71,230,0.08)]",
              i > 0 && "opacity-90"
            )}
            style={{ transform: `translateX(${i * 8}px) scale(${1 - i * 0.02})` }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex size-8 items-center justify-center rounded-lg font-mono text-xs font-bold",
                    c.highlight ? "bg-primary/10 text-primary" : "bg-zinc-50 text-muted-foreground"
                  )}
                >
                  #{c.rank}
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.role}</p>
                </div>
              </div>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold",
                  c.highlight ? "bg-primary/10 text-primary" : "bg-zinc-50 text-muted-foreground"
                )}
              >
                {c.match}% match
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {c.skills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-md bg-zinc-50 px-2 py-0.5 font-mono text-[10px] text-muted-foreground"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div
        aria-hidden
        className="absolute -inset-4 -z-10 rounded-2xl border border-slate-100 bg-zinc-50"
      />
    </FloatingCard>
  )
}
