"use server"

import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { revalidatePath } from "next/cache"

async function getAuthenticatedUser() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) throw new Error("Unauthorized")

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) throw new Error("User not found")

  return user
}

export type ConversationMetaInput = {
  company?: string | null
  roleTitle?: string | null
  pipelineStage?: string
  notes?: string | null
}

export async function getConversationMeta(sentOutreachId: string) {
  const user = await getAuthenticatedUser()

  const outreach = await prisma.sentOutreach.findFirst({
    where: { id: sentOutreachId, userId: user.id },
    include: { conversationMeta: true },
  })

  if (!outreach) return null
  return outreach.conversationMeta
}

export async function updateConversationMeta(
  sentOutreachId: string,
  data: ConversationMetaInput
) {
  const user = await getAuthenticatedUser()

  const outreach = await prisma.sentOutreach.findFirst({
    where: { id: sentOutreachId, userId: user.id },
  })
  if (!outreach) throw new Error("Outreach not found")

  const meta = await prisma.conversationMeta.upsert({
    where: { sentOutreachId },
    create: {
      sentOutreachId,
      company: data.company ?? null,
      roleTitle: data.roleTitle ?? null,
      pipelineStage: data.pipelineStage ?? "OUTREACH",
      notes: data.notes ?? null,
    },
    update: {
      ...(data.company !== undefined && { company: data.company }),
      ...(data.roleTitle !== undefined && { roleTitle: data.roleTitle }),
      ...(data.pipelineStage !== undefined && { pipelineStage: data.pipelineStage }),
      ...(data.notes !== undefined && { notes: data.notes }),
    },
  })

  revalidatePath("/dashboard/pipeline")
  revalidatePath("/dashboard/emails")
  revalidatePath("/dashboard/dms")

  return meta
}

