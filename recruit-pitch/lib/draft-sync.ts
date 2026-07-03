import { DRAFT_STORAGE_KEY, type DraftPreview } from "./draft"

export async function getDraft(): Promise<DraftPreview | null> {
  const result = await chrome.storage.local.get(DRAFT_STORAGE_KEY)
  return (result[DRAFT_STORAGE_KEY] as DraftPreview | undefined) ?? null
}

export async function persistDraftEdits(
  message: string,
  subject?: string
): Promise<DraftPreview | null> {
  const current = await getDraft()
  if (!current || current.status === "loading" || current.status === "idle") {
    return null
  }

  const nextSubject = subject ?? current.subject ?? ""
  const updated: DraftPreview = {
    ...current,
    message,
    subject: nextSubject,
    emailPayload: current.emailPayload
      ? {
          ...current.emailPayload,
          body: message,
          subject: nextSubject || current.emailPayload.subject,
        }
      : undefined,
    updatedAt: Date.now(),
  }

  await chrome.storage.local.set({ [DRAFT_STORAGE_KEY]: updated })
  return updated
}
