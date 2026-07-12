import {
  buildEmailPayload,
  getActivePostId,
  getDraftForPost,
  setDraftForPost,
  type DraftPreview,
} from "./draft"

export async function getDraft(postId?: string): Promise<DraftPreview | null> {
  if (postId) return getDraftForPost(postId)
  const activePostId = await getActivePostId()
  if (!activePostId) return null
  return getDraftForPost(activePostId)
}

export async function persistDraftEdits(
  message: string,
  subject?: string,
  recipientEmail?: string | null,
  postId?: string
): Promise<DraftPreview | null> {
  const resolvedPostId = postId ?? (await getActivePostId())
  if (!resolvedPostId) return null

  const current = await getDraftForPost(resolvedPostId)
  if (!current || current.status === "loading" || current.status === "idle") {
    return null
  }

  const latest = await getDraftForPost(resolvedPostId)
  if (
    latest &&
    latest.updatedAt > current.updatedAt &&
    latest.status === "ready" &&
    current.status !== "ready"
  ) {
    return latest
  }

  const nextSubject = subject ?? current.subject ?? ""
  const nextRecipientEmail =
    recipientEmail !== undefined
      ? recipientEmail
      : current.recipientEmail ?? current.emailPayload?.to ?? null
  const updated: DraftPreview = {
    ...current,
    message,
    subject: nextSubject,
    recipientEmail: nextRecipientEmail,
    updatedAt: Date.now(),
  }
  updated.emailPayload = buildEmailPayload(updated, {
    to: nextRecipientEmail,
    subject: nextSubject,
    body: message,
  })

  await setDraftForPost(resolvedPostId, updated)
  return updated
}
