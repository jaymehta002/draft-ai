import { NextResponse } from "next/server"
import { validateApiKey } from "@/lib/api-key"
import { prisma } from "@/lib/prisma"
import {
  accountHasFullGmailAccess,
  accountHasGmailReadonly,
  accountHasGmailSend,
} from "@/lib/gmail-scopes"

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ valid: false, error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split(" ")[1]
    const apiKey = await validateApiKey(token)

    if (!apiKey) {
      return NextResponse.json({ valid: false, error: "Invalid API key" }, { status: 401 })
    }

    const [account, mailboxSync, draftCount] = await Promise.all([
      prisma.account.findFirst({
        where: { userId: apiKey.userId, provider: "google" },
        select: { scope: true, refresh_token: true },
      }),
      prisma.mailboxSync.findUnique({
        where: { userId: apiKey.userId },
        select: { syncError: true },
      }),
      prisma.postDraft.count({ where: { userId: apiKey.userId } }),
    ])

    const hasGmailSend = accountHasGmailSend(account?.scope)
    const hasGmailReadonly = accountHasGmailReadonly(account?.scope)
    const hasRefreshToken = Boolean(account?.refresh_token)
    const gmailMissingReadonly = hasGmailSend && !hasGmailReadonly
    const gmailConnected =
      accountHasFullGmailAccess(account?.scope) && hasRefreshToken && !mailboxSync?.syncError

    return NextResponse.json({
      valid: true,
      email: apiKey.user.email,
      name: apiKey.user.name,
      hasProfile: !!apiKey.user.candidateProfile?.onboardingComplete,
      gmailConnected,
      gmailMissingReadonly,
      hasDrafted: draftCount > 0,
    })
  } catch (error) {
    console.error("Extension status error:", error)
    return NextResponse.json({ valid: false, error: "Internal server error" }, { status: 500 })
  }
}
