import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { suggestSkills } from "@/lib/skill-suggest"

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { currentTitle, yearsExperience, existingSkills } = body

    if (!currentTitle?.trim()) {
      return NextResponse.json({ error: "Current title is required" }, { status: 400 })
    }

    const skills = await suggestSkills(
      currentTitle,
      yearsExperience ?? "",
      Array.isArray(existingSkills) ? existingSkills : []
    )

    if (!skills) {
      return NextResponse.json(
        { error: "Failed to suggest skills" },
        { status: 422 }
      )
    }

    return NextResponse.json({ success: true, data: skills })
  } catch (error) {
    console.error("suggest-skills error:", error)
    return NextResponse.json({ error: "Failed to suggest skills" }, { status: 500 })
  }
}
