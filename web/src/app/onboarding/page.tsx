"use client"

import { useSession } from "next-auth/react"
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { AnimatePresence } from "framer-motion"
import { ChevronLeft, ChevronRight, Check } from "lucide-react"
import { getOnboardingData, saveCandidateProfile } from "../actions"
import type { CandidateProfileData } from "@/lib/candidate-profile"
import {
  emptyProfile,
  isOnboardingComplete,
  syncLegacyFields,
  profileToFormData,
  PROFILE_CONFLICT_ERROR,
} from "@/lib/candidate-profile"
import { mapExtractionToProfile } from "@/lib/resume-extract"
import { extractTextFromFile } from "@/lib/pdf-extract"
import {
  QUESTION_FIELD_ORDER,
  FIELD_LABELS,
} from "@/lib/onboarding-fields"
import {
  buildStepQueue,
  buildQuickStepQueue,
  stepKey,
  getStepField,
  getStepLabel,
  canContinueStep,
  type StepId,
} from "@/lib/onboarding-steps"
import {
  restoreStepFlowFromProgress,
  toOnboardingProgress,
  type OnboardingProgress,
} from "@/lib/onboarding-progress"
import { ToneStep } from "@/components/onboarding/tone-step"
import { WhatsNextStep } from "@/components/onboarding/whats-next-step"
import type { ExtensionSetupStatus } from "@/hooks/use-extension-setup-status"
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
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      }
    >
      <OnboardingContent />
    </Suspense>
  )
}

