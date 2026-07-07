import {
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
    emailPayload: current.emailPayload
      ? {
          ...current.emailPayload,
          to: nextRecipientEmail || current.emailPayload.to,
          body: message,
          subject: nextSubject || current.emailPayload.subject,
        }
      : undefined,
    updatedAt: Date.now(),
  }

  await setDraftForPost(resolvedPostId, updated)
  return updated
}
