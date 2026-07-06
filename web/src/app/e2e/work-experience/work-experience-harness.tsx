"use client"

import { useMemo, useState } from "react"
import { WorkExperienceEditor } from "@/components/profile/work-experience-editor"
import type { WorkExperienceEntry } from "@/lib/candidate-profile"
import { mapExtractionToProfile, parseResumeExtraction } from "@/lib/resume-extract"

function buildSampleEntries(badYear: boolean): WorkExperienceEntry[] {
  const parsed = parseResumeExtraction({
    name: "Alex Rivera",
    work_experience: [
      {
        title: "Staff Engineer",
        company: "Stripe",
        description: "Led payments platform migration",
        start_month: "03",
        start_year: "2022",
        end_month: null,
        end_year: null,
        is_current: true,
      },
      {
        title: "Senior Engineer",
        company: "Airbnb",
        description: "Built search ranking features",
        start_month: "06",
        start_year: "2019",
        end_month: "02",
        end_year: "2022",
        is_current: false,
      },
      {
        title: "Software Engineer",
        company: "StartupCo",
        description: "Full-stack product development",
        start_month: "01",
        start_year: "2016",
        end_month: "05",
        end_year: "2019",
        is_current: false,
      },
    ],
    education: ["MIT BS CS"],
    skills: ["TypeScript", "React"],
    certifications: [],
    confidence: "high",
  })

  if (!parsed) return []

  const entries = mapExtractionToProfile(parsed).profile.workExperiences ?? []
  if (badYear && entries[0]) {
    entries[0] = { ...entries[0], joinYear: "2019-2020" }
  }
  return entries
}

type WorkExperienceHarnessProps = {
  aiFilled: boolean
  badYear: boolean
}

export function WorkExperienceHarness({ aiFilled, badYear }: WorkExperienceHarnessProps) {
  const initialEntries = useMemo(() => buildSampleEntries(badYear), [badYear])
  const [entries, setEntries] = useState(initialEntries)

  return (
    <main className="min-h-screen bg-background p-6" data-testid="work-experience-harness">
      <WorkExperienceEditor entries={entries} onChange={setEntries} aiFilled={aiFilled} />
    </main>
  )
}
