import type { CandidateProfileData } from "@/lib/candidate-profile"
import {
  buildQuickStepQueue,
  buildStepQueue,
  resolveStepIndex,
  stepKey,
  type StepId,
} from "@/lib/onboarding-steps"

export type OnboardingProgress = {
  version: 1
  mode: "quick" | "full"
  flowPhase: "resume" | "steps"
  currentStepKey: string
  aiFilledFields: string[]
  revealDismissed: boolean
}

export type FlowPhase = "resume" | "extracting" | "steps"

export function toOnboardingProgress(params: {
  mode: "quick" | "full"
  flowPhase: "resume" | "steps"
  currentStep: StepId
  aiFilledFields: Set<keyof CandidateProfileData>
  revealDismissed: boolean
}): OnboardingProgress {
  return {
    version: 1,
    mode: params.mode,
    flowPhase: params.flowPhase,
    currentStepKey: stepKey(params.currentStep),
    aiFilledFields: [...params.aiFilledFields],
    revealDismissed: params.revealDismissed,
  }
}

export function parseOnboardingProgress(raw: unknown): OnboardingProgress | null {
  if (!raw || typeof raw !== "object") return null

  const data = raw as Record<string, unknown>
  if (data.version !== 1) return null
  if (data.mode !== "quick" && data.mode !== "full") return null
  if (data.flowPhase !== "resume" && data.flowPhase !== "steps") return null
  if (typeof data.currentStepKey !== "string" || !data.currentStepKey) return null
  if (!Array.isArray(data.aiFilledFields)) return null
  if (!data.aiFilledFields.every((field) => typeof field === "string")) return null
  if (typeof data.revealDismissed !== "boolean") return null

  return {
    version: 1,
    mode: data.mode,
    flowPhase: data.flowPhase,
    currentStepKey: data.currentStepKey,
    aiFilledFields: data.aiFilledFields,
    revealDismissed: data.revealDismissed,
  }
}

export function shouldIncludeReveal(progress: OnboardingProgress): boolean {
  return !progress.revealDismissed && progress.aiFilledFields.length > 0
}

export function parseAiFilledFields(
  fields: string[]
): Set<keyof CandidateProfileData> {
  return new Set(fields as (keyof CandidateProfileData)[])
}

export function buildQueueForProgress(
  profile: CandidateProfileData,
  progress: OnboardingProgress
): StepId[] {
  const aiFilledFields = parseAiFilledFields(progress.aiFilledFields)
  const includeReveal = shouldIncludeReveal(progress)

  return progress.mode === "quick"
    ? buildQuickStepQueue(profile, aiFilledFields, { includeReveal })
    : buildStepQueue(profile, aiFilledFields, { includeReveal })
}

export function restoreStepFlowFromProgress(
  profile: CandidateProfileData,
  progress: OnboardingProgress
): {
  stepQueue: StepId[]
  stepIndex: number
  aiFilledFields: Set<keyof CandidateProfileData>
  revealDismissed: boolean
} {
  const aiFilledFields = parseAiFilledFields(progress.aiFilledFields)
  const stepQueue = buildQueueForProgress(profile, progress)
  const stepIndex = resolveStepIndex(stepQueue, progress.currentStepKey)

  return {
    stepQueue,
    stepIndex,
    aiFilledFields,
    revealDismissed: progress.revealDismissed,
  }
}
