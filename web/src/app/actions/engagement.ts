"use server"

import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import {
  getEngagement,
  consumeCelebrations,
  updateWeeklyGoal,
  type EngagementSnapshot,
  type Celebration,
} from "@/lib/engagement"

async function getAuthenticatedUser() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) throw new Error("Unauthorized")

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) throw new Error("User not found")

  return user
}

export async function getEngagementData(): Promise<EngagementSnapshot> {
  const user = await getAuthenticatedUser()
  return getEngagement(user.id)
}

export async function getPendingCelebrationsAction(): Promise<Celebration[]> {
  const user = await getAuthenticatedUser()
  const { getPendingCelebrations } = await import("@/lib/engagement")
  return getPendingCelebrations(user.id)
}

export async function consumeCelebrationsAction(): Promise<Celebration[]> {
  const user = await getAuthenticatedUser()
  return consumeCelebrations(user.id)
}

export async function setWeeklyGoalAction(goal: number) {
  const user = await getAuthenticatedUser()
  await updateWeeklyGoal(user.id, goal)
}
