import { prisma } from "@/lib/prisma"

const CONNECT_TOKEN_TTL_MS = 10 * 60 * 1000

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isValidConnectState(state: string): boolean {
  return UUID_RE.test(state)
}

export async function registerConnectToken(userId: string, state: string) {
  const expiresAt = new Date(Date.now() + CONNECT_TOKEN_TTL_MS)

  const existing = await prisma.connectToken.findUnique({ where: { state } })

  if (existing) {
    if (existing.userId !== userId) {
      return { ok: false as const, code: "invalid_state" as const }
    }
    if (existing.usedAt) {
      return { ok: false as const, code: "already_connected" as const }
    }
    if (existing.expiresAt < new Date()) {
      return { ok: false as const, code: "expired_state" as const }
    }
    return { ok: true as const, token: existing }
  }

  const token = await prisma.connectToken.create({
    data: { state, userId, expiresAt },
  })

  return { ok: true as const, token }
}

export async function consumeConnectToken(userId: string, state: string) {
  const token = await prisma.connectToken.findUnique({ where: { state } })

  if (!token || token.userId !== userId) {
    return { ok: false as const, code: "invalid_state" as const }
  }

  if (token.usedAt) {
    return { ok: false as const, code: "already_connected" as const }
  }

  if (token.expiresAt < new Date()) {
    return { ok: false as const, code: "expired_state" as const }
  }

  await prisma.connectToken.update({
    where: { id: token.id },
    data: { usedAt: new Date() },
  })

  return { ok: true as const }
}
