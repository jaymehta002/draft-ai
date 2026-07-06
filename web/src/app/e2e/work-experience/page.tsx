import { WorkExperienceHarness } from "./work-experience-harness"

type PageProps = {
  searchParams: Promise<{ aiFilled?: string; badYear?: string }>
}

export default async function E2EWorkExperiencePage({ searchParams }: PageProps) {
  const params = await searchParams
  const aiFilled = params.aiFilled === "1"
  const badYear = params.badYear === "1"

  return <WorkExperienceHarness aiFilled={aiFilled} badYear={badYear} />
}
