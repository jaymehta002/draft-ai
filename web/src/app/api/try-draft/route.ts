import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { openai, OPENAI_MODEL } from "@/lib/openai"
import { buildDraftSystemPrompt, SAMPLE_POST_TEXT, type DraftProfileContext } from "@/lib/draft-prompt"
import { normalizeDraftResult, type DraftResult } from "@/lib/outreach"

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    const body = await req.json()
    const postText = (body.postText as string)?.trim() || SAMPLE_POST_TEXT
    const bioHint = (body.bioHint as string)?.trim() || ""

    let profileContext: DraftProfileContext = {
      fullName: bioHint.split("—")[0]?.trim() || "Job seeker",
      currentTitle: null as string | null,
      yearsExperience: null as number | null,
      location: null as string | null,
      skills: null as string | null,
      summary: bioHint || null,
      workExperience: bioHint || null,
      education: null as string | null,
      desiredRoles: null as string | null,
      salaryExpectation: null as string | null,
      workPreference: null as string | null,
      resumeContent: bioHint || null,
    }

    let preferences = {
      outreachTone: "professional",
      draftLength: "medium",
      outreachLanguage: "en",
    }

    if (session?.user?.email) {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        include: { candidateProfile: true },
      })

      const profile = user?.candidateProfile
      if (profile) {
        profileContext = {
          fullName: profile.fullName ?? null,
          currentTitle: profile.currentTitle,
          yearsExperience: profile.yearsExperience,
          location: profile.location,
          skills: profile.skills,
          summary: profile.summary,
          workExperience: profile.workExperience,
          education: profile.education,
          desiredRoles: profile.desiredRoles,
          salaryExpectation: profile.salaryExpectation,
          workPreference: profile.workPreference,
          resumeContent: profile.resumeContent,
        }
        preferences = {
          outreachTone: profile.outreachTone || "professional",
          draftLength: profile.draftLength || "medium",
          outreachLanguage: profile.outreachLanguage || "en",
        }
      }
    }

    const systemPrompt = buildDraftSystemPrompt(
      profileContext,
      { text: postText, name: "Hiring manager" },
      preferences
    )

    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Please draft the outreach message. hasEmail: false" },
      ],
      response_format: { type: "json_object" },
    })

    const responseContent = completion.choices[0]?.message?.content
    if (!responseContent) throw new Error("No response from OpenAI")

    const result = normalizeDraftResult(JSON.parse(responseContent) as DraftResult)

    return NextResponse.json({
      success: true,
      draft: {
        message: result.outreach_payload.message_content,
        subject: result.outreach_payload.subject_line,
        actionMode: result.action_mode,
        matchScore: result.match_score,
        matchReason: result.match_reason,
        fitHighlights: result.fit_highlights,
      },
      usedProfile: Boolean(session?.user?.email),
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("Try draft error:", error)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
