import { prisma } from "@/lib/prisma"
import { openai, OPENAI_MODEL } from "@/lib/openai"
import { recordActivity } from "@/lib/engagement"
import type { DraftProfileContext } from "@/lib/draft-prompt"

export type FollowUpType = "bump" | "close"

function buildFollowUpPrompt(
  profile: DraftProfileContext,
  originalMessage: string,
  recipientName: string | null,
  followUpType: FollowUpType,
  actionMode: string
) {
  const name = recipientName?.split(/\s+/)[0] || "there"
  const typeGuide =
    followUpType === "bump"
      ? "Write a short, friendly follow-up (under 80 words). Reference the original message briefly. One clear ask. Do not sound desperate."
      : "Write a graceful close (under 60 words). Thank them for their time, leave the door open, no pressure."

  return `
You are helping a job seeker follow up on an unanswered ${actionMode === "EMAIL" ? "email" : "direct message"}.

Candidate: ${profile.fullName || "Unknown"}, ${profile.currentTitle || "job seeker"}

Original message sent:
"""
${originalMessage}
"""

Recipient first name: ${name}

Task: ${typeGuide}

Return ONLY valid JSON:
{
  "subject_line": ${actionMode === "EMAIL" ? "string (short subject for follow-up)" : "null"},
  "message_content": "string"
}
`.trim()
}

export async function generateFollowUpDraft(
  userId: string,
  sentOutreachId: string,
  followUpType: FollowUpType
) {
  const outreach = await prisma.sentOutreach.findFirst({
    where: { id: sentOutreachId, userId, responseReceivedAt: null },
    include: {
      postDraft: true,
      conversationMeta: true,
      user: { include: { candidateProfile: true } },
    },
  })

  if (!outreach) {
    throw new Error("Outreach not found or already replied")
  }

  const profile = outreach.user.candidateProfile
  if (!profile) throw new Error("Profile not found")

  const daysSince =
    (Date.now() - outreach.sentAt.getTime()) / (1000 * 60 * 60 * 24)
  if (followUpType === "bump" && (daysSince < 3 || daysSince >= 7)) {
    throw new Error("Bump follow-up only available 3–6 days after sending")
  }
  if (followUpType === "close" && daysSince < 7) {
    throw new Error("Close follow-up only available after 7 days")
  }

  const prompt = buildFollowUpPrompt(
    profile,
    outreach.message,
    outreach.recipientName,
    followUpType,
    outreach.actionMode
  )

  const completion = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  })

  const raw = completion.choices[0]?.message?.content
  if (!raw) throw new Error("No response from AI")

  let parsed: { subject_line?: string | null; message_content: string }
  try {
    parsed = JSON.parse(raw) as { subject_line?: string | null; message_content: string }
  } catch {
    throw new Error("Invalid AI response")
  }
  if (typeof parsed.message_content !== "string" || !parsed.message_content.trim()) {
    throw new Error("Invalid AI response")
  }

  const postId = `followup-${outreach.id}-${followUpType}`
  const message = parsed.message_content.trim()
  const subject =
    outreach.actionMode === "EMAIL"
      ? (parsed.subject_line?.trim() || `Re: ${outreach.subject || "Following up"}`)
      : null

  const draft = await prisma.postDraft.upsert({
    where: { userId_postId: { userId, postId } },
    update: {
      message,
      subject,
      updatedAt: new Date(),
    },
    create: {
      userId,
      postId,
      postUrl: outreach.postUrl,
      platform: outreach.platform,
      postText: outreach.postDraft?.postText || "Follow-up",
      recipientName: outreach.recipientName,
      recipientEmail: outreach.recipientEmail,
      recipientHandle: outreach.recipientHandle,
      recipientProfileUrl: outreach.recipientProfileUrl,
      actionMode: outreach.actionMode,
      subject,
      message,
      draftResponse: parsed,
      profileVersion: profile.updatedAt.toISOString(),
      industryTag: outreach.industryTag,
    },
  })

  await prisma.conversationMeta.upsert({
    where: { sentOutreachId },
    create: {
      sentOutreachId,
      followUpDraftId: draft.id,
      followUpDueAt: new Date(),
    },
    update: {
      followUpDraftId: draft.id,
      followUpDueAt: new Date(),
    },
  })

  await recordActivity(userId, "draft")

  return {
    draftId: draft.id,
    postId: draft.postId,
    message,
    subject,
    followUpType,
  }
}
