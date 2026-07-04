import { NextResponse } from "next/server"
import { validateApiKey } from "@/lib/api-key"
import { getUserStats } from "@/lib/user-stats"

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split(" ")[1]
    const apiKey = await validateApiKey(token)

    if (!apiKey) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 })
    }

    // Single lookup, no aggregations
    const stats = await getUserStats(apiKey.userId)

    return NextResponse.json(stats)
  } catch (error) {
    console.error("Extension analytics error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
