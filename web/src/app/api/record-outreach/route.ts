import { NextResponse } from "next/server"
import { authenticateBearerRequest } from "@/lib/bearer-auth"
import { prisma } from "@/lib/prisma"
import { incrementSentStats } from "@/lib/user-stats"
import { recordActivity } from "@/lib/engagement"
import { resolveOutreachSendFields } from "@/lib/resolve-send-metadata"

export async function POST(req: Request) {
  try {
    const auth = await authenticateBearerRequest(req, {
      limit: 30,
      windowMs: 60 * 60 * 1000,
    })
    if (auth.error) return auth.error
    const apiKey = auth.apiKey!

    const {
      postId,
      postUrl,
      platform,
      draftId,
      variantId,
      recipientName,
      recipientHandle,
      recipientProfileUrl,
      message,
      actionMode,
    } = await req.json()

    if (!postId || !message) {
      return NextResponse.json(
        {
          code: "missing_post_fields",
          error: "Missing required fields. Please draft again from the post.",
        },
        { status: 400 }
      )
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
    console.error("Record outreach error:", error)
    return NextResponse.json(
      {
        success: false,
        code: "server_error",
        error: "Draft AI ran into a problem on our end. Please try again.",
      },
      { status: 500 }
    )
  }
}
