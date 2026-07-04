import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  draftResultToResponse,
  getProfileVersion,
  normalizeDraftResult,
  type DraftResult,
} from "@/lib/outreach"
import { openai, OPENAI_MODEL } from "@/lib/openai"
import { extractEmailFromText, inferRecipientNameFromEmail } from "@/lib/email"
import { incrementDraftStats } from "@/lib/user-stats"

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
          include: { candidateProfile: true }
        }
      }
    })

    if (!apiKey) {
      return NextResponse.json({ error: "Invalid API Key" }, { status: 401 })
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

    const systemPrompt = `
You are an expert career coach helping a job candidate draft a highly personalized outreach message in response to a job-related social media post.

Candidate profile:
- Name: ${profile.fullName || "Unknown"}
- Current title: ${profile.currentTitle || "N/A"}
- Years of experience: ${profile.yearsExperience ?? "N/A"}
- Location: ${profile.location || "N/A"}
- Skills: ${profile.skills || "N/A"}
- Summary: ${profile.summary || "N/A"}
- Work experience: ${profile.workExperience || "N/A"}
- Education: ${profile.education || "N/A"}
- Desired roles: ${profile.desiredRoles || "N/A"}
- Salary expectation: ${profile.salaryExpectation || "N/A"}
- Work preference: ${profile.workPreference || "N/A"}
- Resume highlights: ${profile.resumeContent?.slice(0, 2000) || "N/A"}

Post / opportunity context:
- Poster name: ${name || "Unknown"}
- Extracted recipient email: ${normalizedExtractedEmail || "None"}
- Email addressee inferred from the email address: ${resolvedEmailRecipientName || "Unknown"}
- Post text: "${text}"

Instructions:
1. Determine if the post is relevant for this candidate (is_hiring_relevant). E.g. hiring post, job opening, recruiter looking for their stack, or networking opportunity.
2. Provide a match_score from 0-100 that reflects how well the opportunity fits the candidate profile.
3. Write a short match_reason (max 20 words) explaining the score.
4. Provide 2-3 fit_highlights as short phrases grounded in the candidate profile or post context.
5. Determine the action_mode. If an email is present, action_mode must be "EMAIL". Otherwise, it must be "DM".
6. Draft the outreach_payload from the candidate's perspective — expressing interest, highlighting relevant experience/skills, and showing genuine engagement with what the poster wrote.
7. If EMAIL, the greeting must follow the recipient email, not automatically the social post author.
8. If EMAIL and the email addressee inferred from the email address is known, address that person by name.
9. If EMAIL and the email addressee is unknown or uncertain, start with a generic greeting like "Hello" and do not guess or invent a person's name.
10. If DM, subject_line should be null, and message_content should be shorter and punchier.
11. Return ONLY a valid JSON object matching this schema exactly:
{
  "detected_name": string,
  "is_hiring_relevant": boolean,
  "match_score": number,
  "match_reason": string,
  "fit_highlights": string[],
  "action_mode": "EMAIL" | "DM",
  "outreach_payload": {
    "subject_line": string | null,
    "message_content": string
  }
}
`

    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Please draft the outreach message. hasEmail: ${hasEmail}` }
      ],
      response_format: { type: "json_object" }
    })

    const responseContent = completion.choices[0]?.message?.content
    if (!responseContent) throw new Error("No response from OpenAI")

    const result = normalizeDraftResult(JSON.parse(responseContent) as DraftResult)

    if (resolvedHasEmail) result.action_mode = "EMAIL"
    if (!resolvedHasEmail) result.action_mode = "DM"

    const actionMode = result.action_mode
    const subject = result.outreach_payload.subject_line
    const message =
      actionMode === "EMAIL"
        ? normalizeEmailGreeting(result.outreach_payload.message_content, resolvedEmailRecipientName)
        : result.outreach_payload.message_content

    result.outreach_payload.message_content = message

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
      },
    })

    // Increment draft stats only on create (not update)
    if (savedDraft.createdAt.getTime() === savedDraft.updatedAt.getTime()) {
      await incrementDraftStats(apiKey.userId)
    }

    return NextResponse.json(draftResultToResponse(savedDraft, false))

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("Match Job Error:", error)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
