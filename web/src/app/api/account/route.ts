import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const confirmEmail = (body.confirmEmail as string | undefined)?.trim()

    if (confirmEmail !== session.user.email) {
      return NextResponse.json(
        { error: "Email confirmation does not match your account" },
        { status: 400 }
      )
    }

    await prisma.user.delete({ where: { id: session.user.id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Account delete error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
