export const DRAFT_STORAGE_KEY = "currentDraft"

export type DraftMatchInsight = {
  score: number
  reason?: string
  highlights?: string[]
  relevant?: boolean
}

export type DraftVariantPreview = {
  id: string
  toneUsed: string
  message: string
  subject?: string | null
  matchInsight?: DraftMatchInsight
}

export type DraftPreview = {
  status: "idle" | "loading" | "ready" | "sent" | "error"
  actionMode: "EMAIL" | "DM"
  recipientName: string
  recipientEmail?: string | null
  detectedName?: string | null
  recipientHandle?: string
  recipientProfileUrl?: string
  subject?: string | null
  message: string
  sourceText?: string
  matchInsight?: DraftMatchInsight
  postId?: string
  postUrl?: string
  platform?: string
  draftId?: string
  variantId?: string
  activeTone?: string
  variants?: DraftVariantPreview[]
  cached?: boolean
  emailPayload?: {
    to: string
    subject: string
    body: string
    postId: string
    postUrl?: string
    platform: string
    draftId?: string
    variantId?: string
    recipientName?: string
    recipientHandle?: string
    recipientProfileUrl?: string
  }
  error?: string
  updatedAt: number
}

export const emptyDraft = (): DraftPreview => ({
  status: "idle",
  actionMode: "DM",
  recipientName: "",
  message: "",
  updatedAt: Date.now(),
})
