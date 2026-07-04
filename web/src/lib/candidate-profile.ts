export type WorkExperienceEntry = {
  id: string
  title: string
  company: string
  description: string
  joinMonth: string
  joinYear: string
  isCurrent: boolean
  currentCtc: string
  endMonth: string
  endYear: string
}

export type ProjectEntry = {
  id: string
  name: string
  description: string
  url: string
  technologies: string
}

export type CertificateEntry = {
  id: string
  name: string
  issuer: string
  issueMonth: string
  issueYear: string
  url: string
}

export type CandidateProfileData = {
  fullName: string
  phone: string
  location: string
  linkedinUrl: string
  portfolioUrl: string
  githubUrl: string
  currentTitle: string
  yearsExperience: string
  summary: string
  workExperience: string
  workExperiences: WorkExperienceEntry[]
  projects: ProjectEntry[]
  certificates: CertificateEntry[]
  education: string
  skills: string
  certifications: string
  resumeFileName: string
  resumeMimeType: string
  resumeStorageKey: string
  resumeFileUrl: string
  resumeFileSize: string
  resumeFileData: string
  resumeContent: string
  desiredRoles: string
  salaryExpectation: string
  workPreference: string
  availability: string
}

export const MONTHS = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
]

export function generateId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function emptyWorkExperience(isCurrent = false): WorkExperienceEntry {
  return {
    id: generateId(),
    title: "",
    company: "",
    description: "",
    joinMonth: "",
    joinYear: "",
    isCurrent,
    currentCtc: "",
    endMonth: "",
    endYear: "",
  }
}

export function emptyProject(): ProjectEntry {
  return {
    id: generateId(),
    name: "",
    description: "",
    url: "",
    technologies: "",
  }
}

export function emptyCertificate(): CertificateEntry {
  return {
    id: generateId(),
    name: "",
    issuer: "",
    issueMonth: "",
    issueYear: "",
    url: "",
  }
}

export function emptyProfile(): CandidateProfileData {
  return {
    fullName: "",
    phone: "",
    location: "",
    linkedinUrl: "",
    portfolioUrl: "",
    githubUrl: "",
    currentTitle: "",
    yearsExperience: "",
    summary: "",
    workExperience: "",
    workExperiences: [emptyWorkExperience(true)],
    projects: [],
    certificates: [],
    education: "",
    skills: "",
    certifications: "",
    resumeFileName: "",
    resumeMimeType: "",
    resumeStorageKey: "",
    resumeFileUrl: "",
    resumeFileSize: "",
    resumeFileData: "",
    resumeContent: "",
    desiredRoles: "",
    salaryExpectation: "",
    workPreference: "",
    availability: "",
  }
}

function formatMonthYear(month: string, year: string): string {
  if (!month || !year) return ""
  const label = MONTHS.find((m) => m.value === month)?.label?.slice(0, 3) ?? month
  return `${label} ${year}`
}

export function formatWorkExperienceForAI(entries: WorkExperienceEntry[]): string {
  return entries
    .filter((e) => e.title.trim() || e.company.trim())
    .map((e) => {
      const period = e.isCurrent
        ? `${formatMonthYear(e.joinMonth, e.joinYear)} – Present`
        : `${formatMonthYear(e.joinMonth, e.joinYear)} – ${formatMonthYear(e.endMonth, e.endYear) || "Present"}`
      const ctc = e.isCurrent && e.currentCtc ? `\nCTC: ${e.currentCtc}` : ""
      return `${e.company} — ${e.title} (${period})${ctc}\n${e.description}`
    })
    .join("\n\n")
}

export function formatCertificatesForAI(entries: CertificateEntry[]): string {
  return entries
    .filter((e) => e.name.trim())
    .map((e) => {
      const date = formatMonthYear(e.issueMonth, e.issueYear)
      return date ? `${e.name} — ${e.issuer} (${date})` : `${e.name} — ${e.issuer}`
    })
    .join(", ")
}

export function formatProjectsForAI(entries: ProjectEntry[]): string {
  return entries
    .filter((e) => e.name.trim())
    .map((e) => {
      const tech = e.technologies ? `\nTech: ${e.technologies}` : ""
      return `${e.name}${tech}\n${e.description}`
    })
    .join("\n\n")
}

export function syncLegacyFields(profile: CandidateProfileData): CandidateProfileData {
  const current = profile.workExperiences.find((e) => e.isCurrent) ?? profile.workExperiences[0]
  return {
    ...profile,
    currentTitle: current?.title?.trim() || profile.currentTitle,
    workExperience: formatWorkExperienceForAI(profile.workExperiences),
    certifications: formatCertificatesForAI(profile.certificates),
  }
}

