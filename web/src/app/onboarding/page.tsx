"use client"

import { useSession } from "next-auth/react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { AnimatePresence } from "framer-motion"
import { ChevronLeft, ChevronRight, Check } from "lucide-react"
import { getOnboardingData, saveCandidateProfile } from "../actions"
import type { CandidateProfileData } from "@/lib/candidate-profile"
import { emptyProfile, syncLegacyFields, profileToFormData } from "@/lib/candidate-profile"
import { mapExtractionToProfile } from "@/lib/resume-extract"
import { extractTextFromFile } from "@/lib/pdf-extract"
import {
  QUESTION_FIELD_ORDER,
  FIELD_LABELS,
} from "@/lib/onboarding-fields"
import {
  buildStepQueue,
  stepKey,
  getStepField,
  canContinueStep,
  type StepId,
} from "@/lib/onboarding-steps"
import { OnboardingShell } from "@/components/onboarding/onboarding-shell"
import { ResumeUploadStep } from "@/components/onboarding/resume-upload-step"
import {
  QuestionStep,
  ExtractionRevealStep,
} from "@/components/onboarding/question-step"
import { LocationStep } from "@/components/onboarding/location-step"
import { SkillsChipsStep } from "@/components/onboarding/skills-chips-step"
import { WorkExperienceStep } from "@/components/onboarding/work-experience-step"
import { ProjectsStep } from "@/components/onboarding/projects-step"
import { CertificatesStep } from "@/components/onboarding/certificates-step"
import { ReviewStep } from "@/components/onboarding/review-step"
import { Button } from "@/components/ui/button"
import { useUploadThing } from "@/lib/uploadthing-client"

const emptyProfileState = emptyProfile()

type FlowPhase = "resume" | "extracting" | "steps"

