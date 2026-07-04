"use client"

import { useState } from "react"
import { Save, User, Briefcase, FolderKanban, Award, Link2, Target } from "lucide-react"
import type { CandidateProfileData } from "@/lib/candidate-profile"
import { syncLegacyFields } from "@/lib/candidate-profile"
import { WorkExperienceEditor } from "@/components/profile/work-experience-editor"
import { ProjectsEditor } from "@/components/profile/projects-editor"
import { CertificatesEditor } from "@/components/profile/certificates-editor"
import { FormField } from "@/components/profile/profile-fields"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"

type ProfileSection = "basics" | "work" | "projects" | "certificates" | "links" | "preferences"

const SECTIONS: { id: ProfileSection; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "basics", label: "Basics", icon: User },
  { id: "work", label: "Experience", icon: Briefcase },
  { id: "projects", label: "Projects", icon: FolderKanban },
  { id: "certificates", label: "Certificates", icon: Award },
  { id: "links", label: "Links", icon: Link2 },
  { id: "preferences", label: "Preferences", icon: Target },
]

type ProfileEditorProps = {
  profile: CandidateProfileData
  onChange: (profile: CandidateProfileData) => void
  onSave: () => Promise<void>
  saving?: boolean
  error?: string | null
}

export function ProfileEditor({ profile, onChange, onSave, saving, error }: ProfileEditorProps) {
  const emptySelectValue = "__empty__"
  const [section, setSection] = useState<ProfileSection>("basics")
  const [saved, setSaved] = useState(false)

  const update = (patch: Partial<CandidateProfileData>) => {
    onChange(syncLegacyFields({ ...profile, ...patch }))
    setSaved(false)
  }

  const handleSave = async () => {
    await onSave()
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <Tabs
        value={section}
        onValueChange={(value) => setSection(value as ProfileSection)}
        orientation="vertical"
        className="lg:w-52 shrink-0"
      >
        <TabsList className="flex h-auto w-full flex-row overflow-x-auto rounded-xl border border-border bg-muted/50 p-1 lg:flex-col lg:items-stretch">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <TabsTrigger
              key={id}
              value={id}
              className="justify-start gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm"
            >
              <Icon className="h-4 w-4" />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex-1 min-w-0 space-y-6">
        {section === "basics" && (
          <div className="space-y-5">
            <SectionTitle title="Basic information" description="Your core details used in outreach drafts" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Full name">
                <Input value={profile.fullName} onChange={(e) => update({ fullName: e.target.value })} className="h-9" />
              </FormField>
              <FormField label="Phone">
                <Input value={profile.phone} onChange={(e) => update({ phone: e.target.value })} className="h-9" />
              </FormField>
              <FormField label="Location">
                <Input value={profile.location} onChange={(e) => update({ location: e.target.value })} className="h-9" />
              </FormField>
              <FormField label="Years of experience">
                <Input
                  type="number"
                  value={profile.yearsExperience}
                  onChange={(e) => update({ yearsExperience: e.target.value })}
                  className="h-9"
                />
              </FormField>
            </div>
            <FormField label="Professional summary">
              <Textarea
                value={profile.summary}
                onChange={(e) => update({ summary: e.target.value })}
                className="min-h-24 resize-y"
              />
            </FormField>
            <FormField label="Skills" hint="Comma-separated">
              <Textarea
                value={profile.skills}
                onChange={(e) => update({ skills: e.target.value })}
                className="min-h-20 resize-y"
              />
            </FormField>
            <FormField label="Education">
              <Textarea
                value={profile.education}
                onChange={(e) => update({ education: e.target.value })}
                className="min-h-20 resize-y"
              />
            </FormField>
          </div>
        )}

        {section === "work" && (
          <WorkExperienceEditor
            entries={profile.workExperiences}
            onChange={(workExperiences) => update({ workExperiences })}
            compact
          />
        )}

        {section === "projects" && (
          <ProjectsEditor
            entries={profile.projects}
            onChange={(projects) => update({ projects })}
            compact
          />
        )}

        {section === "certificates" && (
          <CertificatesEditor
            entries={profile.certificates}
            onChange={(certificates) => update({ certificates })}
            compact
          />
        )}

        {section === "links" && (
          <div className="space-y-5">
            <SectionTitle title="Links" description="Profiles and portfolios recruiters may visit" />
            <div className="space-y-4">
              <FormField label="LinkedIn">
                <Input value={profile.linkedinUrl} onChange={(e) => update({ linkedinUrl: e.target.value })} className="h-9" />
              </FormField>
              <FormField label="Portfolio">
                <Input value={profile.portfolioUrl} onChange={(e) => update({ portfolioUrl: e.target.value })} className="h-9" />
              </FormField>
              <FormField label="GitHub">
                <Input value={profile.githubUrl} onChange={(e) => update({ githubUrl: e.target.value })} className="h-9" />
              </FormField>
            </div>
          </div>
        )}

        {section === "preferences" && (
          <div className="space-y-5">
            <SectionTitle title="Job preferences" description="What you're looking for in your next role" />
            <div className="space-y-4">
              <FormField label="Desired roles">
                <Input value={profile.desiredRoles} onChange={(e) => update({ desiredRoles: e.target.value })} className="h-9" />
              </FormField>
              <FormField label="Salary expectation">
                <Input value={profile.salaryExpectation} onChange={(e) => update({ salaryExpectation: e.target.value })} className="h-9" />
              </FormField>
              <FormField label="Work preference">
                <Select
                  value={profile.workPreference || emptySelectValue}
                  onValueChange={(value) => update({ workPreference: value === emptySelectValue ? "" : value })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={emptySelectValue}>Select...</SelectItem>
                    <SelectItem value="remote">Remote</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                    <SelectItem value="onsite">On-site</SelectItem>
                    <SelectItem value="flexible">Flexible</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Availability">
                <Input value={profile.availability} onChange={(e) => update({ availability: e.target.value })} className="h-9" />
              </FormField>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border pt-4">
          {error ? <span className="mr-auto text-sm text-destructive">{error}</span> : null}
          {saved && <span className="text-xs text-muted-foreground">Saved</span>}
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save profile"}
          </Button>
        </div>
      </div>
    </div>
  )
}

function SectionTitle({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1">{description}</p>
    </div>
  )
}
