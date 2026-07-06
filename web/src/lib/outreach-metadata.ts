import type { CandidateProfile, DraftVariant, PostDraft } from "@prisma/client"
import { normalizeDraftResult, type DraftResult } from "@/lib/outreach"
import { classifyIndustry } from "@/lib/industry-classifier"

export type OutreachSendMetadata = {
  toneUsed: string
  draftLengthUsed: string
  matchScore: number | null
  industryTag: string | null
}

export function extractMatchScore(draftResponse: unknown): number | null {
  try {
    const result = normalizeDraftResult(draftResponse as DraftResult)
    return result.match_score
  } catch {
    return null
  }
}

export function buildSendMetadataFromProfile(
  profile: Pick<CandidateProfile, "outreachTone" | "draftLength"> | null,
  postText: string,
  desiredRoles: string | null,
  skills: string | null,
  draftResponse?: unknown
): OutreachSendMetadata {
  return {
    toneUsed: profile?.outreachTone || "professional",
    draftLengthUsed: profile?.draftLength || "medium",
    matchScore: draftResponse ? extractMatchScore(draftResponse) : null,
    industryTag: classifyIndustry({ postText, desiredRoles, skills }),
  }
}

export function buildSendMetadataFromDraft(
  draft: PostDraft,
  profile: Pick<CandidateProfile, "outreachTone" | "draftLength" | "desiredRoles" | "skills"> | null,
  variant?: Pick<DraftVariant, "toneUsed" | "draftLength" | "draftResponse"> | null
): OutreachSendMetadata {
  if (variant) {
    return {
      toneUsed: variant.toneUsed,
      draftLengthUsed: variant.draftLength,
      matchScore: extractMatchScore(variant.draftResponse),
      industryTag: draft.industryTag || classifyIndustry({
        postText: draft.postText,
        desiredRoles: profile?.desiredRoles ?? null,
        skills: profile?.skills ?? null,
      }),
    }
  }

  return {
    toneUsed: profile?.outreachTone || "professional",
    draftLengthUsed: profile?.draftLength || "medium",
    matchScore: extractMatchScore(draft.draftResponse),
    industryTag: draft.industryTag || classifyIndustry({
      postText: draft.postText,
      desiredRoles: profile?.desiredRoles ?? null,
      skills: profile?.skills ?? null,
    }),
  }
}
