import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { toCandidateProfileData } from "@/lib/candidate-profile"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        candidateProfile: true,
        postDrafts: { orderBy: { createdAt: "desc" }, take: 200 },
        sentOutreach: { orderBy: { sentAt: "desc" }, take: 200 },
        emailThreads: {
          include: { messages: { orderBy: { receivedAt: "asc" } } },
          orderBy: { lastMessageAt: "desc" },
          take: 100,
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const exportData = {
      exportedAt: new Date().toISOString(),
      email: user.email,
      name: user.name,
      profile: user.candidateProfile
        ? toCandidateProfileData(user.candidateProfile)
        : null,
      drafts: user.postDrafts.map((d) => ({
        postId: d.postId,
        platform: d.platform,
        message: d.message,
        createdAt: d.createdAt,
      })),
      outreach: user.sentOutreach.map((o) => ({
        postId: o.postId,
        platform: o.platform,
        actionMode: o.actionMode,
        status: o.status,
        message: o.message,
        sentAt: o.sentAt,
        responseReceivedAt: o.responseReceivedAt,
      })),
      emailThreads: user.emailThreads.map((t) => ({
        subject: t.subject,
        participantEmail: t.participantEmail,
        messages: t.messages.map((m) => ({
          direction: m.direction,
          subject: m.subject,
          snippet: m.snippet,
          receivedAt: m.receivedAt,
        })),
      })),
    }

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="draft-ai-export-${user.id}.json"`,
      },
    })
  } catch (error) {
    console.error("Account export error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
