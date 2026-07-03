import { NextResponse } from "next/server"
import { validateApiKey } from "@/lib/api-key"

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ valid: false, error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split(" ")[1]
    const apiKey = await validateApiKey(token)

    if (!apiKey) {
      return NextResponse.json({ valid: false, error: "Invalid API key" }, { status: 401 })
    }

    return NextResponse.json({
      valid: true,
      email: apiKey.user.email,
      name: apiKey.user.name,
      hasProfile: !!apiKey.user.candidateProfile?.onboardingComplete,
    })
  } catch (error) {
    console.error("Extension status error:", error)
    return NextResponse.json({ valid: false, error: "Internal server error" }, { status: 500 })
  }
}
