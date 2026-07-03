import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { extractResumeFields } from "@/lib/resume-extract-server"

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const text = body.text as string | undefined

    if (!text?.trim()) {
      return NextResponse.json({ error: "Resume text is required" }, { status: 400 })
    }

    const extraction = await extractResumeFields(text)

    if (!extraction) {
      return NextResponse.json(
        { error: "Could not extract structured data from resume", data: null },
        { status: 200 }
      )
    }

    return NextResponse.json({ success: true, data: extraction })
  } catch (error) {
    console.error("extract-resume error:", error)
    return NextResponse.json({ error: "Failed to extract resume data" }, { status: 500 })
  }
}
