import type { CandidateProfileData } from "@/lib/candidate-profile"
import { isWorkExperienceValid } from "@/lib/candidate-profile"
import { QUESTION_FIELD_ORDER } from "@/lib/onboarding-fields"
import { needsGeocodingResolution } from "@/lib/location-lookup"

export type StepId =
  | "reveal"
  | "location"
  | "skills"
  | "work"
  | "projects"
  | "certificates"
  | "review"
  | { type: "question"; field: keyof CandidateProfileData }

export function buildStepQueue(
  profile: CandidateProfileData,
  aiFilledFields: Set<keyof CandidateProfileData>,
  options: { includeReveal: boolean }
): StepId[] {
  const steps: StepId[] = []

  if (options.includeReveal) {
    steps.push("reveal")
  }

  for (const field of QUESTION_FIELD_ORDER) {
    const value = String(profile[field.key] ?? "").trim()
    const isAiFilled = aiFilledFields.has(field.key)
    if (!value || isAiFilled) {
      steps.push({ type: "question", field: field.key })
    }
  }

  if (!profile.location.trim() || needsGeocodingResolution(profile.location)) {
    steps.push("location")
  }

  steps.push("skills")
  steps.push("work")
  steps.push("projects")
  steps.push("certificates")
  steps.push("review")

  return steps
}

export function stepKey(step: StepId): string {
  if (typeof step === "string") return step
  return `question:${step.field}`
}

export function getStepField(step: StepId): keyof CandidateProfileData | null {
  if (typeof step === "object" && step.type === "question") return step.field
  return null
}

export function canContinueStep(step: StepId, profile: CandidateProfileData, skillsLoading: boolean): boolean {
  if (step === "reveal") return true
  if (step === "location") {
    return profile.location.trim() !== "" && !needsGeocodingResolution(profile.location)
  }
  if (step === "skills") {
    return profile.skills.trim() !== "" && !skillsLoading
  }
  if (step === "work") {
    return profile.workExperiences.some(isWorkExperienceValid)
  }
  if (step === "projects" || step === "certificates") return true
  if (step === "review") return true

  const field = getStepField(step)
  if (field) {
    return String(profile[field] ?? "").trim() !== ""
  }
  return true
}
