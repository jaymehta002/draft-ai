import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { authenticateBearerRequest } from "@/lib/bearer-auth"
import { prisma } from "@/lib/prisma"
import { google } from "googleapis"
import { randomUUID } from "crypto"
import { extractEmailFromText, inferRecipientNameFromEmail } from "@/lib/email"
import { normalizeEmailGreeting } from "@/lib/email-greeting"
import { resolveUploadThingFileUrl } from "@/lib/uploadthing-server"
import { incrementSentStats } from "@/lib/user-stats"
import { limitReachedResponse, releaseUsage, reserveUsage, startProTrial } from "@/lib/entitlements"
import { maybeRewardReferralOnFirstSend } from "@/lib/referral"
import { recordActivity } from "@/lib/engagement"
import { resolveOutreachSendFields } from "@/lib/resolve-send-metadata"
import { getGmailSendClient } from "@/lib/email-sync/token-manager"
import { getWebErrorMessage } from "@/lib/error-messages"

function chunkBase64(value: string) {
  return value.match(/.{1,76}/g)?.join("\n") ?? value
}

function sanitizeAttachmentFileName(fileName: string) {
  return (
    fileName
      .trim()
      .replace(/[^A-Za-z0-9._-]+/g, "_")
      .replace(/^_+|_+$/g, "") || "resume"
  )
}

async function buildResumeAttachment(profile: {
  resumeFileName: string | null
  resumeMimeType: string | null
  resumeStorageKey: string | null
  resumeFileUrl: string | null
  resumeFileData: Uint8Array | null
  resumeContent: string | null
} | null) {
  const originalName = sanitizeAttachmentFileName(profile?.resumeFileName || "resume")
  const storedMimeType = profile?.resumeMimeType?.trim() || null
  const ensureExtensionForMime = (fileName: string, mimeType: string | null) => {
    if (!mimeType) return fileName
    const lower = fileName.toLowerCase()
    if (mimeType.includes("application/pdf")) {
      return lower.endsWith(".pdf") ? fileName : `${fileName}.pdf`
    }
    return fileName
  }
  const uploadThingUrl = await resolveUploadThingFileUrl(
    profile?.resumeStorageKey,
    profile?.resumeFileUrl
  )

  if (uploadThingUrl) {
    const response = await fetch(uploadThingUrl)
    if (response.ok) {
      const buffer = Buffer.from(await response.arrayBuffer())
      const responseType = response.headers.get("content-type")?.trim() || null
      const resolvedMimeType = storedMimeType || responseType || "application/octet-stream"
      return {
        fileName: ensureExtensionForMime(originalName, resolvedMimeType),
        mimeType: resolvedMimeType,
        base64Content: chunkBase64(buffer.toString("base64")),
      }
    }
  }

  const storedFile = profile?.resumeFileData
  if (storedFile?.length) {
    const resolvedMimeType = storedMimeType || "application/octet-stream"
    return {
      fileName: ensureExtensionForMime(originalName, resolvedMimeType),
      mimeType: resolvedMimeType,
      base64Content: chunkBase64(Buffer.from(storedFile).toString("base64")),
    }
  }

  return null
}

/** Generates a globally-unique RFC 2822 Message-ID. */
function generateRfcMessageId(): string {
  return `<${randomUUID()}@mail.recruitable.ai>`
}

function alreadySentResponse(existing: { id: string; gmailMessageId: string | null; status: string }) {
  if (existing.status === "SENDING") {
    return NextResponse.json({
      success: true,
      message: "Email send already in progress",
      sentId: existing.id,
      gmailMessageId: existing.gmailMessageId,
      alreadySent: true,
    })
  }
  return NextResponse.json({
    success: true,
    message: "Email already sent for this draft",
    sentId: existing.id,
    gmailMessageId: existing.gmailMessageId,
    alreadySent: true,
  })
}

