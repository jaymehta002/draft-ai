import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { authenticateBearerRequest } from "@/lib/bearer-auth"
import { prisma } from "@/lib/prisma"
import { incrementSentStats } from "@/lib/user-stats"
import { recordActivity } from "@/lib/engagement"
import { resolveOutreachSendFields } from "@/lib/resolve-send-metadata"
import { getWebErrorMessage } from "@/lib/error-messages"

export async function POST(req: Request) {
  let draftId: string | undefined
  try {
    const auth = await authenticateBearerRequest(req, {
      scope: "record-outreach",
      limit: 30,
      windowMs: 60 * 60 * 1000,
    })
    if (auth.error) return auth.error
    const apiKey = auth.apiKey
    if (!apiKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const {
      postId,
      postUrl,
      platform,
      variantId,
      recipientName,
      recipientHandle,
      recipientProfileUrl,
      message,
      actionMode,
    } = body
    draftId = typeof body.draftId === "string" ? body.draftId : undefined

    if (!postId || !message) {
      return NextResponse.json(
        {
          code: "missing_post_fields",
          error: getWebErrorMessage("missing_post_id"),
        },
        { status: 400 }
      )
    }

    if (draftId) {
      const existing = await prisma.sentOutreach.findUnique({
        where: { postDraftId: draftId },
      })
      if (existing) {
        return NextResponse.json({ success: true, sentId: existing.id, alreadyRecorded: true })
      }
    }

    const sendMeta = await resolveOutreachSendFields(apiKey.userId, draftId, variantId)

    const sent = await prisma.sentOutreach.create({
      data: {
        userId: apiKey.userId,
        postDraftId: draftId || null,
        postId,
        postUrl: postUrl || null,
        platform: platform || "UNKNOWN",
        recipientName: recipientName || null,
        recipientHandle: recipientHandle || null,
        recipientProfileUrl: recipientProfileUrl || null,
        message,
        actionMode: actionMode || "DM",
        status: "COPIED",
        toneUsed: sendMeta.toneUsed,
        draftLengthUsed: sendMeta.draftLengthUsed,
        matchScore: sendMeta.matchScore,
        variantId: sendMeta.variantId,
        industryTag: sendMeta.industryTag,
      },
    })

    await incrementSentStats(apiKey.userId)
    await recordActivity(apiKey.userId, "send")

    return NextResponse.json({ success: true, sentId: sent.id })
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002" && draftId) {
      const existing = await prisma.sentOutreach.findUnique({ where: { postDraftId: draftId } })
      if (existing) {
        return NextResponse.json({ success: true, sentId: existing.id, alreadyRecorded: true })
      }
    }
    console.error("Record outreach error:", error)
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
