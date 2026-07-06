import { prisma } from "@/lib/prisma"

export type RateBucket = { sent: number; replied: number; rate: number }

export type UserReplyMetrics = {
  totalSent: number
  totalReplied: number
  replyRate: number
  replyRate7d: number
  repliedThisWeek: number
  byChannel: { EMAIL: RateBucket; DM: RateBucket }
  byPlatform: Record<string, RateBucket>
  byTone: Record<string, RateBucket>
  toneInsights: Array<{ tone: string; message: string; sent: number; replied: number; rate: number }>
}

function computeRate(sent: number, replied: number): number {
  if (sent === 0) return 0
  return Math.round((replied / sent) * 1000) / 10
}

/** Exported for unit tests */
export function computeReplyRate(sent: number, replied: number): number {
  return computeRate(sent, replied)
}

function bumpBucket(
  buckets: Record<string, RateBucket>,
  key: string,
  replied: boolean
) {
  if (!buckets[key]) buckets[key] = { sent: 0, replied: 0, rate: 0 }
  buckets[key].sent += 1
  if (replied) buckets[key].replied += 1
  buckets[key].rate = computeRate(buckets[key].sent, buckets[key].replied)
}

export async function getUserReplyMetrics(userId: string): Promise<UserReplyMetrics> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const outreach = await prisma.sentOutreach.findMany({
    where: { userId },
    select: {
      actionMode: true,
      platform: true,
      toneUsed: true,
      responseReceivedAt: true,
      sentAt: true,
    },
  })

  const totalSent = outreach.length
  const totalReplied = outreach.filter((o) => o.responseReceivedAt).length
  const replyRate = computeRate(totalSent, totalReplied)

  const recent = outreach.filter((o) => o.sentAt >= sevenDaysAgo)
  const recentReplied = recent.filter((o) => o.responseReceivedAt).length
  const replyRate7d = computeRate(recent.length, recentReplied)

  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  weekStart.setHours(0, 0, 0, 0)
  const repliedThisWeek = outreach.filter(
    (o) => o.responseReceivedAt && o.responseReceivedAt >= weekStart
  ).length

  const byChannel: UserReplyMetrics["byChannel"] = {
    EMAIL: { sent: 0, replied: 0, rate: 0 },
    DM: { sent: 0, replied: 0, rate: 0 },
  }
  const byPlatform: Record<string, RateBucket> = {}
  const byTone: Record<string, RateBucket> = {}

  for (const row of outreach) {
    const replied = Boolean(row.responseReceivedAt)
    const channel = row.actionMode === "EMAIL" ? "EMAIL" : "DM"
    byChannel[channel].sent += 1
    if (replied) byChannel[channel].replied += 1

    bumpBucket(byPlatform, row.platform || "UNKNOWN", replied)
    bumpBucket(byTone, row.toneUsed || "unknown", replied)
  }

  byChannel.EMAIL.rate = computeRate(byChannel.EMAIL.sent, byChannel.EMAIL.replied)
  byChannel.DM.rate = computeRate(byChannel.DM.sent, byChannel.DM.replied)

  const toneInsights = Object.entries(byTone)
    .filter(([tone]) => tone !== "unknown")
    .map(([tone, bucket]) => ({
      tone,
      sent: bucket.sent,
      replied: bucket.replied,
      rate: bucket.rate,
      message: buildToneInsightMessage(tone, bucket),
    }))
    .filter((t) => t.sent >= 5)
    .sort((a, b) => b.rate - a.rate)

  return {
    totalSent,
    totalReplied,
    replyRate,
    replyRate7d,
    repliedThisWeek,
    byChannel,
    byPlatform,
    byTone,
    toneInsights,
  }
}

function buildToneInsightMessage(tone: string, bucket: RateBucket): string {
  const label = tone.charAt(0).toUpperCase() + tone.slice(1)
  return `${label} tone: ${bucket.rate}% reply rate (${bucket.replied}/${bucket.sent})`
}

export async function recomputeReplyRate7d(userId: string): Promise<number> {
  const metrics = await getUserReplyMetrics(userId)
  await prisma.userStats.upsert({
    where: { userId },
    create: {
      userId,
      totalReplied: metrics.totalReplied,
      repliedThisWeek: metrics.repliedThisWeek,
      replyRate7d: metrics.replyRate7d,
      lastResetDate: new Date().toISOString().split("T")[0],
      lastResetWeek: getWeekKey(),
    },
    update: {
      totalReplied: metrics.totalReplied,
      repliedThisWeek: metrics.repliedThisWeek,
      replyRate7d: metrics.replyRate7d,
    },
  })
  return metrics.replyRate7d
}

function getWeekKey() {
  const now = new Date()
  const year = now.getFullYear()
  const oneJan = new Date(year, 0, 1)
  const days = Math.floor((now.getTime() - oneJan.getTime()) / 86400000)
  const week = Math.ceil((days + oneJan.getDay() + 1) / 7)
  return `${year}-W${week.toString().padStart(2, "0")}`
}
