import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { google } from "googleapis"

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
          include: { accounts: true }
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

    const { to, subject, body, postId, postUrl, platform, draftId, recipientName, recipientHandle, recipientProfileUrl } = await req.json()

    if (!to || !subject || !body) {
      return NextResponse.json({ error: "Missing to, subject, or body" }, { status: 400 })
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

    const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString("base64")}?=`
    const messageParts = [
      `To: ${to}`,
      `Subject: ${utf8Subject}`,
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=utf-8",
      "",
      body,
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
        recipientEmail: to,
        recipientName: recipientName || null,
        recipientHandle: recipientHandle || null,
        recipientProfileUrl: recipientProfileUrl || null,
        gmailMessageId,
        subject,
        message: body,
        actionMode: "EMAIL",
        status: "SENT",
      },
    })

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
