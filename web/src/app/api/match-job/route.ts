import { NextResponse } from "next/server"
import { authenticateBearerRequest } from "@/lib/bearer-auth"
import { prisma } from "@/lib/prisma"
import { draftResultToResponse, getProfileVersion, parseDraftResult } from "@/lib/outreach"
import { openai, OPENAI_MODEL } from "@/lib/openai"
import { extractEmailFromText, inferRecipientNameFromEmail } from "@/lib/email"
import { normalizeEmailGreeting } from "@/lib/email-greeting"
import { incrementDraftStats } from "@/lib/user-stats"
import { limitReachedResponse, releaseUsage, reserveUsage } from "@/lib/entitlements"
import { clampTone } from "@/lib/tone-entitlements"
import { recordActivity } from "@/lib/engagement"
import { buildDraftSystemPrompt, flagSuspiciousDraftOutput } from "@/lib/draft-prompt"
import { classifyIndustry } from "@/lib/industry-classifier"
import { getWebErrorMessage } from "@/lib/error-messages"
import {
  formatCertificatesForAI,
  formatProjectsForAI,
  migrateLegacyToStructured,
} from "@/lib/candidate-profile"

export async function POST(req: Request) {
  let reservedUserId: string | null = null
  try {
    const auth = await authenticateBearerRequest(req, {
      scope: "match-job",
      limit: 30,
      windowMs: 60 * 60 * 1000,
    })
    if (auth.error) return auth.error
    const apiKey = auth.apiKey
    if (!apiKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const profile = apiKey.user.candidateProfile
    if (!profile?.onboardingComplete) {
      return NextResponse.json({ error: "Complete your candidate profile in the dashboard before using the extension." }, { status: 400 })
    }

    const body = await req.json()
    const {
      text,
      name,
      hasEmail,
      extractedEmail,
      emailRecipientName,
      postId,
      postUrl,
      platform,
      recipientHandle,
      recipientProfileUrl,
    } = body

    if (!text) {
      return NextResponse.json({ error: "Missing post text" }, { status: 400 })
    }

    if (!postId) {
      return NextResponse.json({ error: "Missing post ID" }, { status: 400 })
    }

    const profileVersion = getProfileVersion(profile.updatedAt)
    const normalizedExtractedEmail =
      (typeof extractedEmail === "string" && extractEmailFromText(extractedEmail)) || extractEmailFromText(text)
    const resolvedHasEmail = Boolean(normalizedExtractedEmail) || Boolean(hasEmail)
    const resolvedEmailRecipientName =
      typeof emailRecipientName === "string" && emailRecipientName.trim()
        ? emailRecipientName.trim()
        : normalizedExtractedEmail
          ? inferRecipientNameFromEmail(normalizedExtractedEmail)
          : null
    const savedRecipientName = resolvedHasEmail ? resolvedEmailRecipientName : name || null
    const normalizedPostUrl = postUrl || null
    const normalizedPlatform = platform || "UNKNOWN"
    const normalizedRecipientHandle = recipientHandle || null
    const normalizedRecipientProfileUrl = recipientProfileUrl || null

    const existingDraft = await prisma.postDraft.findUnique({
      where: {
        userId_postId: {
          userId: apiKey.userId,
          postId,
        },
      },
    })

    const canReuseDraft =
      existingDraft &&
      existingDraft.profileVersion === profileVersion &&
      existingDraft.postText === text &&
      existingDraft.postUrl === normalizedPostUrl &&
      existingDraft.platform === normalizedPlatform &&
      existingDraft.recipientEmail === (normalizedExtractedEmail || null) &&
      existingDraft.recipientName === savedRecipientName &&
      existingDraft.recipientHandle === normalizedRecipientHandle &&
      existingDraft.recipientProfileUrl === normalizedRecipientProfileUrl &&
      (existingDraft.actionMode !== "EMAIL" ||
        normalizeEmailGreeting(existingDraft.message, resolvedEmailRecipientName) === existingDraft.message)

    if (canReuseDraft) {
      await prisma.postDraft.update({
        where: { id: existingDraft.id },
        data: { cacheHits: { increment: 1 } },
      })

      return NextResponse.json(draftResultToResponse(existingDraft, true))
    }

    const draftReserve = await reserveUsage(apiKey.userId, "draft")
    if (!draftReserve.reserved) return limitReachedResponse(draftReserve.check)
    reservedUserId = apiKey.userId

    const industryTag = classifyIndustry({
      postText: text,
      desiredRoles: profile.desiredRoles,
      skills: profile.skills,
    })

    const structured = migrateLegacyToStructured(profile)
    const systemPrompt = buildDraftSystemPrompt(
      {
        ...profile,
        projects: formatProjectsForAI(structured.projects),
        certificates: formatCertificatesForAI(structured.certificates),
      },
      {
        text,
        name,
        extractedEmail: normalizedExtractedEmail,
        emailRecipientName: resolvedEmailRecipientName,
        hasEmail: resolvedHasEmail,
      },
      {
        outreachTone: clampTone(draftReserve.check.tier, profile.outreachTone),
        draftLength: profile.draftLength,
        outreachLanguage: profile.outreachLanguage,
      },
      industryTag
    )

    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Please draft the outreach message. hasEmail: ${resolvedHasEmail}` }
      ],
      response_format: { type: "json_object" }
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

    if (resolvedHasEmail) result.action_mode = "EMAIL"
    else result.action_mode = "DM"

    const actionMode = result.action_mode
    const subject = result.outreach_payload.subject_line
    const message =
      actionMode === "EMAIL"
        ? normalizeEmailGreeting(result.outreach_payload.message_content, resolvedEmailRecipientName)
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

    const savedDraft = await prisma.postDraft.upsert({
      where: {
        userId_postId: {
          userId: apiKey.userId,
          postId,
        },
      },
      update: {
        platform: normalizedPlatform,
        postUrl: normalizedPostUrl,
        postText: text,
        recipientName: savedRecipientName,
        recipientEmail: normalizedExtractedEmail || null,
        recipientHandle: normalizedRecipientHandle,
        recipientProfileUrl: normalizedRecipientProfileUrl,
        actionMode,
        subject,
        message,
        draftResponse: result,
        profileVersion,
        industryTag,
        cacheHits: 0,
      },
      create: {
        userId: apiKey.userId,
        postId,
        postUrl: normalizedPostUrl,
        platform: normalizedPlatform,
        postText: text,
        recipientName: savedRecipientName,
        recipientEmail: normalizedExtractedEmail || null,
        recipientHandle: normalizedRecipientHandle,
        recipientProfileUrl: normalizedRecipientProfileUrl,
        actionMode,
        subject,
        message,
        draftResponse: result,
        profileVersion,
        industryTag,
      },
    })

    if (savedDraft.createdAt.getTime() === savedDraft.updatedAt.getTime()) {
      await incrementDraftStats(apiKey.userId)
      await recordActivity(apiKey.userId, "draft")
    }

    reservedUserId = null
    return NextResponse.json(draftResultToResponse(savedDraft, false))

  } catch (error: unknown) {
    if (reservedUserId) {
      await releaseUsage(reservedUserId, "draft").catch(() => {})
    }
    console.error("Match Job Error:", error)
    return NextResponse.json(
      { success: false, code: "server_error", error: getWebErrorMessage("draft_generate_failed") },
      { status: 500 }
    )
  }
}
