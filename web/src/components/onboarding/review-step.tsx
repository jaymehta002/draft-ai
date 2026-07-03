"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Pencil, Check } from "lucide-react"
import type { CandidateProfileData } from "@/lib/candidate-profile"
import { MONTHS } from "@/lib/candidate-profile"
import {
  REVIEW_SECTIONS,
  FIELD_LABELS,
  QUESTION_FIELD_ORDER,
} from "@/lib/onboarding-fields"
import { WorkExperienceEditor } from "@/components/profile/work-experience-editor"
import { ProjectsEditor } from "@/components/profile/projects-editor"
import { CertificatesEditor } from "@/components/profile/certificates-editor"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

function getFieldConfig(key: keyof CandidateProfileData) {
  return QUESTION_FIELD_ORDER.find((f) => f.key === key)
}

function formatMonthYear(month: string, year: string) {
  if (!month || !year) return ""
  const label = MONTHS.find((m) => m.value === month)?.label?.slice(0, 3) ?? month
  return `${label} ${year}`
}

export function ReviewStep({
  profile,
  aiFilledFields,
  onUpdate,
  onProfilePatch,
}: {
  profile: CandidateProfileData
  aiFilledFields: Set<keyof CandidateProfileData>
  onUpdate: (field: keyof CandidateProfileData, value: string) => void
  onProfilePatch: (patch: Partial<CandidateProfileData>) => void
}) {
  const [editing, setEditing] = useState<keyof CandidateProfileData | null>(null)
  const [editValue, setEditValue] = useState("")
  const [editingStructured, setEditingStructured] = useState<"work" | "projects" | "certificates" | null>(null)

  const startEdit = (field: keyof CandidateProfileData) => {
    setEditing(field)
    setEditValue(String(profile[field] ?? ""))
    setEditingStructured(null)
  }

  const saveEdit = () => {
    if (editing) {
      onUpdate(editing, editValue)
      setEditing(null)
    }
  }

  const formatValue = (field: keyof CandidateProfileData, value: string) => {
    if (field === "workPreference") {
      const opt = getFieldConfig(field)?.options?.find((o) => o.value === value)
      return opt?.label ?? value
    }
    if (field === "resumeFileName") return value || "—"
    if (field === "resumeContent") return value ? `${value.slice(0, 120)}...` : "—"
    return value || "—"
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className="flex-1 flex flex-col"
    >
      <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground mb-2">
        Review your profile
      </h1>
      <p className="text-muted-foreground mb-8">
        Everything look right? Tap any section to edit.
      </p>

      <div className="space-y-6 overflow-y-auto max-h-[55vh] sm:max-h-none pb-4">
        {REVIEW_SECTIONS.map((section) => (
          <div key={section.title}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {section.title}
              </h2>
              {section.type !== "scalar" && (
                <button
                  type="button"
                  onClick={() => {
                    const t = section.type as "work" | "projects" | "certificates"
                    setEditingStructured(editingStructured === t ? null : t)
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  {editingStructured === section.type ? (
                    <><Check className="h-3.5 w-3.5" /> Done</>
                  ) : (
                    <><Pencil className="h-3.5 w-3.5" /> Edit</>
                  )}
                </button>
              )}
            </div>

            {section.type === "work" && (
              editingStructured === "work" ? (
                <WorkExperienceEditor
                  entries={profile.workExperiences}
                  onChange={(workExperiences) => onProfilePatch({ workExperiences })}
                  compact
                />
              ) : (
                <div className="space-y-2">
                  {profile.workExperiences.map((exp) => (
                    <div key={exp.id} className="rounded-xl border border-border/60 px-4 py-3 bg-card">
                      <p className="text-sm font-medium">{exp.title || "—"} at {exp.company || "—"}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatMonthYear(exp.joinMonth, exp.joinYear)}
                        {exp.isCurrent ? " – Present" : exp.endYear ? ` – ${formatMonthYear(exp.endMonth, exp.endYear)}` : ""}
                        {exp.isCurrent && exp.currentCtc ? ` · ${exp.currentCtc}` : ""}
                      </p>
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{exp.description}</p>
                    </div>
                  ))}
                </div>
              )
            )}

            {section.type === "projects" && (
              editingStructured === "projects" ? (
                <ProjectsEditor
                  entries={profile.projects}
                  onChange={(projects) => onProfilePatch({ projects })}
                  compact
                />
              ) : profile.projects.length === 0 ? (
                <p className="text-sm text-muted-foreground">No projects added</p>
              ) : (
                <div className="space-y-2">
                  {profile.projects.map((p) => (
                    <div key={p.id} className="rounded-xl border border-border/60 px-4 py-3 bg-card">
                      <p className="text-sm font-medium">{p.name}</p>
                      {p.technologies && <p className="text-xs text-muted-foreground">{p.technologies}</p>}
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{p.description}</p>
                    </div>
                  ))}
                </div>
              )
            )}

            {section.type === "certificates" && (
              editingStructured === "certificates" ? (
                <CertificatesEditor
                  entries={profile.certificates}
                  onChange={(certificates) => onProfilePatch({ certificates })}
                  compact
                />
              ) : profile.certificates.length === 0 ? (
                <p className="text-sm text-muted-foreground">No certificates added</p>
              ) : (
                <div className="space-y-2">
                  {profile.certificates.map((c) => (
                    <div key={c.id} className="rounded-xl border border-border/60 px-4 py-3 bg-card">
                      <p className="text-sm font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.issuer}</p>
                    </div>
                  ))}
                </div>
              )
            )}

            {section.type === "scalar" && section.fields && (
              <div className="space-y-2">
                {section.fields.map((field) => (
                  <div
                    key={field}
                    className={cn(
                      "rounded-xl border border-border/60 px-4 py-3 bg-card",
                      aiFilledFields.has(field) && "ring-1 ring-primary/20"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">
                        {FIELD_LABELS[field]}
                        {aiFilledFields.has(field) && (
                          <span className="text-primary ml-1">· from resume</span>
                        )}
                      </span>
                      {field !== "resumeContent" && (
                        <button
                          type="button"
                          onClick={() => (editing === field ? saveEdit() : startEdit(field))}
                          className="text-muted-foreground hover:text-foreground p-1"
                        >
                          {editing === field ? (
                            <Check className="h-4 w-4 text-primary" />
                          ) : (
                            <Pencil className="h-3.5 w-3.5" />
                          )}
                        </button>
                      )}
                    </div>

                    <AnimatePresence mode="wait">
                      {editing === field ? (
                        <motion.div key="edit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                          {getFieldConfig(field)?.inputType === "textarea" ? (
                            <Textarea value={editValue} onChange={(e) => setEditValue(e.target.value)} className="text-sm min-h-20" autoFocus />
                          ) : getFieldConfig(field)?.inputType === "select" ? (
                            <select value={editValue} onChange={(e) => setEditValue(e.target.value)} className="w-full rounded-lg border border-input px-3 py-2 text-sm">
                              {getFieldConfig(field)?.options?.map((o) => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                              ))}
                            </select>
                          ) : (
                            <Input value={editValue} onChange={(e) => setEditValue(e.target.value)} className="text-sm h-9" autoFocus />
                          )}
                        </motion.div>
                      ) : (
                        <motion.p key="view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm whitespace-pre-wrap line-clamp-4">
                          {formatValue(field, String(profile[field] ?? ""))}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  )
}