export function isWorkExperienceValid(entry: WorkExperienceEntry): boolean {
  if (!entry.title.trim() || !entry.company.trim() || !entry.description.trim()) return false
  if (!entry.joinMonth || !entry.joinYear) return false
  if (entry.isCurrent && !entry.currentCtc.trim()) return false
  if (!entry.isCurrent && entry.endYear && !entry.endMonth) return false
  return true
}

export function isProjectValid(entry: ProjectEntry): boolean {
  return !!(entry.name.trim() && entry.description.trim())
}

export function isCertificateValid(entry: CertificateEntry): boolean {
  return !!(entry.name.trim() && entry.issuer.trim())
}

function parseJsonArray<T>(raw: unknown, fallback: T[]): T[] {
  if (!raw) return fallback
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? (parsed as T[]) : fallback
    } catch {
      return fallback
    }
  }
  return Array.isArray(raw) ? (raw as T[]) : fallback
}

export function migrateLegacyToStructured(profile: {
  currentTitle?: string | null
  workExperience?: string | null
  certifications?: string | null
  workExperiences?: unknown
  projects?: unknown
  certificates?: unknown
}): {
  workExperiences: WorkExperienceEntry[]
  projects: ProjectEntry[]
  certificates: CertificateEntry[]
} {
  let workExperiences = parseJsonArray<WorkExperienceEntry>(profile.workExperiences, [])
  const projects = parseJsonArray<ProjectEntry>(profile.projects, [])
  let certificates = parseJsonArray<CertificateEntry>(profile.certificates, [])

  if (workExperiences.length === 0) {
    const legacy = profile.workExperience?.trim()
    const title = profile.currentTitle?.trim() || ""
    if (legacy || title) {
      workExperiences = [
        {
          ...emptyWorkExperience(true),
          title,
          company: legacy?.split("\n")[0]?.split("—")[0]?.trim() || "",
          description: legacy || "",
        },
      ]
    } else {
      workExperiences = [emptyWorkExperience(true)]
    }
  }

  if (certificates.length === 0 && profile.certifications?.trim()) {
    certificates = profile.certifications.split(",").map((name) => ({
      ...emptyCertificate(),
      name: name.trim(),
      issuer: "",
    }))
  }

  return { workExperiences, projects, certificates }
}

export function parseCandidateFormData(formData: FormData): CandidateProfileData {
  const workExperiences = parseJsonArray<WorkExperienceEntry>(
    formData.get("workExperiences"),
    [emptyWorkExperience(true)]
  )
  const projects = parseJsonArray<ProjectEntry>(formData.get("projects"), [])
  const certificates = parseJsonArray<CertificateEntry>(formData.get("certificates"), [])

  const profile: CandidateProfileData = {
    fullName: (formData.get("fullName") as string) || "",
    phone: (formData.get("phone") as string) || "",
    location: (formData.get("location") as string) || "",
    linkedinUrl: (formData.get("linkedinUrl") as string) || "",
    portfolioUrl: (formData.get("portfolioUrl") as string) || "",
    githubUrl: (formData.get("githubUrl") as string) || "",
    currentTitle: (formData.get("currentTitle") as string) || "",
    yearsExperience: (formData.get("yearsExperience") as string) || "",
    summary: (formData.get("summary") as string) || "",
    workExperience: (formData.get("workExperience") as string) || "",
    workExperiences,
    projects,
    certificates,
    education: (formData.get("education") as string) || "",
    skills: (formData.get("skills") as string) || "",
    certifications: (formData.get("certifications") as string) || "",
    resumeFileName: (formData.get("resumeFileName") as string) || "",
    resumeMimeType: (formData.get("resumeMimeType") as string) || "",
    resumeStorageKey: (formData.get("resumeStorageKey") as string) || "",
    resumeFileUrl: (formData.get("resumeFileUrl") as string) || "",
    resumeFileSize: (formData.get("resumeFileSize") as string) || "",
    resumeFileData: (formData.get("resumeFileData") as string) || "",
    resumeContent: (formData.get("resumeContent") as string) || "",
    desiredRoles: (formData.get("desiredRoles") as string) || "",
    salaryExpectation: (formData.get("salaryExpectation") as string) || "",
    workPreference: (formData.get("workPreference") as string) || "",
    availability: (formData.get("availability") as string) || "",
  }

  return syncLegacyFields(profile)
}

const REQUIRED_SCALAR_FIELDS = [
  "fullName",
  "phone",
  "location",
  "linkedinUrl",
  "portfolioUrl",
  "githubUrl",
  "yearsExperience",
  "summary",
  "education",
  "skills",
  "resumeFileName",
  "resumeContent",
  "desiredRoles",
  "salaryExpectation",
  "workPreference",
  "availability",
] as const

export type OnboardingValidationIssue = {
  field: string
  label: string
  tab: string
  message: string
}