function OnboardingContent() {
  const { status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlMode = searchParams.get("full") === "true" ? "full" : "quick"
  const [onboardingMode, setOnboardingMode] = useState<"quick" | "full">(urlMode)
  const [profile, setProfile] = useState<CandidateProfileData>(emptyProfileState)
  const [aiFilledFields, setAiFilledFields] = useState<Set<keyof CandidateProfileData>>(
    new Set()
  )
  const [revealDismissed, setRevealDismissed] = useState(false)
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
  const [extensionSetup, setExtensionSetup] = useState<ExtensionSetupStatus | null>(null)
  const whatsNextFinalizedRef = useRef(false)
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
      includeReveal: boolean,
      mode: "quick" | "full" = onboardingMode
    ): StepId[] => {
      const queue =
        mode === "quick"
          ? buildQuickStepQueue(nextProfile, filled, { includeReveal })
          : buildStepQueue(nextProfile, filled, { includeReveal })
      setOnboardingMode(mode)
      setStepQueue(queue)
      setStepIndex(0)
      setFlowPhase("steps")
      return queue
    },
    [onboardingMode]
  )

  const persistProgress = useCallback(
    async (
      progress: OnboardingProgress,
      profileData: CandidateProfileData = profile
    ) => {
      const result = await saveCandidateProfile(profileToFormData(profileData), false, progress)
      setProfile((prev) => ({ ...prev, version: result.version }))
    },
    [profile]
  )

  const persistStepEntry = useCallback(
    async (
      nextStep: StepId,
      progress: OnboardingProgress,
      profileData: CandidateProfileData = profile
    ) => {
      if (nextStep === "whats-next" && isOnboardingComplete(profileData)) {
        const result = await saveCandidateProfile(profileToFormData(profileData), true, progress)
        setProfile((prev) => ({ ...prev, version: result.version }))
        return
      }
      await persistProgress(progress, profileData)
    },
    [persistProgress, profile]
  )

  useEffect(() => {
    if (currentStep !== "whats-next" || whatsNextFinalizedRef.current) return
    if (!isOnboardingComplete(profile)) return

    whatsNextFinalizedRef.current = true
    void saveCandidateProfile(
      profileToFormData(profile),
      true,
      toOnboardingProgress({
        mode: onboardingMode,
        flowPhase: "steps",
        currentStep: "whats-next",
        aiFilledFields,
        revealDismissed,
      })
    )
      .then((result) => {
        setProfile((prev) => ({ ...prev, version: result.version }))
      })
      .catch(() => {
        whatsNextFinalizedRef.current = false
      })
  }, [currentStep, profile, onboardingMode, aiFilledFields, revealDismissed])

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/")
      return
    }

    if (status !== "authenticated") return

    let cancelled = false

    getOnboardingData()
      .then((data) => {
        if (cancelled) return
        if (data?.onboardingComplete) {
          router.replace("/dashboard")
          return
        }
        if (data?.profile) {
          setProfile(data.profile)
        } else if (data?.name) {
          setProfile((prev) => ({ ...prev, fullName: data.name ?? "" }))
        }

        const savedProgress = data?.onboardingProgress
        if (savedProgress?.flowPhase === "steps" && data?.profile) {
          const restored = restoreStepFlowFromProgress(data.profile, savedProgress)
          setOnboardingMode(savedProgress.mode)
          setStepQueue(restored.stepQueue)
          setStepIndex(restored.stepIndex)
          setAiFilledFields(restored.aiFilledFields)
          setRevealDismissed(restored.revealDismissed)
          setFlowPhase("steps")
        } else if (data?.profile?.resumeContent.trim()) {
          startStepFlow(data.profile, new Set(), false, urlMode)
        }
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) {
          setError("We couldn't load your profile. Please try again.")
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [status, router, startStepFlow, urlMode])

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
        const confirmedRaw = json?.data?.confirmed
        const suggestedRaw = json?.data?.suggested
        const confirmedList = Array.isArray(confirmedRaw)
          ? confirmedRaw.filter((s): s is string => typeof s === "string")
          : []
        const suggestedList = Array.isArray(suggestedRaw)
          ? suggestedRaw.filter((s): s is string => typeof s === "string")
          : []
        const confirmed = [...new Set([...existing, ...confirmedList])]
        setSkillConfirmed(confirmed)
        setSkillSuggested(suggestedList)
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
      const id = requestAnimationFrame(() => {
        void fetchSkillSuggestions()
      })
      return () => cancelAnimationFrame(id)
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
      setRevealDismissed(false)
      const queue = startStepFlow(nextProfile, filled, filled.size > 0, urlMode)
      const firstStep = queue[0]
      if (firstStep) {
        await persistProgress(
          toOnboardingProgress({
            mode: urlMode,
            flowPhase: "steps",
            currentStep: firstStep,
            aiFilledFields: filled,
            revealDismissed: false,
          }),
          nextProfile
        )
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to read resume")
      setFlowPhase("resume")
    }
  }

  const handleManualEntry = async () => {
    setError(null)
    const queue = startStepFlow(profile, new Set(), false, urlMode)
    const firstStep = queue[0]
    if (!firstStep) return

    try {
      await persistProgress(
        toOnboardingProgress({
          mode: urlMode,
          flowPhase: "steps",
          currentStep: firstStep,
          aiFilledFields: new Set(),
          revealDismissed: false,
        })
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save progress")
    }
  }

  const goNext = async () => {
    setError(null)
    setSaving(true)
    try {
      const field = getStepField(currentStep)
      const nextAiFilledFields = new Set(aiFilledFields)
      if (field) {
        nextAiFilledFields.delete(field)
      }

      let nextQueue = stepQueue
      let nextIndex: number
      let nextRevealDismissed = revealDismissed

      if (currentStep === "reveal") {
        nextQueue = stepQueue.slice(1)
        nextIndex = 0
        nextRevealDismissed = true
      } else {
        nextIndex = Math.min(stepIndex + 1, stepQueue.length - 1)
      }

      const nextStep = nextQueue[nextIndex]
      if (!nextStep) {
        throw new Error("Invalid step")
      }

      await persistStepEntry(
        nextStep,
        toOnboardingProgress({
          mode: onboardingMode,
          flowPhase: "steps",
          currentStep: nextStep,
          aiFilledFields: nextAiFilledFields,
          revealDismissed: nextRevealDismissed,
        })
      )

      setAiFilledFields(nextAiFilledFields)
      setRevealDismissed(nextRevealDismissed)
      if (currentStep === "reveal") {
        setStepQueue(nextQueue)
      }
      setStepIndex(nextIndex)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save progress")
    } finally {
      setSaving(false)
    }
  }

  const goBack = async () => {
    setError(null)
    const nextIndex = Math.max(stepIndex - 1, 0)
    const nextStep = stepQueue[nextIndex]
    if (!nextStep) return

    setStepIndex(nextIndex)
    try {
      await persistProgress(
        toOnboardingProgress({
          mode: onboardingMode,
          flowPhase: "steps",
          currentStep: nextStep,
          aiFilledFields,
          revealDismissed,
        })
      )
    } catch (err) {
      setStepIndex(stepIndex)
      setError(err instanceof Error ? err.message : "Failed to save progress")
    }
  }

  const handleComplete = async () => {
    setSaving(true)
    setError(null)
    try {
      await saveCandidateProfile(buildFormData(), true)
      router.push("/dashboard/extension")
    } catch (err) {
      if (err instanceof Error && err.message === PROFILE_CONFLICT_ERROR) {
        const fresh = await getOnboardingData().catch(() => null)
        if (fresh?.profile) {
          setProfile((prev) => ({ ...prev, version: fresh.profile!.version }))
        }
        setError("Your profile was updated elsewhere while you were editing. We've refreshed it — your changes here are still intact, just try again.")
      } else {
        setError(err instanceof Error ? err.message : "Failed to complete onboarding")
      }
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
      stepLabel={
        flowPhase === "steps" && stepQueue.length > 0
          ? getStepLabel(currentStep, stepIndex, stepQueue.length)
          : undefined
      }
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
                      {extensionSetup?.extensionConnected
                        ? "Finish and open dashboard"
                        : "Complete setup"}
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
            onManualEntry={handleManualEntry}
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
            aiFilled={aiFilledFields.has("workExperiences")}
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
        ) : currentStep === "tone" ? (
          <ToneStep
            key="tone"
            value={profile.outreachTone}
            onChange={(v) => updateField("outreachTone", v)}
          />
        ) : currentStep === "whats-next" ? (
          <WhatsNextStep key="whats-next" onStatusChange={setExtensionSetup} />
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