export async function POST(req: Request) {
  let reservedUserId: string | null = null
  try {
    const auth = await authenticateBearerRequest(req, {
      scope: "send-email",
      limit: 10,
      windowMs: 60 * 60 * 1000,
    })
    if (auth.error) return auth.error
    const apiKey = auth.apiKey
    if (!apiKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const tokenResult = await getGmailSendClient(apiKey.userId)
    if (!tokenResult.ok) {
      return NextResponse.json(
        {
          code: "gmail_not_connected",
          error: getWebErrorMessage("gmail_not_connected"),
        },
        { status: 400 }
      )
    }

    const { to, subject, body, postId, postUrl, platform, draftId, variantId, recipientHandle, recipientProfileUrl } = await req.json()
    const recipientEmail = typeof to === "string" ? extractEmailFromText(to) : null
    const resolvedRecipientName = recipientEmail ? inferRecipientNameFromEmail(recipientEmail) : null
    const normalizedSubject = typeof subject === "string" ? subject.trim() : ""
    const rawBody = typeof body === "string" ? body : ""

    if (!recipientEmail) {
      return NextResponse.json(
        { code: "invalid_recipient_email", error: getWebErrorMessage("invalid_recipient_email") },
        { status: 400 }
      )
    }
    if (!normalizedSubject || !rawBody.trim()) {
      return NextResponse.json(
        { code: "missing_subject_or_body", error: getWebErrorMessage("missing_subject_or_body") },
        { status: 400 }
      )
    }
    if (!postId) {
      return NextResponse.json(
        { code: "missing_post_id", error: getWebErrorMessage("missing_post_id") },
        { status: 400 }
      )
    }

    if (draftId) {
      const existing = await prisma.sentOutreach.findUnique({
        where: { postDraftId: draftId },
      })
      if (existing && existing.status !== "FAILED") {
        return alreadySentResponse(existing)
      }
    }

    const emailReserve = await reserveUsage(apiKey.userId, "email")
    if (!emailReserve.reserved) return limitReachedResponse(emailReserve.check)
    reservedUserId = apiKey.userId

    const isFirstSend =
      (await prisma.sentOutreach.count({ where: { userId: apiKey.userId, status: "SENT" } })) === 0

    const oauth2Client = tokenResult.oauth2Client
    const gmail = google.gmail({ version: "v1", auth: oauth2Client })

    const rfcMessageId = generateRfcMessageId()
    const utf8Subject = `=?utf-8?B?${Buffer.from(normalizedSubject).toString("base64")}?=`
    const normalizedBody = normalizeEmailGreeting(rawBody, resolvedRecipientName)
    const resumeAttachment = await buildResumeAttachment(apiKey.user.candidateProfile)
    const boundary = `draft-ai-${Date.now()}`

    const messageParts = resumeAttachment
      ? [
          `To: ${recipientEmail}`,
          `Subject: ${utf8Subject}`,
          `Message-ID: ${rfcMessageId}`,
          "MIME-Version: 1.0",
          `Content-Type: multipart/mixed; boundary="${boundary}"`,
          "",
          `--${boundary}`,
          'Content-Type: text/plain; charset="UTF-8"',
          "",
          normalizedBody,
          "",
          `--${boundary}`,
          `Content-Type: ${resumeAttachment.mimeType}; name="${resumeAttachment.fileName}"`,
          "Content-Transfer-Encoding: base64",
          `Content-Disposition: attachment; filename="${resumeAttachment.fileName}"`,
          "",
          resumeAttachment.base64Content,
          "",
          `--${boundary}--`,
        ]
      : [
          `To: ${recipientEmail}`,
          `Subject: ${utf8Subject}`,
          `Message-ID: ${rfcMessageId}`,
          "MIME-Version: 1.0",
          "Content-Type: text/plain; charset=utf-8",
          "",
          normalizedBody,
        ]

    const encodedMessage = Buffer.from(messageParts.join("\n"))
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "")

    const snippet = normalizedBody.slice(0, 300)
    const sendMeta = await resolveOutreachSendFields(apiKey.userId, draftId, variantId)

    let pendingId: string
    try {
      const pending = await prisma.sentOutreach.create({
        data: {
          userId: apiKey.userId,
          postDraftId: draftId || null,
          postId,
          postUrl: postUrl || null,
          platform: platform || "UNKNOWN",
          recipientEmail,
          recipientName: resolvedRecipientName,
          recipientHandle: recipientHandle || null,
          recipientProfileUrl: recipientProfileUrl || null,
          subject: normalizedSubject,
          message: normalizedBody,
          actionMode: "EMAIL",
          status: "SENDING",
          rfcMessageId,
          toneUsed: sendMeta.toneUsed,
          draftLengthUsed: sendMeta.draftLengthUsed,
          matchScore: sendMeta.matchScore,
          variantId: sendMeta.variantId,
          industryTag: sendMeta.industryTag,
        },
      })
      pendingId = pending.id
    } catch (error) {
      if (draftId && error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const existing = await prisma.sentOutreach.findUnique({ where: { postDraftId: draftId } })
        if (existing) return alreadySentResponse(existing)
      }
      throw error
    }

    try {
      const sendResult = await gmail.users.messages.send({
        userId: "me",
        requestBody: { raw: encodedMessage },
      })

      const gmailMessageId = sendResult.data.id || null
      const gmailThreadId = sendResult.data.threadId || null

      const sent = await prisma.sentOutreach.update({
        where: { id: pendingId },
        data: {
          status: "SENT",
          gmailMessageId,
          gmailThreadId,
          emailThread: {
            create: {
              userId: apiKey.userId,
              subject: normalizedSubject,
              participantEmail: recipientEmail,
              lastMessageAt: new Date(),
              isRead: true,
              messageCount: 1,
              messages: {
                create: {
                  userId: apiKey.userId,
                  direction: "OUTBOUND",
                  fromAddress: apiKey.user.email ?? "",
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

      await incrementSentStats(apiKey.userId)
      await recordActivity(apiKey.userId, "send")

      if (isFirstSend) {
        await startProTrial(apiKey.userId)
        await maybeRewardReferralOnFirstSend(apiKey.userId)
      }

      reservedUserId = null
      return NextResponse.json({
        success: true,
        message: "Email sent successfully",
        sentId: sent.id,
        gmailMessageId,
        rfcMessageId,
      })
    } catch (error) {
      await prisma.sentOutreach.update({
        where: { id: pendingId },
        data: { status: "FAILED" },
      }).catch(() => {})
      if (reservedUserId) {
        await releaseUsage(reservedUserId, "email").catch(() => {})
        reservedUserId = null
      }
      throw error
    }

  } catch (error: unknown) {
    if (reservedUserId) {
      await releaseUsage(reservedUserId, "email").catch(() => {})
    }
    console.error("Send Email Error:", error)
    return NextResponse.json(
      {
        success: false,
        code: "server_error",
        error: getWebErrorMessage("server_error"),
      },
      { status: 500 }
    )
  }
}
