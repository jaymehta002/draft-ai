import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

export type ActivityType = "draft" | "send" | "reply"

export type Celebration = {
  type: "reply"
  outreachId: string
  recipientName: string | null
  messageExcerpt: string
  actionMode: string
}

export type MilestoneId =
  | "FIRST_DRAFT"
  | "FIRST_SEND"
  | "FIRST_REPLY"
  | "STREAK_3"
  | "STREAK_7"
  | "CONVERSATIONS_10"
  | "REPLY_RATE_20"

export const MILESTONE_LABELS: Record<MilestoneId, string> = {
  FIRST_DRAFT: "First Draft",
  FIRST_SEND: "First Conversation",
  FIRST_REPLY: "First Reply",
  STREAK_3: "3-Day Streak",
  STREAK_7: "Week Warrior",
  CONVERSATIONS_10: "10 Conversations",
  REPLY_RATE_20: "20% Club",
}

const STREAK_BREAK_MS = 48 * 60 * 60 * 1000
const VALID_WEEKLY_GOALS = [3, 5, 10, 15] as const

export function getWeekKey(date = new Date()) {
  const year = date.getFullYear()
  const oneJan = new Date(year, 0, 1)
  const days = Math.floor((date.getTime() - oneJan.getTime()) / 86400000)
  const week = Math.ceil((days + oneJan.getDay() + 1) / 7)
  return `${year}-W${week.toString().padStart(2, "0")}`
}

function getDateKey(date = new Date()) {
  return date.toISOString().split("T")[0]
}

function isSameCalendarDay(a: Date, b: Date) {
  return getDateKey(a) === getDateKey(b)
}

function parseCelebrations(raw: unknown): Celebration[] {
  if (!Array.isArray(raw)) return []
  return raw.filter(
    (c): c is Celebration =>
      typeof c === "object" &&
      c !== null &&
      c.type === "reply" &&
      typeof c.outreachId === "string"
  )
}

async function ensureEngagement(userId: string) {
  const weekKey = getWeekKey()
  return prisma.userEngagement.upsert({
    where: { userId },
    create: {
      userId,
      lastWeekReset: weekKey,
    },
    update: {},
  })
}

async function computeWeekProgress(userId: string): Promise<number> {
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  weekStart.setHours(0, 0, 0, 0)

  return prisma.sentOutreach.count({
    where: {
      userId,
      sentAt: { gte: weekStart },
      status: { in: ["SENT", "COPIED"] },
    },
  })
}

function computeStreakUpdate(
  current: { currentStreak: number; longestStreak: number; lastActivityAt: Date | null },
  now: Date
) {
  if (!current.lastActivityAt) {
    return { currentStreak: 1, longestStreak: Math.max(1, current.longestStreak) }
  }

  if (isSameCalendarDay(current.lastActivityAt, now)) {
    return {
      currentStreak: current.currentStreak,
      longestStreak: current.longestStreak,
    }
  }

  const gap = now.getTime() - current.lastActivityAt.getTime()
  if (gap > STREAK_BREAK_MS) {
    return { currentStreak: 1, longestStreak: current.longestStreak }
  }

  const nextStreak = current.currentStreak + 1
  return {
    currentStreak: nextStreak,
    longestStreak: Math.max(current.longestStreak, nextStreak),
  }
}

export type RecordActivityOptions = {
  outreachId?: string
  recipientName?: string | null
  messageExcerpt?: string
  actionMode?: string
}

export type EngagementUpdate = {
  currentStreak: number
  longestStreak: number
  weekProgress: number
  weeklyGoal: number
  newMilestones: MilestoneId[]
  newCelebration: boolean
}

export async function recordActivity(
  userId: string,
  type: ActivityType,
  options: RecordActivityOptions = {}
): Promise<EngagementUpdate> {
  const now = new Date()
  const weekKey = getWeekKey(now)
  const existing = await ensureEngagement(userId)

  const resetWeek = existing.lastWeekReset !== weekKey
  let weekProgress = resetWeek ? 0 : existing.weekProgress

  if (type === "send") {
    weekProgress = await computeWeekProgress(userId)
  } else if (!resetWeek && type === "draft") {
    weekProgress = existing.weekProgress
  } else if (!resetWeek) {
    weekProgress = existing.weekProgress
  }

  const streakUpdate = computeStreakUpdate(existing, now)

  let pendingCelebrations = parseCelebrations(existing.pendingCelebrations)
  let newCelebration = false

  if (type === "reply" && options.outreachId) {
    const alreadyQueued = pendingCelebrations.some((c) => c.outreachId === options.outreachId)
    if (!alreadyQueued) {
      pendingCelebrations = [
        ...pendingCelebrations,
        {
          type: "reply",
          outreachId: options.outreachId,
          recipientName: options.recipientName ?? null,
          messageExcerpt: (options.messageExcerpt ?? "").slice(0, 200),
          actionMode: options.actionMode ?? "EMAIL",
        },
      ]
      newCelebration = true
    }
  }

  await prisma.userEngagement.update({
    where: { userId },
    data: {
      currentStreak: streakUpdate.currentStreak,
      longestStreak: streakUpdate.longestStreak,
      lastActivityAt: now,
      weekProgress,
      lastWeekReset: weekKey,
      pendingCelebrations: pendingCelebrations.length > 0 ? pendingCelebrations : undefined,
    },
  })

  const newMilestones = await checkMilestones(userId, type)

  const updated = await prisma.userEngagement.findUnique({ where: { userId } })

  return {
    currentStreak: updated?.currentStreak ?? streakUpdate.currentStreak,
    longestStreak: updated?.longestStreak ?? streakUpdate.longestStreak,
    weekProgress: updated?.weekProgress ?? weekProgress,
    weeklyGoal: updated?.weeklyGoal ?? 5,
    newMilestones,
    newCelebration,
  }
}

