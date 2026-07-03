import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  draftResultToResponse,
  getProfileVersion,
  type DraftResult,
} from "@/lib/outreach"
import { openai, OPENAI_MODEL } from "@/lib/openai"

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
    const { text, name, hasEmail, extractedEmail, postId, postUrl, platform, recipientHandle, recipientProfileUrl } = body

    if (!text) {
      return NextResponse.json({ error: "Missing post text" }, { status: 400 })
    }

    if (!postId) {
      return NextResponse.json({ error: "Missing post ID" }, { status: 400 })
    }

    const profileVersion = getProfileVersion(profile.updatedAt)
    const existingDraft = await prisma.postDraft.findUnique({
      where: {
        userId_postId: {
          userId: apiKey.userId,
          postId,
        },
      },
    })

    if (existingDraft && existingDraft.profileVersion === profileVersion) {
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
- Poster name: ${name || "Unknown (use a friendly generic greeting if unknown)"}
- Post text: "${text}"

Instructions:
1. Determine if the post is relevant for this candidate (is_hiring_relevant). E.g. hiring post, job opening, recruiter looking for their stack, or networking opportunity.
2. Determine the action_mode. If they provided an email (hasEmail is true), action_mode must be "EMAIL". Otherwise, it must be "DM".
3. Draft the outreach_payload from the candidate's perspective — expressing interest, highlighting relevant experience/skills, and showing genuine engagement with what the poster wrote.
4. If EMAIL, provide a catchy subject_line and the message_content.
5. If DM, subject_line should be null, and message_content should be shorter and punchier.
6. Return ONLY a valid JSON object matching this schema exactly:
{
  "detected_name": string,
  "is_hiring_relevant": boolean,
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

    const result = JSON.parse(responseContent) as DraftResult

    if (hasEmail) result.action_mode = "EMAIL"
    if (!hasEmail) result.action_mode = "DM"

    const actionMode = result.action_mode
    const subject = result.outreach_payload.subject_line
    const message = result.outreach_payload.message_content

    const savedDraft = await prisma.postDraft.upsert({
      where: {
        userId_postId: {
          userId: apiKey.userId,
          postId,
        },
      },
      update: {
        platform: platform || "UNKNOWN",
        postUrl: postUrl || null,
        postText: text,
        recipientName: name || null,
        recipientEmail: extractedEmail || null,
        recipientHandle: recipientHandle || null,
        recipientProfileUrl: recipientProfileUrl || null,
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
        postUrl: postUrl || null,
        platform: platform || "UNKNOWN",
        postText: text,
        recipientName: name || null,
        recipientEmail: extractedEmail || null,
        recipientHandle: recipientHandle || null,
        recipientProfileUrl: recipientProfileUrl || null,
        actionMode,
        subject,
        message,
        draftResponse: result,
        profileVersion,
      },
    })

    return NextResponse.json(draftResultToResponse(savedDraft, false))

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("Match Job Error:", error)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
