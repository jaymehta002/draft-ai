import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { consumeCelebrations } from "@/lib/engagement"

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

    const celebrations = await consumeCelebrations(user.id)
    return NextResponse.json({ celebrations })
  } catch (error) {
    console.error("Consume celebrations error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
