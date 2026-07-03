import { randomBytes } from "crypto"
import { prisma } from "@/lib/prisma"

export async function ensureUserApiKey(userId: string): Promise<string> {
  const existing = await prisma.apiKey.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  })

  if (existing) {
    return existing.key
  }

  const key = "rp_" + randomBytes(32).toString("hex")

  await prisma.apiKey.create({
    data: { key, userId },
  })

  return key
}

export async function validateApiKey(token: string) {
  return prisma.apiKey.findUnique({
    where: { key: token },
    include: {
      user: {
        include: { candidateProfile: true },
      },
    },
  })
}
