/** @deprecated Legacy single-draft key — migrated to draftsByPostId on read */
export const DRAFT_STORAGE_KEY = "currentDraft"

export const DRAFTS_BY_POST_KEY = "draftsByPostId"
export const ACTIVE_POST_KEY = "activePostId"

export type DraftsByPostId = Record<string, DraftPreview>

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

export async function getDraftsMap(): Promise<DraftsByPostId> {
  const result = await chrome.storage.local.get([DRAFTS_BY_POST_KEY, DRAFT_STORAGE_KEY])
  const map = (result[DRAFTS_BY_POST_KEY] as DraftsByPostId | undefined) ?? {}

  const legacy = result[DRAFT_STORAGE_KEY] as DraftPreview | undefined
  if (legacy?.postId && !map[legacy.postId]) {
    map[legacy.postId] = legacy
    await chrome.storage.local.set({
      [DRAFTS_BY_POST_KEY]: map,
      [DRAFT_STORAGE_KEY]: undefined,
    })
  }

  return map
}

export async function getDraftForPost(postId: string): Promise<DraftPreview | null> {
  const map = await getDraftsMap()
  return map[postId] ?? null
}

export async function getActivePostId(): Promise<string | null> {
  const result = await chrome.storage.local.get(ACTIVE_POST_KEY)
  return (result[ACTIVE_POST_KEY] as string | undefined) ?? null
}

export async function getActiveDraft(): Promise<DraftPreview | null> {
  const activePostId = await getActivePostId()
  if (!activePostId) return null
  return getDraftForPost(activePostId)
}

export async function setDraftForPost(postId: string, draft: DraftPreview): Promise<void> {
  const map = await getDraftsMap()
  map[postId] = { ...draft, postId, updatedAt: Date.now() }
  await chrome.storage.local.set({
    [DRAFTS_BY_POST_KEY]: map,
    [ACTIVE_POST_KEY]: postId,
  })
}

export async function setActivePost(postId: string): Promise<void> {
  await chrome.storage.local.set({ [ACTIVE_POST_KEY]: postId })
}

export async function migrateLegacyDraft(): Promise<void> {
  await getDraftsMap()
}
