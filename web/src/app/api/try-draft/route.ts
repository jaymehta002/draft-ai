import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { openai, OPENAI_MODEL } from "@/lib/openai"
import { buildDraftSystemPrompt, SAMPLE_POST_TEXT, type DraftProfileContext } from "@/lib/draft-prompt"
import { normalizeDraftResult, type DraftResult } from "@/lib/outreach"
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit"

function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  )
}

export async function POST(req: Request) {
  try {
    const limited = rateLimit({
      key: `try-draft:${clientIp(req)}`,
      limit: 5,
      windowMs: 60 * 60 * 1000,
    })
    if (!limited.success) {
      return rateLimitResponse(limited.resetAt)
    }

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
    if (!responseContent) {
      return NextResponse.json(
        {
          success: false,
          code: "ai_no_response",
          error: "Draft AI didn’t get a response from the AI model. Please try again.",
        },
        { status: 502 }
      )
    }

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
    console.error("Try draft error:", error)
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
