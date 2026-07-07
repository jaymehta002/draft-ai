import { createHash, randomBytes } from "crypto"
import { prisma } from "@/lib/prisma"

const KEY_PREFIX_LENGTH = 10

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex")
}

export function apiKeyPrefix(key: string): string {
  return key.slice(0, KEY_PREFIX_LENGTH)
}

export async function createUserApiKey(userId: string): Promise<string> {
  const key = "rp_" + randomBytes(32).toString("hex")
  const keyHash = hashApiKey(key)
  const keyPrefix = apiKeyPrefix(key)

  await prisma.apiKey.deleteMany({ where: { userId } })

  await prisma.apiKey.create({
    data: { keyHash, keyPrefix, userId },
  })

  return key
}

/** Issues a fresh API key on each extension connect handshake. */
export async function ensureUserApiKey(userId: string): Promise<string> {
  return createUserApiKey(userId)
}

export async function validateApiKey(token: string) {
  const keyHash = hashApiKey(token)
  return prisma.apiKey.findUnique({
    where: { keyHash },
    include: {
      user: {
        include: { candidateProfile: true },
      },
    },
  })
}
