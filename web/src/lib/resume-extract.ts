import { z } from "zod"
import type { CandidateProfileData } from "@/lib/candidate-profile"
import {
  emptyWorkExperience,
  emptyCertificate,
  emptyProfile,
  syncLegacyFields,
} from "@/lib/candidate-profile"

export const ResumeExtractionSchema = z.object({
  name: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  city: z.string().nullable(),
  current_position: z.string().nullable(),
  years_experience: z.number().nullable(),
  education: z.array(z.string()),
  past_companies: z.array(z.string()),
  skills: z.array(z.string()),
  summary: z.string().nullable(),
  certifications: z.array(z.string()),
  linkedin_url: z.string().nullable(),
  portfolio_url: z.string().nullable(),
  github_url: z.string().nullable(),
  confidence: z.enum(["high", "medium", "low"]),
})

export type ResumeExtraction = z.infer<typeof ResumeExtractionSchema>

function asStringOrNull(value: unknown): string | null {
  if (value == null || value === "") return null
  return String(value).trim() || null
}

function asNumberOrNull(value: unknown): number | null {
  if (value == null || value === "") return null
  const n = typeof value === "number" ? value : parseFloat(String(value))
  return Number.isFinite(n) ? n : null
}

function asStringArray(value: unknown): string[] {
  if (!value) return []
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean)
  }
  if (typeof value === "string") {
    return value.split(/[,;|\n]/).map((s) => s.trim()).filter(Boolean)
  }
  return []
}

function asConfidence(value: unknown): "high" | "medium" | "low" {
  if (value === "high" || value === "medium" || value === "low") return value
  return "medium"
}

/** Lenient parser — coerces common OpenAI response variations instead of rejecting */
export function parseResumeExtraction(raw: unknown): ResumeExtraction | null {
  if (!raw || typeof raw !== "object") return null

  const o = raw as Record<string, unknown>

  const result: ResumeExtraction = {
    name: asStringOrNull(o.name),
    email: asStringOrNull(o.email),
    phone: asStringOrNull(o.phone),
    city: asStringOrNull(o.city),
    current_position: asStringOrNull(o.current_position ?? o.currentPosition),
    years_experience: asNumberOrNull(o.years_experience ?? o.yearsExperience),
    education: asStringArray(o.education),
    past_companies: asStringArray(o.past_companies ?? o.pastCompanies ?? o.work_experience),
    skills: asStringArray(o.skills),
    summary: asStringOrNull(o.summary),
    certifications: asStringArray(o.certifications),
    linkedin_url: asStringOrNull(o.linkedin_url ?? o.linkedinUrl),
    portfolio_url: asStringOrNull(o.portfolio_url ?? o.portfolioUrl),
    github_url: asStringOrNull(o.github_url ?? o.githubUrl),
    confidence: asConfidence(o.confidence),
  }

  const hasAnyData =
    result.name ||
    result.phone ||
    result.city ||
    result.current_position ||
    result.years_experience != null ||
    result.summary ||
    result.past_companies.length > 0 ||
    result.education.length > 0 ||
    result.skills.length > 0

  return hasAnyData ? result : null
}

function formatEducation(education: string[]): string {
  return education.join("\n")
}

function formatSkills(skills: string[]): string {
  return skills.join(", ")
}

type ScalarProfileField = Exclude<
  keyof CandidateProfileData,
  "workExperiences" | "projects" | "certificates"
>

export function mapExtractionToProfile(
  extraction: ResumeExtraction
): { profile: Partial<CandidateProfileData>; aiFilledFields: (keyof CandidateProfileData)[] } {
  const profile: Partial<CandidateProfileData> = {}
  const aiFilledFields: (keyof CandidateProfileData)[] = []

  const set = (field: ScalarProfileField, value: string) => {
    if (value.trim()) {
      profile[field] = value
      aiFilledFields.push(field)
    }
  }

  if (extraction.name) set("fullName", extraction.name)
  if (extraction.phone) set("phone", extraction.phone)
  if (extraction.city) set("location", extraction.city)
  if (extraction.current_position) set("currentTitle", extraction.current_position)
  if (extraction.years_experience != null) {
    set("yearsExperience", String(extraction.years_experience))
  }
  if (extraction.summary) set("summary", extraction.summary)

  if (extraction.past_companies.length) {
    profile.workExperiences = extraction.past_companies.map((company, i) => ({
      ...emptyWorkExperience(i === 0),
      company: company.split("—")[0]?.trim() || company,
      title: extraction.current_position && i === 0 ? extraction.current_position : "",
      description: company,
    }))
    aiFilledFields.push("workExperiences")
  }

  if (extraction.education.length) {
    set("education", formatEducation(extraction.education))
  }
  if (extraction.skills.length) {
    set("skills", formatSkills(extraction.skills))
  }
  if (extraction.certifications.length) {
    profile.certificates = extraction.certifications.map((name) => ({
      ...emptyCertificate(),
      name: name.trim(),
    }))
    aiFilledFields.push("certificates")
  }
  if (extraction.linkedin_url) set("linkedinUrl", extraction.linkedin_url)
  if (extraction.portfolio_url) set("portfolioUrl", extraction.portfolio_url)
  if (extraction.github_url) set("githubUrl", extraction.github_url)

  return { profile: syncLegacyFields({ ...emptyProfile(), ...profile }), aiFilledFields }
}
