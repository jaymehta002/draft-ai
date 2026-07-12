import { NextResponse } from "next/server"
import { authenticateBearerRequest } from "@/lib/bearer-auth"
import { prisma } from "@/lib/prisma"
import { parseDraftResult } from "@/lib/outreach"
import { openai, OPENAI_MODEL } from "@/lib/openai"
import { normalizeEmailGreeting } from "@/lib/email-greeting"
import { incrementDraftStats } from "@/lib/user-stats"
import { checkEntitlement, limitReachedResponse, releaseUsage, reserveUsage } from "@/lib/entitlements"
import { recordActivity } from "@/lib/engagement"
import { buildDraftSystemPrompt, flagSuspiciousDraftOutput } from "@/lib/draft-prompt"
import { getWebErrorMessage } from "@/lib/error-messages"
import {
  formatCertificatesForAI,
  formatProjectsForAI,
  migrateLegacyToStructured,
} from "@/lib/candidate-profile"
import { VALID_TONES, isToneAllowed } from "@/lib/tone-entitlements"

export async function POST(req: Request) {
  let reservedUserId: string | null = null
  try {
    const auth = await authenticateBearerRequest(req, {
      scope: "match-job-variant",
      limit: 20,
      windowMs: 60 * 60 * 1000,
    })
    if (auth.error) return auth.error
    const apiKey = auth.apiKey
    if (!apiKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const profile = apiKey.user.candidateProfile
    if (!profile?.onboardingComplete) {
      return NextResponse.json(
        { error: "Complete your candidate profile in the dashboard before using the extension." },
        { status: 400 }
      )
    }

    const body = await req.json()
    const { postId, alternateTone } = body

    if (!postId || !alternateTone) {
      return NextResponse.json({ error: "Missing postId or alternateTone" }, { status: 400 })
    }

    if (!VALID_TONES.includes(alternateTone)) {
      return NextResponse.json({ error: "Invalid alternateTone" }, { status: 400 })
    }

    const variantCheck = await checkEntitlement(apiKey.userId, "tone_variant")
    if (!variantCheck.allowed) return limitReachedResponse(variantCheck)
    if (!isToneAllowed(variantCheck.tier, alternateTone)) {
      return NextResponse.json({ error: "This tone isn't available on your plan" }, { status: 402 })
    }

    const existingDraft = await prisma.postDraft.findUnique({
      where: {
        userId_postId: { userId: apiKey.userId, postId },
      },
      include: { variants: { orderBy: { variantIndex: "asc" } } },
    })

    if (!existingDraft) {
      return NextResponse.json({ error: "Draft not found. Generate a draft first." }, { status: 404 })
    }

    const existingVariant = existingDraft.variants.find((v) => v.toneUsed === alternateTone)
    if (existingVariant) {
      return NextResponse.json({
        success: true,
        cached: true,
        variant: {
          id: existingVariant.id,
          variantIndex: existingVariant.variantIndex,
          toneUsed: existingVariant.toneUsed,
          draftLength: existingVariant.draftLength,
          message: existingVariant.message,
          subject: existingVariant.subject,
        },
      })
    }

    const draftReserve = await reserveUsage(apiKey.userId, "draft")
    if (!draftReserve.reserved) return limitReachedResponse(draftReserve.check)
    reservedUserId = apiKey.userId

    const structured = migrateLegacyToStructured(profile)
    const systemPrompt = buildDraftSystemPrompt(
      {
        ...profile,
        projects: formatProjectsForAI(structured.projects),
        certificates: formatCertificatesForAI(structured.certificates),
      },
      {
        text: existingDraft.postText,
        name: existingDraft.recipientName,
        extractedEmail: existingDraft.recipientEmail,
        emailRecipientName: existingDraft.recipientName,
        hasEmail: existingDraft.actionMode === "EMAIL",
      },
      {
        outreachTone: alternateTone,
        draftLength: profile.draftLength,
        outreachLanguage: profile.outreachLanguage,
      },
      existingDraft.industryTag
    )

    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Please draft the outreach message. hasEmail: ${existingDraft.actionMode === "EMAIL"}`,
        },
      ],
      response_format: { type: "json_object" },
    })

    const responseContent = completion.choices[0]?.message?.content
    if (!responseContent) {
      await releaseUsage(apiKey.userId, "draft")
      reservedUserId = null
      return NextResponse.json(
        { success: false, code: "ai_no_response", error: getWebErrorMessage("ai_no_response") },
        { status: 502 }
      )
    }

    let parsedRaw: unknown
    try {
      parsedRaw = JSON.parse(responseContent)
    } catch {
      await releaseUsage(apiKey.userId, "draft")
      reservedUserId = null
      return NextResponse.json(
        { success: false, code: "ai_invalid_response", error: getWebErrorMessage("ai_no_response") },
        { status: 502 }
      )
    }

    const result = parseDraftResult(parsedRaw)
    if (!result) {
      await releaseUsage(apiKey.userId, "draft")
      reservedUserId = null
      return NextResponse.json(
        { success: false, code: "ai_invalid_response", error: getWebErrorMessage("ai_no_response") },
        { status: 502 }
      )
    }

    if (existingDraft.actionMode === "EMAIL") result.action_mode = "EMAIL"
    else result.action_mode = "DM"

    const subject = result.outreach_payload.subject_line
    const message =
      result.action_mode === "EMAIL"
        ? normalizeEmailGreeting(
            result.outreach_payload.message_content,
            existingDraft.recipientName
          )
        : result.outreach_payload.message_content

    result.outreach_payload.message_content = message

    const suspiciousFlags = flagSuspiciousDraftOutput(message)
    if (suspiciousFlags.length > 0) {
      console.warn("Suspicious draft output detected", {
        userId: apiKey.userId,
        postId,
        flags: suspiciousFlags,
      })
    }

    const variant = await prisma.$transaction(async (tx) => {
      const fresh = await tx.postDraft.findUnique({
        where: { id: existingDraft.id },
        include: { variants: { orderBy: { variantIndex: "asc" } } },
      })
      if (!fresh) throw new Error("Draft not found")

      const nextIndex =
        fresh.variants.length > 0
          ? Math.max(...fresh.variants.map((v) => v.variantIndex)) + 1
          : 1

      return tx.draftVariant.create({
        data: {
          postDraftId: fresh.id,
          variantIndex: nextIndex,
          toneUsed: alternateTone,
          draftLength: profile.draftLength || "medium",
          message,
          subject,
          draftResponse: result,
        },
      })
    })

    reservedUserId = null
    await incrementDraftStats(apiKey.userId)
    await recordActivity(apiKey.userId, "draft")

    return NextResponse.json({
      success: true,
      cached: false,
      variant: {
        id: variant.id,
        variantIndex: variant.variantIndex,
        toneUsed: variant.toneUsed,
        draftLength: variant.draftLength,
        message: variant.message,
        subject: variant.subject,
        matchInsight: {
          score: result.match_score,
          reason: result.match_reason,
          highlights: result.fit_highlights,
        },
      },
    })
  } catch (error: unknown) {
    if (reservedUserId) {
      await releaseUsage(reservedUserId, "draft").catch(() => {})
    }
    console.error("Match Job Variant Error:", error)
    return NextResponse.json(
      { success: false, code: "server_error", error: getWebErrorMessage("draft_generate_failed") },
      { status: 500 }
    )
  }
}
