import { NextResponse } from "next/server"
import { authenticateBearerRequest } from "@/lib/bearer-auth"
import { updateWeeklyGoal, VALID_WEEKLY_GOALS } from "@/lib/engagement"

export async function PATCH(req: Request) {
  try {
    const auth = await authenticateBearerRequest(req, {
      scope: "extension-engagement",
      limit: 20,
      windowMs: 60 * 60 * 1000,
    })
    if (auth.error) return auth.error

    const body = await req.json()
    const goal = Number(body.weeklyGoal)

    if (!VALID_WEEKLY_GOALS.includes(goal as (typeof VALID_WEEKLY_GOALS)[number])) {
      return NextResponse.json({ error: "Invalid weekly goal" }, { status: 400 })
    }

    await updateWeeklyGoal(auth.apiKey!.userId, goal)

    return NextResponse.json({ success: true, weeklyGoal: goal })
  } catch (error) {
    console.error("Extension engagement PATCH error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
