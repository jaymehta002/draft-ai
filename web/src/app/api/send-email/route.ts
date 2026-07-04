import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { google } from "googleapis"
import { extractEmailFromText, inferRecipientNameFromEmail } from "@/lib/email"
import { resolveUploadThingFileUrl } from "@/lib/uploadthing-server"
import { incrementSentStats } from "@/lib/user-stats"

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
  const uploadThingUrl = await resolveUploadThingFileUrl(
    profile?.resumeStorageKey,
    profile?.resumeFileUrl
  )

  if (uploadThingUrl) {
    const response = await fetch(uploadThingUrl)

    if (response.ok) {
      const buffer = Buffer.from(await response.arrayBuffer())
      const responseType = response.headers.get("content-type")?.trim() || null

      return {
        fileName: originalName,
        mimeType: storedMimeType || responseType || "application/octet-stream",
        base64Content: chunkBase64(buffer.toString("base64")),
      }
    }
  }

  const storedFile = profile?.resumeFileData

  if (storedFile?.length) {
    return {
      fileName: originalName,
      mimeType: storedMimeType || "application/octet-stream",
      base64Content: chunkBase64(Buffer.from(storedFile).toString("base64")),
    }
  }

  const content = profile?.resumeContent?.trim()
  if (!content) return null

  const safeBaseName = originalName.replace(/\.[^.]+$/, "") || "resume"

  return {
    fileName: safeBaseName.endsWith(".txt") ? safeBaseName : `${safeBaseName}.txt`,
    mimeType: 'text/plain; charset="UTF-8"',
    base64Content: chunkBase64(Buffer.from(content, "utf8").toString("base64")),
  }
}

function normalizeEmailGreeting(message: string, recipientName: string | null) {
  const cleaned = message.trim()
  const greetingName = recipientName?.split(/\s+/)[0] || null
  const greetingLine = greetingName ? `Hi ${greetingName},` : "Hello,"

  if (!cleaned) return greetingLine

  const lines = cleaned.split(/\r?\n/)
  if (/^(hi|hello|dear|hey)\b/i.test(lines[0]?.trim() || "")) {
    lines[0] = greetingLine
    return lines.join("\n")
  }

  return `${greetingLine}\n\n${cleaned}`
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split(" ")[1]
    const apiKey = await prisma.apiKey.findUnique({
      where: { key: token },
      include: {
        user: {
          include: { accounts: true, candidateProfile: true }
        }
      }
    })

    if (!apiKey) {
      return NextResponse.json({ error: "Invalid API Key" }, { status: 401 })
    }

    const googleAccount = apiKey.user.accounts.find(a => a.provider === "google")
    if (!googleAccount || !googleAccount.refresh_token) {
      return NextResponse.json({ error: "No Gmail account connected or missing refresh token. Please sign in again." }, { status: 400 })
    }

    const { to, subject, body, postId, postUrl, platform, draftId, recipientHandle, recipientProfileUrl } = await req.json()
    const recipientEmail = typeof to === "string" ? extractEmailFromText(to) : null
    const resolvedRecipientName = recipientEmail ? inferRecipientNameFromEmail(recipientEmail) : null
    const normalizedSubject = typeof subject === "string" ? subject.trim() : ""
    const rawBody = typeof body === "string" ? body : ""

    if (!recipientEmail) {
      return NextResponse.json({ error: "Invalid recipient email" }, { status: 400 })
    }

    if (!normalizedSubject || !rawBody.trim()) {
      return NextResponse.json({ error: "Missing subject or body" }, { status: 400 })
    }

    if (!postId) {
      return NextResponse.json({ error: "Missing post ID" }, { status: 400 })
    }

    if (draftId) {
      const existing = await prisma.sentOutreach.findUnique({
        where: { postDraftId: draftId },
      })
      if (existing) {
        return NextResponse.json({
          success: true,
          message: "Email already sent for this draft",
          sentId: existing.id,
          gmailMessageId: existing.gmailMessageId,
          alreadySent: true,
        })
      }
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    )

    oauth2Client.setCredentials({
      refresh_token: googleAccount.refresh_token,
    })

    const gmail = google.gmail({ version: "v1", auth: oauth2Client })

    const utf8Subject = `=?utf-8?B?${Buffer.from(normalizedSubject).toString("base64")}?=`
    const normalizedBody = normalizeEmailGreeting(rawBody, resolvedRecipientName)
    const resumeAttachment = await buildResumeAttachment(apiKey.user.candidateProfile)
    const boundary = `draft-ai-${Date.now()}`
    const messageParts = resumeAttachment
      ? [
          `To: ${recipientEmail}`,
          `Subject: ${utf8Subject}`,
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
          "MIME-Version: 1.0",
          "Content-Type: text/plain; charset=utf-8",
          "",
          normalizedBody,
        ]
    const message = messageParts.join("\n")

    const encodedMessage = Buffer.from(message)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "")

    const sendResult = await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: encodedMessage,
      },
    })

    const gmailMessageId = sendResult.data.id || null

    const sent = await prisma.sentOutreach.create({
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
        gmailMessageId,
        subject: normalizedSubject,
        message: normalizedBody,
        actionMode: "EMAIL",
        status: "SENT",
      },
    })

    // Increment precomputed stats
    await incrementSentStats(apiKey.userId)

    return NextResponse.json({
      success: true,
      message: "Email sent successfully",
      sentId: sent.id,
      gmailMessageId,
    })

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("Send Email Error:", error)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
