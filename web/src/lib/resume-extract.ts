import { z } from "zod"
import type { CandidateProfileData, WorkExperienceEntry } from "@/lib/candidate-profile"
import {
  emptyWorkExperience,
  emptyCertificate,
  emptyProfile,
  syncLegacyFields,
} from "@/lib/candidate-profile"
import {
  normalizeWorkExperienceEntry,
  parseLegacyWorkLine,
  sortWorkExperiences,
  type ExtractedWorkRole,
} from "@/lib/work-experience-dates"

export const WorkExperienceExtractionSchema = z.object({
  title: z.string(),
  company: z.string(),
  description: z.string(),
  start_month: z.string().nullable(),
  start_year: z.string().nullable(),
  end_month: z.string().nullable(),
  end_year: z.string().nullable(),
  is_current: z.boolean(),
})

export type WorkExperienceExtraction = z.infer<typeof WorkExperienceExtractionSchema>

export const ResumeExtractionSchema = z.object({
  name: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  city: z.string().nullable(),
  current_position: z.string().nullable(),
  years_experience: z.number().nullable(),
  education: z.array(z.string()),
  work_experience: z.array(WorkExperienceExtractionSchema),
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

function asBoolean(value: unknown): boolean {
  if (value === true || value === "true" || value === 1) return true
  return false
}

function asConfidence(value: unknown): "high" | "medium" | "low" {
  if (value === "high" || value === "medium" || value === "low") return value
  return "medium"
}

function parseWorkExperienceArray(value: unknown): WorkExperienceExtraction[] {
  if (!Array.isArray(value)) return []

  return value
    .map((item): WorkExperienceExtraction | null => {
      if (!item || typeof item !== "object") return null
      const o = item as Record<string, unknown>
      const title = asStringOrNull(o.title) ?? ""
      const company = asStringOrNull(o.company) ?? ""
      const description = asStringOrNull(o.description) ?? ""

      if (!title && !company && !description) return null

      return {
        title,
        company,
        description,
        start_month: asStringOrNull(o.start_month ?? o.startMonth),
        start_year: asStringOrNull(o.start_year ?? o.startYear),
        end_month: asStringOrNull(o.end_month ?? o.endMonth),
        end_year: asStringOrNull(o.end_year ?? o.endYear),
        is_current: asBoolean(o.is_current ?? o.isCurrent),
      }
    })
    .filter((item): item is WorkExperienceExtraction => item !== null)
}

/** Lenient parser — coerces common OpenAI response variations instead of rejecting */
export function parseResumeExtraction(raw: unknown): ResumeExtraction | null {
  if (!raw || typeof raw !== "object") return null

  const o = raw as Record<string, unknown>

  const workExperience = parseWorkExperienceArray(o.work_experience ?? o.workExperience)

  const result: ResumeExtraction = {
    name: asStringOrNull(o.name),
    email: asStringOrNull(o.email),
    phone: asStringOrNull(o.phone),
    city: asStringOrNull(o.city),
    current_position: asStringOrNull(o.current_position ?? o.currentPosition),
    years_experience: asNumberOrNull(o.years_experience ?? o.yearsExperience),
    education: asStringArray(o.education),
    work_experience: workExperience,
    past_companies: asStringArray(o.past_companies ?? o.pastCompanies),
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
    result.work_experience.length > 0 ||
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

function buildWorkExperiencesFromExtraction(
  extraction: ResumeExtraction
): WorkExperienceEntry[] {
  if (extraction.work_experience.length > 0) {
    const entries = extraction.work_experience.map((role, index) =>
      normalizeWorkExperienceEntry(role as ExtractedWorkRole, index)
    )
    return sortWorkExperiences(entries)
  }

  if (extraction.past_companies.length > 0) {
    const entries = extraction.past_companies.map((line, index) => {
      const parsed = parseLegacyWorkLine(line)
      const entry = normalizeWorkExperienceEntry(
        {
          title: parsed.title,
          company: parsed.company,
          description: parsed.description,
          start_month: parsed.joinMonth || null,
          start_year: parsed.joinYear || null,
          end_month: parsed.endMonth || null,
          end_year: parsed.endYear || null,
          is_current: parsed.isCurrent,
        },
        index
      )
      // If legacy line had no title but we have current_position for first role
      if (index === 0 && !entry.title && extraction.current_position) {
        entry.title = extraction.current_position
      }
      return entry
    })
    return sortWorkExperiences(entries)
  }

  return [emptyWorkExperience(true)]
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

  const workEntries = buildWorkExperiencesFromExtraction(extraction)
  if (
    extraction.work_experience.length > 0 ||
    extraction.past_companies.length > 0
  ) {
    profile.workExperiences = workEntries
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
