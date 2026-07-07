import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)

    const activeUsers = await prisma.user.findMany({
      where: {
        OR: [
          { postDrafts: { some: { createdAt: { gte: fourteenDaysAgo } } } },
          { sentOutreach: { some: { sentAt: { gte: fourteenDaysAgo } } } },
        ],
      },
      select: { id: true },
      take: 200,
    })

    let synced = 0

    for (const user of activeUsers) {
      const winners = await prisma.sentOutreach.findMany({
        where: {
          userId: user.id,
          responseReceivedAt: { not: null },
          matchScore: { gte: 70 },
        },
        orderBy: { responseReceivedAt: "desc" },
        take: 20,
      })

      for (const w of winners) {
        const excerpt = w.message.slice(0, 280).trim()
        if (!excerpt) continue

        const existing = await prisma.winningTemplate.findFirst({
          where: { excerpt, toneUsed: w.toneUsed, userId: user.id },
        })
        if (existing) continue

        await prisma.winningTemplate.create({
          data: {
            userId: user.id,
            industryTag: w.industryTag,
            toneUsed: w.toneUsed,
            excerpt,
            matchScore: w.matchScore,
            isPublished: true,
          },
        })
        synced++
      }
    }

    return NextResponse.json({ synced, users: activeUsers.length })
  } catch (error) {
    console.error("Sync winning templates cron error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
