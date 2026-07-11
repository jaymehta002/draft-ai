import type { CandidateProfileData } from "@/lib/candidate-profile"

export type FieldInputType = "text" | "textarea" | "number" | "select" | "url"

export type FieldConfig = {
  key: keyof CandidateProfileData
  question: string
  placeholder: string
  inputType: FieldInputType
  options?: { value: string; label: string }[]
}

/** Question steps for fields not handled by special steps */
export const QUESTION_FIELD_ORDER: FieldConfig[] = [
  {
    key: "fullName",
    question: "What's your full name?",
    placeholder: "Jane Doe",
    inputType: "text",
  },
  {
    key: "phone",
    question: "What's your phone number?",
    placeholder: "+1 (555) 123-4567",
    inputType: "text",
  },
  {
    key: "currentTitle",
    question: "What's your current job title?",
    placeholder: "Senior Software Engineer",
    inputType: "text",
  },
  {
    key: "yearsExperience",
    question: "How many years of professional experience do you have?",
    placeholder: "5",
    inputType: "number",
  },
  {
    key: "summary",
    question: "Give us a brief professional summary.",
    placeholder: "Brief overview of your background, strengths, and what you're known for...",
    inputType: "textarea",
  },
  {
    key: "education",
    question: "What's your education background?",
    placeholder: "University Name — B.S. Computer Science (2018)",
    inputType: "textarea",
  },
  {
    key: "linkedinUrl",
    question: "What's your LinkedIn profile URL?",
    placeholder: "https://linkedin.com/in/janedoe",
    inputType: "url",
  },
  {
    key: "portfolioUrl",
    question: "Do you have a portfolio or personal website?",
    placeholder: "https://janedoe.dev",
    inputType: "url",
  },
  {
    key: "githubUrl",
    question: "What's your GitHub profile URL?",
    placeholder: "https://github.com/janedoe",
    inputType: "url",
  },
  {
    key: "desiredRoles",
    question: "What roles are you looking for?",
    placeholder: "Senior Frontend Engineer, Staff Engineer",
    inputType: "text",
  },
  {
    key: "salaryExpectation",
    question: "What's your salary expectation?",
    placeholder: "$150k – $180k base + equity",
    inputType: "text",
  },
  {
    key: "workPreference",
    question: "What's your work location preference?",
    placeholder: "",
    inputType: "select",
    options: [
      { value: "remote", label: "Remote" },
      { value: "hybrid", label: "Hybrid" },
      { value: "onsite", label: "On-site" },
      { value: "flexible", label: "Flexible" },
    ],
  },
  {
    key: "availability",
    question: "When can you start?",
    placeholder: "Immediately, 2 weeks notice, open to opportunities",
    inputType: "text",
  },
]

export const REVIEW_SECTIONS: { title: string; type: "scalar" | "work" | "projects" | "certificates"; fields?: (keyof CandidateProfileData)[] }[] = [
  { title: "Basic Info", type: "scalar", fields: ["fullName", "phone", "location", "yearsExperience", "summary"] },
  { title: "Work Experience", type: "work" },
  { title: "Projects", type: "projects" },
  { title: "Certificates", type: "certificates" },
  { title: "Skills & Education", type: "scalar", fields: ["skills", "education"] },
  { title: "Links", type: "scalar", fields: ["linkedinUrl", "portfolioUrl", "githubUrl"] },
  { title: "Preferences", type: "scalar", fields: ["desiredRoles", "salaryExpectation", "workPreference", "availability"] },
  { title: "Resume", type: "scalar", fields: ["resumeFileName"] },
]

export const FIELD_LABELS: Record<keyof CandidateProfileData, string> = {
  fullName: "Full name",
  phone: "Phone",
  location: "Location",
  linkedinUrl: "LinkedIn",
  portfolioUrl: "Portfolio",
  githubUrl: "GitHub",
  currentTitle: "Current title",
  yearsExperience: "Years of experience",
  summary: "Summary",
  workExperience: "Work experience",
  workExperiences: "Work experiences",
  projects: "Projects",
  certificates: "Certificates",
  education: "Education",
  skills: "Skills",
  certifications: "Certifications",
  resumeFileName: "Resume file",
  resumeMimeType: "Resume MIME type",
  resumeStorageKey: "Resume storage key",
  resumeFileUrl: "Resume file URL",
  resumeFileSize: "Resume file size",
  resumeFileData: "Resume file data",
  resumeContent: "Resume",
  desiredRoles: "Desired roles",
  salaryExpectation: "Salary expectation",
  workPreference: "Work location",
  availability: "Availability",
  outreachTone: "Outreach tone",
  draftLength: "Draft length",
  outreachLanguage: "Language",
  version: "Version",
}
