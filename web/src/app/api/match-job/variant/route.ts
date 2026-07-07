import { NextResponse } from "next/server"
import { authenticateBearerRequest } from "@/lib/bearer-auth"
import { prisma } from "@/lib/prisma"
import { normalizeDraftResult, type DraftResult } from "@/lib/outreach"
import { openai, OPENAI_MODEL } from "@/lib/openai"
import { incrementDraftStats } from "@/lib/user-stats"
import { buildDraftSystemPrompt } from "@/lib/draft-prompt"

const VALID_TONES = ["professional", "warm", "direct", "formal"] as const

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
    const auth = await authenticateBearerRequest(req, {
      limit: 20,
      windowMs: 60 * 60 * 1000,
    })
    if (auth.error) return auth.error
    const apiKey = auth.apiKey!

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

    const systemPrompt = buildDraftSystemPrompt(
      profile,
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
    if (!responseContent) throw new Error("No response from OpenAI")

    const result = normalizeDraftResult(JSON.parse(responseContent) as DraftResult)
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

    const nextIndex =
      existingDraft.variants.length > 0
        ? Math.max(...existingDraft.variants.map((v) => v.variantIndex)) + 1
        : 1

    const variant = await prisma.draftVariant.create({
      data: {
        postDraftId: existingDraft.id,
        variantIndex: nextIndex,
        toneUsed: alternateTone,
        draftLength: profile.draftLength || "medium",
        message,
        subject,
        draftResponse: result,
      },
    })

    await incrementDraftStats(apiKey.userId)

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
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("Match Job Variant Error:", error)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