export async function checkMilestones(
  userId: string,
  _event?: ActivityType
): Promise<MilestoneId[]> {
  void _event
  const [engagement, draftCount, sentCount, replyCount, stats] = await Promise.all([
    prisma.userEngagement.findUnique({ where: { userId } }),
    prisma.postDraft.count({ where: { userId } }),
    prisma.sentOutreach.count({ where: { userId } }),
    prisma.sentOutreach.count({ where: { userId, responseReceivedAt: { not: null } } }),
    prisma.userStats.findUnique({ where: { userId } }),
  ])

  const candidates: MilestoneId[] = []
  if (draftCount >= 1) candidates.push("FIRST_DRAFT")
  if (sentCount >= 1) candidates.push("FIRST_SEND")
  if (replyCount >= 1) candidates.push("FIRST_REPLY")
  if ((engagement?.currentStreak ?? 0) >= 3) candidates.push("STREAK_3")
  if ((engagement?.currentStreak ?? 0) >= 7) candidates.push("STREAK_7")
  if (sentCount >= 10) candidates.push("CONVERSATIONS_10")

  const totalSent = stats?.totalSent ?? sentCount
  const totalReplied = stats?.totalReplied ?? replyCount
  const replyRate = totalSent > 0 ? (totalReplied / totalSent) * 100 : 0
  if (totalSent >= 5 && replyRate >= 20) candidates.push("REPLY_RATE_20")

  const existing = await prisma.userMilestone.findMany({
    where: { userId },
    select: { milestone: true },
  })
  const existingSet = new Set(existing.map((m) => m.milestone))

  const unlocked: MilestoneId[] = []
  for (const milestone of candidates) {
    if (!existingSet.has(milestone)) {
      await prisma.userMilestone.create({
        data: { userId, milestone },
      })
      unlocked.push(milestone)
    }
  }

  return unlocked
}

export type EngagementSnapshot = {
  currentStreak: number
  longestStreak: number
  weeklyGoal: number
  weekProgress: number
  weeklyGoalExplicit: boolean
  milestones: MilestoneId[]
  pendingCelebrations: Celebration[]
  lastActivityAt: string | null
}

export async function getEngagement(userId: string): Promise<EngagementSnapshot> {
  const weekKey = getWeekKey()
  let engagement = await prisma.userEngagement.findUnique({ where: { userId } })

  if (!engagement) {
    engagement = await prisma.userEngagement.create({
      data: { userId, lastWeekReset: weekKey },
    })
  }

  const resetWeek = engagement.lastWeekReset !== weekKey
  let weekProgress = engagement.weekProgress

  if (resetWeek) {
    weekProgress = await computeWeekProgress(userId)
    engagement = await prisma.userEngagement.update({
      where: { userId },
      data: { weekProgress, lastWeekReset: weekKey },
    })
  }

  const milestones = await prisma.userMilestone.findMany({
    where: { userId },
    select: { milestone: true },
    orderBy: { unlockedAt: "asc" },
  })

  return {
    currentStreak: engagement.currentStreak,
    longestStreak: engagement.longestStreak,
    weeklyGoal: engagement.weeklyGoal,
    weekProgress,
    weeklyGoalExplicit: engagement.weeklyGoalExplicit,
    milestones: milestones.map((m) => m.milestone as MilestoneId),
    pendingCelebrations: parseCelebrations(engagement.pendingCelebrations),
    lastActivityAt: engagement.lastActivityAt?.toISOString() ?? null,
  }
}

export async function getPendingCelebrations(userId: string): Promise<Celebration[]> {
  const engagement = await prisma.userEngagement.findUnique({ where: { userId } })
  if (!engagement) return []
  return parseCelebrations(engagement.pendingCelebrations)
}

export async function consumeCelebrations(userId: string): Promise<Celebration[]> {
  const engagement = await prisma.userEngagement.findUnique({ where: { userId } })
  if (!engagement) return []

  const pending = parseCelebrations(engagement.pendingCelebrations)
  if (pending.length === 0) return []

  await prisma.userEngagement.update({
    where: { userId },
    data: { pendingCelebrations: Prisma.DbNull },
  })

  return pending
}

export async function updateWeeklyGoal(userId: string, goal: number) {
  if (!VALID_WEEKLY_GOALS.includes(goal as (typeof VALID_WEEKLY_GOALS)[number])) {
    throw new Error("Invalid weekly goal")
  }

  await ensureEngagement(userId)
  const weekProgress = await computeWeekProgress(userId)

  await prisma.userEngagement.update({
    where: { userId },
    data: {
      weeklyGoal: goal,
      weeklyGoalExplicit: true,
      weekProgress,
      lastWeekReset: getWeekKey(),
    },
  })
}

/** Exported for unit tests */
export function computeStreakForTest(
  lastActivityAt: Date | null,
  currentStreak: number,
  longestStreak: number,
  now: Date
) {
  return computeStreakUpdate({ lastActivityAt, currentStreak, longestStreak }, now)
}

export { VALID_WEEKLY_GOALS }