const REQUIRED_FIELD_META: Record<
  (typeof REQUIRED_SCALAR_FIELDS)[number],
  { label: string; tab: string }
> = {
  fullName: { label: "Full name", tab: "Basics" },
  phone: { label: "Phone", tab: "Basics" },
  location: { label: "Location", tab: "Basics" },
  linkedinUrl: { label: "LinkedIn URL", tab: "Links" },
  portfolioUrl: { label: "Portfolio URL", tab: "Links" },
  githubUrl: { label: "GitHub URL", tab: "Links" },
  yearsExperience: { label: "Years of experience", tab: "Basics" },
  summary: { label: "Professional summary", tab: "Basics" },
  education: { label: "Education", tab: "Basics" },
  skills: { label: "Skills", tab: "Basics" },
  resumeFileName: { label: "Resume file", tab: "Resume" },
  resumeContent: { label: "Resume text", tab: "Resume" },
  desiredRoles: { label: "Desired roles", tab: "Preferences" },
  salaryExpectation: { label: "Salary expectation", tab: "Preferences" },
  workPreference: { label: "Work preference", tab: "Preferences" },
  availability: { label: "Availability", tab: "Preferences" },
}

function getWorkExperienceIssue(
  entries: WorkExperienceEntry[]
): OnboardingValidationIssue | null {
  if (entries.some(isWorkExperienceValid)) {
    return null
  }

  const entry =
    entries.find((item) =>
      Boolean(
        item.title.trim() ||
          item.company.trim() ||
          item.description.trim() ||
          item.joinMonth ||
          item.joinYear ||
          item.currentCtc.trim() ||
          item.endMonth ||
          item.endYear
      )
    ) ?? entries[0]

  if (!entry) {
    return {
      field: "workExperiences",
      label: "Work experience",
      tab: "Experience",
      message: "Add at least one complete work experience entry in the Experience tab.",
    }
  }

  const missing: string[] = []

  if (!entry.title.trim()) missing.push("title")
  if (!entry.company.trim()) missing.push("company")
  if (!entry.description.trim()) missing.push("description")
  if (!entry.joinMonth || !entry.joinYear) missing.push("start month/year")
  if (entry.isCurrent) {
    if (!entry.currentCtc.trim()) missing.push("current CTC")
  } else if (!entry.endMonth || !entry.endYear) {
    missing.push("end month/year")
  }

  return {
    field: "workExperiences",
    label: "Work experience",
    tab: "Experience",
    message:
      missing.length > 0
        ? `Complete one work experience entry in the Experience tab: missing ${missing.join(", ")}.`
        : "Add at least one complete work experience entry in the Experience tab.",
  }
}

export function getOnboardingValidationIssues(
  data: CandidateProfileData
): OnboardingValidationIssue[] {
  const synced = syncLegacyFields(data)

  const scalarIssues = REQUIRED_SCALAR_FIELDS.flatMap((field) => {
    const value = synced[field]
    if (typeof value === "string" && value.trim()) return []

    const meta = REQUIRED_FIELD_META[field]
    return [
      {
        field,
        label: meta.label,
        tab: meta.tab,
        message: `${meta.label} is required in the ${meta.tab} tab.`,
      },
    ]
  })

  const workIssue = getWorkExperienceIssue(synced.workExperiences)

  return workIssue ? [...scalarIssues, workIssue] : scalarIssues
}

export function formatOnboardingValidationError(issues: OnboardingValidationIssue[]): string {
  if (issues.length === 0) return "Please fill in all required fields before completing onboarding"

  return [
    "Complete the missing profile fields before finishing onboarding:",
    ...issues.map((issue) => `• ${issue.label} — ${issue.tab} tab`),
  ].join("\n")
}

export function isOnboardingComplete(data: CandidateProfileData): boolean {
  return getOnboardingValidationIssues(data).length === 0
}

export function profileToFormData(profile: CandidateProfileData): FormData {
  const synced = syncLegacyFields(profile)
  const formData = new FormData()
  const scalarKeys: (keyof CandidateProfileData)[] = [
    "fullName", "phone", "location", "linkedinUrl", "portfolioUrl", "githubUrl",
    "currentTitle", "yearsExperience", "summary", "workExperience", "education",
    "skills", "certifications", "resumeFileName", "resumeMimeType", "resumeStorageKey", "resumeFileUrl", "resumeFileSize", "resumeFileData", "resumeContent",
    "desiredRoles", "salaryExpectation", "workPreference", "availability",
  ]
  for (const key of scalarKeys) {
    formData.append(key, String(synced[key]))
  }
  formData.append("workExperiences", JSON.stringify(synced.workExperiences))
  formData.append("projects", JSON.stringify(synced.projects))
  formData.append("certificates", JSON.stringify(synced.certificates))
  return formData
}