export default function OnboardingPage() {
  const { status } = useSession()
  const router = useRouter()
  const [profile, setProfile] = useState<CandidateProfileData>(emptyProfileState)
  const [aiFilledFields, setAiFilledFields] = useState<Set<keyof CandidateProfileData>>(
    new Set()
  )
  const [flowPhase, setFlowPhase] = useState<FlowPhase>("resume")
  const [stepQueue, setStepQueue] = useState<StepId[]>([])
  const [stepIndex, setStepIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [skillConfirmed, setSkillConfirmed] = useState<string[]>([])
  const [skillSuggested, setSkillSuggested] = useState<string[]>([])
  const [skillsLoading, setSkillsLoading] = useState(false)
  const [skillsFetched, setSkillsFetched] = useState(false)
  const { startUpload } = useUploadThing("resumeUploader")

  const currentStep = stepQueue[stepIndex] ?? "review"
  const progress =
    flowPhase === "resume"
      ? 5
      : flowPhase === "extracting"
        ? 15
        : stepQueue.length > 0
          ? ((stepIndex + 1) / stepQueue.length) * 100
          : 0

  const startStepFlow = useCallback(
    (
      nextProfile: CandidateProfileData,
      filled: Set<keyof CandidateProfileData>,
      includeReveal: boolean
    ) => {
      setStepQueue(buildStepQueue(nextProfile, filled, { includeReveal }))
      setStepIndex(0)
      setFlowPhase("steps")
    },
    []
  )

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/")
      return
    }

    if (status === "authenticated") {
      getOnboardingData().then((data) => {
        if (data?.onboardingComplete) {
          router.replace("/dashboard")
          return
        }
        if (data?.profile) {
          setProfile(data.profile)
          if (data.profile.resumeContent.trim()) {
            startStepFlow(data.profile, new Set(), false)
          }
        } else if (data?.name) {
          setProfile((prev) => ({ ...prev, fullName: data.name ?? "" }))
        }
        setLoading(false)
      })
    }
  }, [status, router, startStepFlow])

  const updateField = useCallback(
    (field: keyof CandidateProfileData, value: string) => {
      setProfile((prev) => syncLegacyFields({ ...prev, [field]: value }))
    },
    []
  )

  const updateProfilePatch = useCallback((patch: Partial<CandidateProfileData>) => {
    setProfile((prev) => syncLegacyFields({ ...prev, ...patch }))
  }, [])

  const buildFormData = useCallback(() => profileToFormData(profile), [profile])

  const fetchSkillSuggestions = useCallback(async () => {
    if (skillsFetched || !profile.currentTitle.trim()) return

    setSkillsLoading(true)
    try {
      const existing = profile.skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)

      const res = await fetch("/api/onboarding/suggest-skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentTitle: profile.currentTitle,
          yearsExperience: profile.yearsExperience,
          existingSkills: existing,
        }),
      })

      if (res.ok) {
        const json = await res.json()
        const confirmed = [
          ...new Set([...existing, ...(json.data.confirmed as string[])]),
        ]
        setSkillConfirmed(confirmed)
        setSkillSuggested(json.data.suggested as string[])
        setProfile((prev) => ({ ...prev, skills: confirmed.join(", ") }))
      } else if (existing.length) {
        setSkillConfirmed(existing)
      }
    } catch {
      const existing = profile.skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
      setSkillConfirmed(existing)
    } finally {
      setSkillsLoading(false)
      setSkillsFetched(true)
    }
  }, [profile.currentTitle, profile.yearsExperience, profile.skills, skillsFetched])

  useEffect(() => {
    if (flowPhase === "steps" && currentStep === "skills" && !skillsFetched) {
      fetchSkillSuggestions()
    }
  }, [flowPhase, currentStep, skillsFetched, fetchSkillSuggestions])

  const handleResumeUpload = async (file: File) => {
    setFlowPhase("extracting")
    setError(null)
    setSkillsFetched(false)

    try {
      const [text, uploadedFiles] = await Promise.all([
        extractTextFromFile(file),
        startUpload([file]),
      ])
      const uploaded = uploadedFiles?.[0]

      if (!uploaded) {
        throw new Error("Resume upload failed")
      }

      const res = await fetch("/api/onboarding/extract-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      })

      const json = res.ok ? await res.json() : null

      let extractedProfile: Partial<CandidateProfileData> = {}
      let filled = new Set<keyof CandidateProfileData>()

      if (json?.data) {
        const mapped = mapExtractionToProfile(json.data)
        extractedProfile = mapped.profile
        filled = new Set(mapped.aiFilledFields)
      }

      const nextProfile: CandidateProfileData = syncLegacyFields({
        ...profile,
        ...extractedProfile,
        resumeFileName: uploaded.serverData?.fileName || uploaded.name || file.name,
        resumeMimeType: uploaded.serverData?.fileType || uploaded.type || file.type || "application/octet-stream",
        resumeStorageKey: uploaded.serverData?.storageKey || uploaded.key || "",
        resumeFileUrl: uploaded.serverData?.fileUrl || uploaded.ufsUrl || uploaded.url || "",
        resumeFileSize: String(uploaded.serverData?.fileSize || uploaded.size || file.size || ""),
        resumeFileData: "",
        resumeContent: text,
        workExperiences: extractedProfile.workExperiences ?? profile.workExperiences,
        projects: extractedProfile.projects ?? profile.projects,
        certificates: extractedProfile.certificates ?? profile.certificates,
      })

      setProfile(nextProfile)
      setAiFilledFields(filled)
      startStepFlow(nextProfile, filled, filled.size > 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to read resume")
      setFlowPhase("resume")
    }
  }

  const saveDraft = async () => {
    await saveCandidateProfile(buildFormData(), false)
  }

  const goNext = async () => {
    setError(null)
    setSaving(true)
    try {
      // Clear AI highlight on fields the user just confirmed
      const field = getStepField(currentStep)
      if (field) {
        setAiFilledFields((prev) => {
          const next = new Set(prev)
          next.delete(field)
          return next
        })
      }

      await saveDraft()

      if (currentStep === "reveal") {
        setStepQueue((prev) => prev.slice(1))
        setStepIndex(0)
      } else {
        setStepIndex((prev) => Math.min(prev + 1, stepQueue.length - 1))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save progress")
    } finally {
      setSaving(false)
    }
  }

  const goBack = () => {
    setError(null)
    setStepIndex((prev) => Math.max(prev - 1, 0))
  }

  const handleComplete = async () => {
    setSaving(true)
    setError(null)
    try {
      await saveCandidateProfile(buildFormData(), true)
      router.push("/dashboard")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to complete onboarding")
    } finally {
      setSaving(false)
    }
  }

  const canContinue = (): boolean => {
    if (flowPhase !== "steps") return false
    return canContinueStep(currentStep, profile, skillsLoading)
  }

  const revealFields = useMemo(
    () =>
      Object.entries(FIELD_LABELS).map(([key, label]) => ({
        key: key as keyof CandidateProfileData,
        label,
      })),
    []
  )

  if (loading || status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  const isLastStep = flowPhase === "steps" && stepIndex === stepQueue.length - 1
  const showBack = flowPhase === "steps" && stepIndex > 0
  const showFooter = flowPhase === "steps"

  const questionConfig =
    typeof currentStep === "object" && currentStep.type === "question"
      ? QUESTION_FIELD_ORDER.find((f) => f.key === currentStep.field)
      : null

  const currentField = questionConfig?.key

  return (
    <OnboardingShell
      progress={progress}
      footer={
        showFooter ? (
          <div className="space-y-3">
            {error && <p className="text-sm text-destructive whitespace-pre-line">{error}</p>}
            <div className="flex justify-between gap-4">
              {showBack ? (
                <Button type="button" variant="ghost" onClick={goBack} disabled={saving}>
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </Button>
              ) : (
                <div />
              )}

              {isLastStep ? (
                <Button type="button" onClick={handleComplete} disabled={saving}>
                  {saving ? "Finishing..." : (
                    <>
                      <Check className="h-4 w-4" />
                      Complete setup
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={goNext}
                  disabled={saving || !canContinue()}
                >
                  {saving ? "Saving..." : "Continue"}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ) : undefined
      }
    >
      <AnimatePresence mode="wait">
        {flowPhase === "extracting" ? (
          <div key="extracting" className="flex-1 flex flex-col justify-center items-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mb-4" />
            <p className="text-lg font-medium text-foreground">Reading your resume...</p>
            <p className="text-muted-foreground mt-2">Extracting your details with AI</p>
          </div>
        ) : flowPhase === "resume" ? (
          <ResumeUploadStep
            key="resume"
            onUpload={handleResumeUpload}
            uploading={false}
            error={error}
          />
        ) : currentStep === "reveal" ? (
          <ExtractionRevealStep
            key="reveal"
            fields={revealFields}
            profile={profile}
            aiFilledFields={aiFilledFields}
          />
        ) : currentStep === "location" ? (
          <LocationStep
            key="location"
            value={profile.location}
            onChange={(v) => updateField("location", v)}
            aiFilled={aiFilledFields.has("location")}
          />
        ) : currentStep === "skills" ? (
          <SkillsChipsStep
            key="skills"
            confirmed={skillConfirmed}
            suggested={skillSuggested}
            customSkills={profile.skills
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
              .filter((s) => !skillConfirmed.includes(s) && !skillSuggested.includes(s))}
            loading={skillsLoading}
            onChange={(skills) => {
              setSkillConfirmed(skills)
              updateField("skills", skills.join(", "))
            }}
          />
        ) : currentStep === "work" ? (
          <WorkExperienceStep
            key="work"
            entries={profile.workExperiences}
            onChange={(workExperiences) => updateProfilePatch({ workExperiences })}
          />
        ) : currentStep === "projects" ? (
          <ProjectsStep
            key="projects"
            entries={profile.projects}
            onChange={(projects) => updateProfilePatch({ projects })}
          />
        ) : currentStep === "certificates" ? (
          <CertificatesStep
            key="certificates"
            entries={profile.certificates}
            onChange={(certificates) => updateProfilePatch({ certificates })}
          />
        ) : currentStep === "review" ? (
          <ReviewStep
            key="review"
            profile={profile}
            aiFilledFields={aiFilledFields}
            onUpdate={updateField}
            onProfilePatch={updateProfilePatch}
          />
        ) : questionConfig && currentField ? (
          <QuestionStep
            key={stepKey(currentStep)}
            config={questionConfig}
            value={String(profile[currentField] ?? "")}
            onChange={(v) => updateField(currentField, v)}
            aiFilled={aiFilledFields.has(currentField)}
          />
        ) : null}
      </AnimatePresence>
    </OnboardingShell>
  )
}
