"use client"

import { useEffect, useRef, useState } from "react"
import {
  motion,
  useInView,
  useReducedMotion,
  type Variants,
} from "framer-motion"
import { Check, Radar, ShieldCheck } from "lucide-react"
import { BENTO } from "@/lib/recruiters-content"
import { EASE_OUT } from "@/lib/motion-tokens"
import { cn } from "@/lib/utils"

/* -------------------------------------------------------------------------- */
/*  Shared shell + helpers                                                     */
/* -------------------------------------------------------------------------- */

const CARD =
  "group relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-12px_rgba(20,71,230,0.18)] sm:p-6"

function CellHeader({
  eyebrow,
  title,
  body,
  className,
}: {
  eyebrow: string
  title: string
  body: string
  className?: string
}) {
  return (
    <div className={className}>
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-primary/70">
        {eyebrow}
      </p>
      <h3 className="mt-1.5 font-serif text-lg leading-snug text-foreground sm:text-xl">
        {title}
      </h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  )
}

/** Fires once when the element scrolls into view. */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: "-40px" })
  const reduce = useReducedMotion()
  return { ref, active: inView, reduce }
}

/** Counts from 0 → target once `active` flips true. */
function useCountUp(target: number, active: boolean, duration = 900) {
  const [value, setValue] = useState(0)
  const reduce = useReducedMotion()

  useEffect(() => {
    if (!active) return
    if (reduce) {
      setValue(target)
      return
    }
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(Math.round(eased * target))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [active, target, duration, reduce])

  return value
}

/* -------------------------------------------------------------------------- */
/*  1. Matching Engine — animated ranked leaderboard (large 2×2)               */
/* -------------------------------------------------------------------------- */

const AVATAR_TINT = [
  "bg-primary/10 text-primary",
  "bg-amber-500/10 text-amber-600",
  "bg-emerald-500/10 text-emerald-600",
]

export function MatchingCell() {
  const { ref, active, reduce } = useReveal()
  const { eyebrow, title, body, candidates } = BENTO.matching

  return (
    <article ref={ref} className={CARD}>
      <CellHeader eyebrow={eyebrow} title={title} body={body} />

      <div className="mt-5 flex flex-1 flex-col justify-center gap-2.5">
        {candidates.map((c, i) => {
          const top = c.rank === 1
          return (
            <motion.div
              key={c.rank}
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={active ? { opacity: 1, y: 0 } : undefined}
              transition={{ duration: 0.45, delay: 0.1 + i * 0.12, ease: EASE_OUT }}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-2.5 sm:p-3",
                top
                  ? "border-primary/25 bg-primary/[0.04]"
                  : "border-slate-100 bg-zinc-50/70"
              )}
            >
              <span className="w-3 shrink-0 text-center font-mono text-xs text-muted-foreground">
                {c.rank}
              </span>
              <span
                className={cn(
                  "grid size-8 shrink-0 place-items-center rounded-full text-[11px] font-semibold",
                  AVATAR_TINT[i] ?? AVATAR_TINT[0]
                )}
              >
                {c.initials}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-sm font-medium text-foreground">
                    {c.name}
                  </p>
                  {top && (
                    <motion.span
                      className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary"
                      animate={reduce ? undefined : { opacity: [1, 0.55, 1] }}
                      transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                    >
                      Top match
                    </motion.span>
                  )}
                </div>
                <p className="truncate text-xs text-muted-foreground">{c.role}</p>
                {c.tags && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {c.tags.map((t) => (
                      <span
                        key={t}
                        className="rounded bg-white px-1.5 py-0.5 text-[9px] text-muted-foreground ring-1 ring-slate-100"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex w-16 shrink-0 flex-col items-end gap-1">
                <span className="font-serif text-base leading-none text-foreground">
                  {c.score}
                  <span className="text-[10px] text-muted-foreground">%</span>
                </span>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <motion.div
                    className={cn(
                      "h-full rounded-full",
                      top ? "bg-primary" : "bg-primary/45"
                    )}
                    initial={{ width: 0 }}
                    animate={active ? { width: `${c.score}%` } : { width: 0 }}
                    transition={{
                      duration: 0.9,
                      delay: 0.3 + i * 0.12,
                      ease: EASE_OUT,
                    }}
                  />
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </article>
  )
}

/* -------------------------------------------------------------------------- */
/*  2. Job Posts — typed brief → generated tags (small square)                 */
/* -------------------------------------------------------------------------- */

export function JobPostCell() {
  const { ref, active, reduce } = useReveal()
  const { eyebrow, title, body, brief, tags } = BENTO.jobPost
  const [typed, setTyped] = useState(reduce ? brief : "")
  const [showTags, setShowTags] = useState(reduce)

  useEffect(() => {
    if (!active || reduce) return
    setTyped("")
    setShowTags(false)
    let i = 0
    const id = setInterval(() => {
      i += 1
      setTyped(brief.slice(0, i))
      if (i >= brief.length) {
        clearInterval(id)
        setShowTags(true)
      }
    }, 32)
    return () => clearInterval(id)
  }, [active, reduce, brief])

  return (
    <article ref={ref} className={CARD}>
      <CellHeader eyebrow={eyebrow} title={title} body={body} />

      <div className="mt-4 flex flex-1 flex-col justify-end gap-3">
        <div className="rounded-lg border border-slate-100 bg-zinc-50 px-3 py-2">
          <p className="font-mono text-[11px] leading-relaxed text-foreground/80">
            <span className="text-primary/60">$ </span>
            {typed}
            {!reduce && !showTags && (
              <span className="ml-0.5 inline-block h-3 w-px animate-pulse bg-primary align-middle" />
            )}
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {tags.map((t, i) => (
            <motion.span
              key={t}
              initial={reduce ? false : { opacity: 0, scale: 0.8, y: 4 }}
              animate={
                showTags ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0 }
              }
              transition={{ duration: 0.3, delay: i * 0.06, ease: EASE_OUT }}
              className="rounded-full bg-primary/[0.06] px-2 py-0.5 text-[11px] font-medium text-primary ring-1 ring-primary/15"
            >
              {t}
            </motion.span>
          ))}
        </div>
      </div>
    </article>
  )
}

/* -------------------------------------------------------------------------- */
/*  3. Talent Signal — radar sweep with pinging blips (small square)           */
/* -------------------------------------------------------------------------- */

const BLIPS = [
  { top: "26%", left: "62%", delay: "0ms" },
  { top: "58%", left: "38%", delay: "700ms" },
  { top: "44%", left: "72%", delay: "1400ms" },
]

export function SignalCell() {
  const { ref, reduce } = useReveal()
  const { eyebrow, title, body, activeLabel } = BENTO.signal

  return (
    <article ref={ref} className={cn(CARD, "justify-between")}>
      <CellHeader eyebrow={eyebrow} title={title} body={body} />

      <div className="relative mt-4 flex flex-1 items-center justify-center">
        <div className="relative aspect-square w-full max-w-[128px]">
          {/* concentric rings */}
          <div className="absolute inset-0 rounded-full border border-primary/15" />
          <div className="absolute inset-[18%] rounded-full border border-primary/15" />
          <div className="absolute inset-[38%] rounded-full border border-primary/10" />
          <div className="absolute left-1/2 top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary" />

          {/* rotating sweep */}
          {!reduce && (
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background:
                  "conic-gradient(from 0deg, rgba(20,71,230,0.22) 0deg, rgba(20,71,230,0) 70deg, transparent 360deg)",
                animation: "recruit-spin 3.5s linear infinite",
              }}
            />
          )}

          {/* blips */}
          {BLIPS.map((b, i) => (
            <span
              key={i}
              className="absolute size-2 -translate-x-1/2 -translate-y-1/2"
              style={{ top: b.top, left: b.left }}
            >
              {!reduce && (
                <span
                  className="absolute inset-0 animate-ping rounded-full bg-emerald-400/60"
                  style={{ animationDelay: b.delay, animationDuration: "2.4s" }}
                />
              )}
              <span className="absolute inset-0 rounded-full bg-emerald-500" />
            </span>
          ))}
        </div>

        <span className="absolute bottom-0 right-0 flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600">
          <Radar className="size-3" strokeWidth={2} />
          {activeLabel}
        </span>
      </div>
    </article>
  )
}

/* -------------------------------------------------------------------------- */
/*  4. Command Center — mini funnel with count-up (wide 2×1)                    */
/* -------------------------------------------------------------------------- */

function StageColumn({
  stage,
  count,
  max,
  active,
  index,
}: {
  stage: string
  count: number
  max: number
  active: boolean
  index: number
}) {
  const value = useCountUp(count, active, 700 + index * 120)
  const pct = Math.max(14, Math.round((count / max) * 100))

  return (
    <div className="flex flex-1 flex-col items-center gap-2">
      <div className="flex h-20 w-full items-end justify-center">
        <motion.div
          className="w-full rounded-t-md bg-gradient-to-t from-primary/70 to-primary/30"
          initial={{ height: 0 }}
          animate={active ? { height: `${pct}%` } : { height: 0 }}
          transition={{ duration: 0.7, delay: index * 0.1, ease: EASE_OUT }}
        />
      </div>
      <span className="font-serif text-lg leading-none text-foreground">{value}</span>
      <span className="text-[10px] text-muted-foreground">{stage}</span>
    </div>
  )
}

export function CommandCell() {
  const { ref, active } = useReveal()
  const { eyebrow, title, body, stages } = BENTO.command
  const max = Math.max(...stages.map((s) => s.count))

  return (
    <article ref={ref} className={cn(CARD, "lg:flex-row lg:items-center lg:gap-6")}>
      <div className="lg:w-[42%] lg:shrink-0">
        <CellHeader eyebrow={eyebrow} title={title} body={body} />
      </div>

      <div className="mt-5 flex flex-1 items-end gap-2 lg:mt-0">
        {stages.map((s, i) => (
          <StageColumn
            key={s.stage}
            stage={s.stage}
            count={s.count}
            max={max}
            active={active}
            index={i}
          />
        ))}
      </div>
    </article>
  )
}

/* -------------------------------------------------------------------------- */
/*  5. Team Collaboration — avatar stack + live note (wide 2×1)                */
/* -------------------------------------------------------------------------- */

const TEAM_TINT = [
  "bg-primary/15 text-primary",
  "bg-rose-500/15 text-rose-600",
  "bg-emerald-500/15 text-emerald-600",
  "bg-amber-500/15 text-amber-600",
]

const avatarVariants: Variants = {
  hidden: { opacity: 0, scale: 0.6, x: -6 },
  show: (i: number) => ({
    opacity: 1,
    scale: 1,
    x: 0,
    transition: { duration: 0.35, delay: i * 0.08, ease: EASE_OUT },
  }),
}

export function TeamCell() {
  const { ref, active, reduce } = useReveal()
  const { eyebrow, title, body, teammates, extraCount, note } = BENTO.team

  return (
    <article ref={ref} className={cn(CARD, "lg:flex-row lg:items-center lg:gap-6")}>
      <div className="lg:w-[46%] lg:shrink-0">
        <CellHeader eyebrow={eyebrow} title={title} body={body} />
      </div>

      <div className="mt-5 flex flex-1 flex-col gap-3 lg:mt-0">
        <div className="flex items-center">
          {teammates.map((m, i) => (
            <motion.span
              key={m.initials}
              custom={i}
              variants={reduce ? undefined : avatarVariants}
              initial={reduce ? false : "hidden"}
              animate={active ? "show" : undefined}
              title={m.name}
              className={cn(
                "grid size-9 place-items-center rounded-full text-[11px] font-semibold ring-2 ring-white",
                i > 0 && "-ml-2.5",
                TEAM_TINT[i] ?? TEAM_TINT[0]
              )}
            >
              {m.initials}
            </motion.span>
          ))}
          <span className="-ml-2.5 grid size-9 place-items-center rounded-full bg-zinc-100 text-[11px] font-semibold text-muted-foreground ring-2 ring-white">
            +{extraCount}
          </span>
        </div>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={active ? { opacity: 1, y: 0 } : undefined}
          transition={{ duration: 0.4, delay: 0.45, ease: EASE_OUT }}
          className="rounded-xl rounded-tl-sm border border-slate-100 bg-zinc-50/70 p-3"
        >
          <p className="text-xs leading-relaxed text-foreground/80">
            &ldquo;{note.text}&rdquo;
          </p>
          <p className="mt-1 text-[10px] font-medium text-muted-foreground">
            {note.author} · just now
          </p>
        </motion.div>
      </div>
    </article>
  )
}

/* -------------------------------------------------------------------------- */
/*  6. Enterprise Security — ticking compliance checklist (wide 2×1)           */
/* -------------------------------------------------------------------------- */

export function SecurityCell() {
  const { ref, active, reduce } = useReveal()
  const { eyebrow, title, body, checklist } = BENTO.security

  return (
    <article ref={ref} className={cn(CARD, "lg:flex-row lg:items-center lg:gap-6")}>
      <div className="lg:w-[46%] lg:shrink-0">
        <CellHeader eyebrow={eyebrow} title={title} body={body} />
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary/[0.06] px-2.5 py-1 text-[10px] font-semibold text-primary">
          <ShieldCheck className="size-3.5" strokeWidth={2} />
          Audited &amp; certified
        </div>
      </div>

      <div className="mt-5 grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2 lg:mt-0">
        {checklist.map((item, i) => (
          <motion.div
            key={item}
            initial={reduce ? false : { opacity: 0, x: 8 }}
            animate={active ? { opacity: 1, x: 0 } : undefined}
            transition={{ duration: 0.35, delay: 0.15 + i * 0.14, ease: EASE_OUT }}
            className="flex items-center gap-2 rounded-lg border border-slate-100 bg-zinc-50/70 px-2.5 py-2"
          >
            <motion.span
              initial={reduce ? false : { scale: 0 }}
              animate={active ? { scale: 1 } : undefined}
              transition={{
                type: "spring",
                stiffness: 500,
                damping: 22,
                delay: 0.25 + i * 0.14,
              }}
              className="grid size-4 shrink-0 place-items-center rounded-full bg-emerald-500/15 text-emerald-600"
            >
              <Check className="size-3" strokeWidth={3} />
            </motion.span>
            <span className="text-xs text-foreground/80">{item}</span>
          </motion.div>
        ))}
      </div>
    </article>
  )
}
