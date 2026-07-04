import { prisma } from "./prisma"

function getDateKey() {
  const now = new Date()
  return now.toISOString().split("T")[0] // YYYY-MM-DD
}

function getWeekKey() {
  const now = new Date()
  const year = now.getFullYear()
  const oneJan = new Date(year, 0, 1)
  const days = Math.floor((now.getTime() - oneJan.getTime()) / 86400000)
  const week = Math.ceil((days + oneJan.getDay() + 1) / 7)
  return `${year}-W${week.toString().padStart(2, "0")}`
}

export async function incrementSentStats(userId: string) {
  const dateKey = getDateKey()
  const weekKey = getWeekKey()

  const existing = await prisma.userStats.findUnique({
    where: { userId },
  })

  if (!existing) {
    // First time - create stats
    await prisma.userStats.create({
      data: {
        userId,
        sentToday: 1,
        sentThisWeek: 1,
        totalSent: 1,
        draftsToday: 0,
        lastResetDate: dateKey,
        lastResetWeek: weekKey,
      },
    })
    return
  }

  // Check if need reset
  const resetDay = existing.lastResetDate !== dateKey
  const resetWeek = existing.lastResetWeek !== weekKey

  await prisma.userStats.update({
    where: { userId },
    data: {
      sentToday: resetDay ? 1 : existing.sentToday + 1,
      sentThisWeek: resetWeek ? 1 : existing.sentThisWeek + 1,
      totalSent: existing.totalSent + 1,
      lastResetDate: dateKey,
      lastResetWeek: weekKey,
    },
  })
}

export async function incrementDraftStats(userId: string) {
  const dateKey = getDateKey()
  const weekKey = getWeekKey()

  const existing = await prisma.userStats.findUnique({
    where: { userId },
  })

  if (!existing) {
    await prisma.userStats.create({
      data: {
        userId,
        sentToday: 0,
        sentThisWeek: 0,
        totalSent: 0,
        draftsToday: 1,
        lastResetDate: dateKey,
        lastResetWeek: weekKey,
      },
    })
    return
  }

  const resetDay = existing.lastResetDate !== dateKey

  await prisma.userStats.update({
    where: { userId },
    data: {
      draftsToday: resetDay ? 1 : existing.draftsToday + 1,
      lastResetDate: dateKey,
      lastResetWeek: weekKey,
    },
  })
}

export async function getUserStats(userId: string) {
  const dateKey = getDateKey()
  const weekKey = getWeekKey()

  let stats = await prisma.userStats.findUnique({
    where: { userId },
  })

  if (!stats) {
    // Initialize stats from actual data
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const weekStart = new Date(today)
    weekStart.setDate(today.getDate() - today.getDay())

    const [sentToday, sentThisWeek, totalSent, draftsToday] = await Promise.all([
      prisma.sentOutreach.count({
        where: { userId, sentAt: { gte: today, lt: tomorrow } },
      }),
      prisma.sentOutreach.count({
        where: { userId, sentAt: { gte: weekStart } },
      }),
      prisma.sentOutreach.count({
        where: { userId },
      }),
      prisma.postDraft.count({
        where: { userId, createdAt: { gte: today, lt: tomorrow } },
      }),
    ])

    stats = await prisma.userStats.create({
      data: {
        userId,
        sentToday,
        sentThisWeek,
        totalSent,
        draftsToday,
        lastResetDate: dateKey,
        lastResetWeek: weekKey,
      },
    })
  } else {
    // Check if need reset
    const resetDay = stats.lastResetDate !== dateKey
    const resetWeek = stats.lastResetWeek !== weekKey

    if (resetDay || resetWeek) {
      stats = await prisma.userStats.update({
        where: { userId },
        data: {
          sentToday: resetDay ? 0 : stats.sentToday,
          sentThisWeek: resetWeek ? 0 : stats.sentThisWeek,
          draftsToday: resetDay ? 0 : stats.draftsToday,
          lastResetDate: dateKey,
          lastResetWeek: weekKey,
        },
      })
    }
  }

  return {
    sentToday: stats.sentToday,
    sentThisWeek: stats.sentThisWeek,
    totalSent: stats.totalSent,
    draftsToday: stats.draftsToday,
  }
}
