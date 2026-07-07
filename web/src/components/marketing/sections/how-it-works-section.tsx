import { ScrollReveal, StaggerContainer, StaggerItem } from "@/components/motion"

const STEPS = [
  {
    title: "Set up your profile once",
    body: "Upload your resume. Draft AI reads your experience, projects, and skills — the context every message draws from.",
  },
  {
    title: "Browse X and LinkedIn like normal",
    body: "A Draft button appears on posts. No new tab, no copy-paste.",
  },
  {
    title: "Generate, edit, and send",
    body: "Get a message for that post and your background. Tweak it, then send.",
  },
]

export function HowItWorksSection() {
  return (
    <section id="how" className="scroll-mt-20 bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 lg:px-8">
        <ScrollReveal>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-primary">
            How it works
          </p>
          <h2 className="mt-3 max-w-2xl font-serif text-3xl tracking-tight sm:text-4xl">
            From a post to a message worth sending, without leaving the page.
          </h2>
        </ScrollReveal>

        <StaggerContainer className="mt-14 grid gap-8 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <StaggerItem key={step.title} className="relative">
              <div className="mb-5 flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl border border-slate-100 bg-zinc-50 font-mono text-sm font-semibold text-primary">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="h-px flex-1 bg-slate-100" />
              </div>
              <h3 className="font-serif text-xl tracking-tight text-foreground">{step.title}</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  )
}
