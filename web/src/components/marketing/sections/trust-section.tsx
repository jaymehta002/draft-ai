import { Marquee } from "@/components/motion"

const LOGOS = [
  "YC startups",
  "FAANG",
  "Top bootcamps",
  "Series A–C",
  "Growth-stage",
  "Remote-first",
]

const TESTIMONIALS = [
  {
    quote:
      "I stopped copy-pasting templates. Two hiring managers replied in my first week.",
    name: "Priya S.",
    role: "Software engineer",
  },
  {
    quote: "The draft button in my feed is the whole workflow.",
    name: "Marcus T.",
    role: "Product manager",
  },
  {
    quote: "It feels like starting a conversation, not blasting outreach.",
    name: "Elena R.",
    role: "Career changer",
  },
]

export function TrustSection() {
  return (
    <section className="overflow-hidden bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 text-center lg:px-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          Trusted by job seekers from
        </p>
      </div>

      <div className="relative mt-8">
        <div className="absolute left-0 top-0 bottom-0 z-10 w-24 bg-gradient-to-r from-white to-transparent" />
        <div className="absolute right-0 top-0 bottom-0 z-10 w-24 bg-gradient-to-l from-white to-transparent" />
        <Marquee>
          {LOGOS.map((logo) => (
            <span
              key={logo}
              className="font-mono text-sm text-muted-foreground/40 transition-[opacity,filter] duration-300 hover:text-muted-foreground/70"
            >
              {logo}
            </span>
          ))}
        </Marquee>
      </div>

      <div className="mx-auto mt-16 grid max-w-6xl gap-6 px-4 md:grid-cols-3 lg:px-8">
        {TESTIMONIALS.map((t) => (
          <blockquote
            key={t.name}
            className="rounded-2xl border border-slate-100 bg-zinc-50 p-6"
          >
            <p className="text-sm leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
            <footer className="mt-4 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{t.name}</span>
              <span className="mx-1.5">·</span>
              {t.role}
            </footer>
          </blockquote>
        ))}
      </div>
    </section>
  )
}
