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
  | "tone"
  | "preview-draft"
  | "whats-next"
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
  steps.push("tone")
  steps.push("preview-draft")
  steps.push("whats-next")

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

export function getStepLabel(step: StepId, stepIndex: number, totalSteps: number): string {
  const counter = `Step ${stepIndex + 1} of ${totalSteps}`
  if (typeof step === "object" && step.type === "question") {
    const basics = ["fullName", "phone", "currentTitle", "yearsExperience", "summary", "education"]
    const links = ["linkedinUrl", "portfolioUrl", "githubUrl"]
    const prefs = ["desiredRoles", "salaryExpectation", "workPreference", "availability"]
    if (basics.includes(step.field)) return `${counter} · Basics`
    if (links.includes(step.field)) return `${counter} · Links`
    if (prefs.includes(step.field)) return `${counter} · Preferences`
    return counter
  }
  if (typeof step !== "string") return counter
  const groups: Record<string, string> = {
    reveal: "Review",
    location: "Basics",
    skills: "Experience",
    work: "Experience",
    projects: "Experience",
    certificates: "Experience",
    review: "Review",
    tone: "Preferences",
    "preview-draft": "Preview",
    "whats-next": "Get started",
  }
  return `${counter} · ${groups[step] || "Setup"}`
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
  if (step === "tone") return true
  if (step === "preview-draft") return true
  if (step === "whats-next") return true
  if (step === "review") return true

  const field = getStepField(step)
  if (field) {
    return String(profile[field] ?? "").trim() !== ""
  }
  return true
}