export async function sendDraftFromWeb(draftId: string) {
  const user = await getAuthenticatedUser()

  const draft = await prisma.postDraft.findFirst({
    where: { id: draftId, userId: user.id },
    include: { sentOutreach: true },
  })

  if (!draft) throw new Error("Draft not found")
  if (draft.actionMode !== "EMAIL") throw new Error("Only email drafts can be sent from web")
  if (!draft.recipientEmail) throw new Error("No recipient email on draft")
  if (draft.sentOutreach) throw new Error("Already sent")

  const profile = await prisma.candidateProfile.findUnique({ where: { userId: user.id } })
  if (!profile?.onboardingComplete) throw new Error("Complete your profile first")

  const { checkEntitlement, incrementUsage } = await import("@/lib/entitlements")
  const emailCheck = await checkEntitlement(user.id, "email")
  if (!emailCheck.allowed) {
    const err = new Error("limit_reached") as Error & { code?: string; feature?: string }
    err.code = "limit_reached"
    err.feature = "email"
    throw err
  }

  const isFirstSend = (await prisma.sentOutreach.count({ where: { userId: user.id } })) === 0

  const { resolveOutreachSendFields } = await import("@/lib/resolve-send-metadata")
  const sendMeta = await resolveOutreachSendFields(user.id, draft.id, null)

  const { getGmailSendClient } = await import("@/lib/email-sync/token-manager")
  const gmailResult = await getGmailSendClient(user.id)
  if (!gmailResult.ok) throw new Error(gmailResult.error || "Gmail not connected")

  const { google } = await import("googleapis")
  const { randomUUID } = await import("crypto")

  const normalizedSubject = draft.subject?.trim() || "Following up"
  const normalizedBody = draft.message.trim()
  const recipientEmail = draft.recipientEmail.trim()
  const rfcMessageId = `<${randomUUID()}@draft-ai.app>`

  const rawMessage = [
    `To: ${recipientEmail}`,
    `Subject: ${normalizedSubject}`,
    `Message-ID: ${rfcMessageId}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "",
    normalizedBody,
  ].join("\r\n")

  const encoded = Buffer.from(rawMessage)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")

  const gmail = google.gmail({ version: "v1", auth: gmailResult.oauth2Client })
  const sendResponse = await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw: encoded },
  })

  const gmailMessageId = sendResponse.data.id ?? null
  const gmailThreadId = sendResponse.data.threadId ?? null
  const snippet = normalizedBody.slice(0, 300)

  const sent = await prisma.sentOutreach.create({
    data: {
      userId: user.id,
      postDraftId: draft.id,
      postId: draft.postId,
      postUrl: draft.postUrl,
      platform: draft.platform,
      recipientEmail,
      recipientName: draft.recipientName,
      recipientHandle: draft.recipientHandle,
      recipientProfileUrl: draft.recipientProfileUrl,
      gmailMessageId,
      rfcMessageId,
      gmailThreadId,
      subject: normalizedSubject,
      message: normalizedBody,
      actionMode: "EMAIL",
      status: "SENT",
      toneUsed: sendMeta.toneUsed,
      draftLengthUsed: sendMeta.draftLengthUsed,
      matchScore: sendMeta.matchScore,
      variantId: sendMeta.variantId,
      industryTag: sendMeta.industryTag,
      emailThread: {
        create: {
          userId: user.id,
          subject: normalizedSubject,
          participantEmail: recipientEmail,
          lastMessageAt: new Date(),
          isRead: true,
          messageCount: 1,
          messages: {
            create: {
              userId: user.id,
              direction: "OUTBOUND",
              fromAddress: user.email ?? "",
              toAddresses: JSON.stringify([recipientEmail]),
              subject: normalizedSubject,
              snippet,
              rawBody: normalizedBody,
              rfcMessageId,
              providerMsgId: gmailMessageId,
              providerThreadId: gmailThreadId,
              isRead: true,
              receivedAt: new Date(),
            },
          },
        },
      },
    },
  })

  const { incrementSentStats } = await import("@/lib/user-stats")
  const { recordActivity } = await import("@/lib/engagement")

  await incrementSentStats(user.id)
  await incrementUsage(user.id, "email")
  await recordActivity(user.id, "send")

  if (isFirstSend) {
    const { maybeRewardReferralOnFirstSend } = await import("@/lib/referral")
    await maybeRewardReferralOnFirstSend(user.id)
  }

  revalidatePath("/dashboard/drafts")
  revalidatePath("/dashboard")
  revalidatePath("/dashboard/pipeline")

  return { success: true, sentId: sent.id }
}

export async function copyDmFromWeb(draftId: string) {
  const user = await getAuthenticatedUser()

  const draft = await prisma.postDraft.findFirst({
    where: { id: draftId, userId: user.id },
    include: { sentOutreach: true },
  })

  if (!draft) throw new Error("Draft not found")
  if (draft.actionMode !== "DM") throw new Error("Not a DM draft")
  if (draft.sentOutreach) throw new Error("Already marked as sent")

  const { resolveOutreachSendFields } = await import("@/lib/resolve-send-metadata")
  const sendMeta = await resolveOutreachSendFields(user.id, draft.id, null)

  const sent = await prisma.sentOutreach.create({
    data: {
      userId: user.id,
      postDraftId: draft.id,
      postId: draft.postId,
      postUrl: draft.postUrl,
      platform: draft.platform,
      recipientName: draft.recipientName,
      recipientHandle: draft.recipientHandle,
      recipientProfileUrl: draft.recipientProfileUrl,
      message: draft.message,
      actionMode: "DM",
      status: "COPIED",
      toneUsed: sendMeta.toneUsed,
      draftLengthUsed: sendMeta.draftLengthUsed,
      matchScore: sendMeta.matchScore,
      variantId: sendMeta.variantId,
      industryTag: sendMeta.industryTag,
    },
  })

  const { incrementSentStats } = await import("@/lib/user-stats")
  const { recordActivity } = await import("@/lib/engagement")

  await incrementSentStats(user.id)
  await recordActivity(user.id, "send")

  revalidatePath("/dashboard/drafts")
  revalidatePath("/dashboard/pipeline")

  return { success: true, sentId: sent.id, message: draft.message }
}
