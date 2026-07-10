"use server"

import { cache } from "react"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { createUserApiKey } from "@/lib/api-key"
import {
  formatOnboardingValidationError,
  getOnboardingValidationIssues,
  isOnboardingComplete,
  parseCandidateFormData,
  syncLegacyFields,
  toCandidateProfileData,
} from "@/lib/candidate-profile"
import {
  accountHasFullGmailAccess,
  accountHasGmailReadonly,
  accountHasGmailSend,
  formatGmailAuthError,
} from "@/lib/gmail-scopes"
import { getEmailLifecycleState, getOutreachLifecycleState } from "@/lib/outreach-state"
import { getPipelineColumnForOutreach, isFollowUpEligible } from "@/lib/pipeline"
import { resolvePostUrl } from "@/lib/post-url"
import { utapi } from "@/lib/uploadthing-server"

async function getAuthenticatedUser() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) throw new Error("Unauthorized")

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) throw new Error("User not found")

  return user
}

export async function saveCandidateProfile(formData: FormData, completeOnboarding = false) {
  const user = await getAuthenticatedUser()
  const data = syncLegacyFields(parseCandidateFormData(formData))
  const yearsExperience = data.yearsExperience ? parseInt(data.yearsExperience, 10) : null
  const resumeFileSize = data.resumeFileSize ? parseInt(data.resumeFileSize, 10) : null

  const onboardingComplete = completeOnboarding ? isOnboardingComplete(data) : false

  if (completeOnboarding && !onboardingComplete) {
    const issues = getOnboardingValidationIssues(data)
    throw new Error(formatOnboardingValidationError(issues))
  }

  const existingProfile = await prisma.candidateProfile.findUnique({
    where: { userId: user.id },
    select: { resumeStorageKey: true },
  })

  const payload = {
    fullName: data.fullName,
    phone: data.phone,
    location: data.location,
    linkedinUrl: data.linkedinUrl,
    portfolioUrl: data.portfolioUrl,
    githubUrl: data.githubUrl,
    currentTitle: data.currentTitle,
    yearsExperience: Number.isNaN(yearsExperience) ? null : yearsExperience,
    summary: data.summary,
    workExperience: data.workExperience,
    workExperiences: data.workExperiences,
    projects: data.projects,
    certificates: data.certificates,
    education: data.education,
    skills: data.skills,
    certifications: data.certifications,
    resumeFileName: data.resumeFileName,
    resumeMimeType: data.resumeMimeType || null,
    resumeStorageKey: data.resumeStorageKey || null,
    resumeFileUrl: data.resumeFileUrl || null,
    resumeFileSize: Number.isNaN(resumeFileSize) ? null : resumeFileSize,
    resumeFileData: data.resumeFileData ? Buffer.from(data.resumeFileData, "base64") : null,
    resumeContent: data.resumeContent,
    desiredRoles: data.desiredRoles,
    salaryExpectation: data.salaryExpectation,
    workPreference: data.workPreference,
    availability: data.availability,
    outreachTone: data.outreachTone || "professional",
    draftLength: data.draftLength || "medium",
    outreachLanguage: data.outreachLanguage || "en",
    onboardingComplete: completeOnboarding ? onboardingComplete : undefined,
  }

  await prisma.candidateProfile.upsert({
    where: { userId: user.id },
    update: payload,
    create: {
      userId: user.id,
      ...payload,
      onboardingComplete: completeOnboarding ? onboardingComplete : false,
    },
  })

  const previousStorageKey = existingProfile?.resumeStorageKey?.trim() || null
  const nextStorageKey = data.resumeStorageKey.trim() || null

  if (previousStorageKey && previousStorageKey !== nextStorageKey) {
    try {
      await utapi.deleteFiles(previousStorageKey)
    } catch (error) {
      console.error("Failed to delete replaced resume from UploadThing:", error)
    }
  }
}

export async function saveOutreachPreferences(prefs: {
  outreachTone: string
  draftLength: string
  outreachLanguage: string
}) {
  const user = await getAuthenticatedUser()

  await prisma.candidateProfile.upsert({
    where: { userId: user.id },
    update: {
      outreachTone: prefs.outreachTone,
      draftLength: prefs.draftLength,
      outreachLanguage: prefs.outreachLanguage,
    },
    create: {
      userId: user.id,
      outreachTone: prefs.outreachTone,
      draftLength: prefs.draftLength,
      outreachLanguage: prefs.outreachLanguage,
      onboardingComplete: false,
    },
  })
}

export async function getIntegrationStatus() {
  const user = await getAuthenticatedUser()

  const [account, mailboxSync, draftCount, apiKeyRecord, userRecord] = await Promise.all([
    prisma.account.findFirst({
      where: { userId: user.id, provider: "google" },
      select: { scope: true, refresh_token: true },
    }),
    prisma.mailboxSync.findUnique({
      where: { userId: user.id },
      select: { syncError: true },
    }),
    prisma.postDraft.count({ where: { userId: user.id } }),
    prisma.apiKey.findFirst({
      where: { userId: user.id },
      select: { id: true },
    }),
    prisma.user.findUnique({
      where: { id: user.id },
      select: { extensionLastSeenAt: true },
    }),
  ])

  const extensionLastSeenAt = userRecord?.extensionLastSeenAt ?? null
  const extensionKeyIssued = Boolean(apiKeyRecord)
  const extensionActiveThreshold = Date.now() - 15 * 60 * 1000
  const extensionConnected = Boolean(
    extensionLastSeenAt && extensionLastSeenAt.getTime() > extensionActiveThreshold
  )

  const hasGmailSend = accountHasGmailSend(account?.scope)
  const hasGmailReadonly = accountHasGmailReadonly(account?.scope)
  const hasRefreshToken = Boolean(account?.refresh_token)
  const gmailMissingReadonly = hasGmailSend && !hasGmailReadonly
  const gmailConnected =
    accountHasFullGmailAccess(account?.scope) && hasRefreshToken && !mailboxSync?.syncError
  const gmailNeedsReconnect =
    (hasGmailSend || hasGmailReadonly) &&
    (!hasRefreshToken || Boolean(mailboxSync?.syncError) || gmailMissingReadonly)

  return {
    extensionKeyIssued,
    extensionConnected,
    extensionLastSeenAt: extensionLastSeenAt?.toISOString() ?? null,
    gmailConnected,
    gmailNeedsReconnect,
    gmailNotEnabled: !hasGmailSend && !hasGmailReadonly,
    gmailMissingReadonly,
    hasDrafted: draftCount > 0,
  }
}

export async function saveHiringProfile(formData: FormData) {
  const user = await getAuthenticatedUser()

  const role = formData.get("role") as string
  const compRange = formData.get("compRange") as string
  const stack = formData.get("stack") as string
  const location = formData.get("location") as string
  const pitchBlurb = formData.get("pitchBlurb") as string

  await prisma.hiringProfile.upsert({
    where: { userId: user.id },
    update: { role, compRange, stack, location, pitchBlurb },
    create: {
      userId: user.id,
      role, compRange, stack, location, pitchBlurb
    }
  })
}

export async function generateApiKey() {
  const user = await getAuthenticatedUser()
  return createUserApiKey(user.id)
}

function mapDraftRecord(draft: {
  id: string
  postId: string
  postUrl: string | null
  platform: string
  postText: string
  recipientName: string | null
  recipientEmail: string | null
  recipientHandle: string | null
  recipientProfileUrl: string | null
  actionMode: string
  subject: string | null
  message: string
  cacheHits: number
  createdAt: Date
  updatedAt: Date
  sentOutreach: { id: string } | null
}) {
  return {
    id: draft.id,
    postId: draft.postId,
    postUrl: resolvePostUrl(draft.postUrl, draft.postId),
    platform: draft.platform,
    postText: draft.postText,
    recipientName: draft.recipientName,
    recipientEmail: draft.recipientEmail,
    recipientHandle: draft.recipientHandle,
    recipientProfileUrl: draft.recipientProfileUrl,
    actionMode: draft.actionMode,
    subject: draft.subject,
    message: draft.message,
    cacheHits: draft.cacheHits,
    isSent: !!draft.sentOutreach,
    createdAt: draft.createdAt.toISOString(),
    updatedAt: draft.updatedAt.toISOString(),
  }
}

function mapOutreachRecord(s: {
  id: string
  postId: string
  postUrl: string | null
  platform: string
  recipientName: string | null
  recipientEmail: string | null
  recipientHandle: string | null
  recipientProfileUrl: string | null
  gmailMessageId: string | null
  subject: string | null
  message: string
  actionMode: string
  status: string
  responseReceivedAt: Date | null
  sentAt: Date
  postDraft?: { postText: string } | null
}) {
  const lifecycleState = getOutreachLifecycleState(s.sentAt, s.responseReceivedAt)

  return {
    id: s.id,
    postId: s.postId,
    postUrl: resolvePostUrl(s.postUrl, s.postId),
    platform: s.platform,
    recipientName: s.recipientName,
    recipientEmail: s.recipientEmail,
    recipientHandle: s.recipientHandle,
    recipientProfileUrl: s.recipientProfileUrl,
    gmailMessageId: s.gmailMessageId,
    subject: s.subject,
    message: s.message,
    postText: s.postDraft?.postText ?? null,
    actionMode: s.actionMode,
    status: s.status,
    lifecycleState,
    responseReceivedAt: s.responseReceivedAt?.toISOString() ?? null,
    sentAt: s.sentAt.toISOString(),
  }
}

export async function getDraftsData() {
  const user = await getAuthenticatedUser()

  const drafts = await prisma.postDraft.findMany({
    where: {
      userId: user.id,
      sentOutreach: null,
    },
    orderBy: { updatedAt: "desc" },
    take: 200,
    include: { sentOutreach: { select: { id: true } } },
  })

  return {
    drafts: drafts.map(mapDraftRecord),
  }
}

export async function getEmailsData() {
  const user = await getAuthenticatedUser()

  const emails = await prisma.sentOutreach.findMany({
    where: { userId: user.id, actionMode: "EMAIL" },
    orderBy: { sentAt: "desc" },
    take: 200,
    include: {
      postDraft: { select: { postText: true } },
      emailThread: {
        include: {
          messages: {
            orderBy: { receivedAt: "asc" },
          },
        },
      },
    },
  })

  const mapped = emails.map((s) => {
    const lifecycleState =
      s.actionMode === "EMAIL" || s.status === "SENT"
        ? getEmailLifecycleState(s.sentAt, s.responseReceivedAt)
        : null

    const messages = (s.emailThread?.messages ?? []).map((m) => ({
      id: m.id,
      direction: m.direction as "INBOUND" | "OUTBOUND",
      fromAddress: m.fromAddress,
      subject: m.subject,
      snippet: m.snippet,
      rawBody: m.rawBody,
      isRead: m.isRead,
      receivedAt: m.receivedAt.toISOString(),
    }))

    return {
      id: s.id,
      postId: s.postId,
      postUrl: resolvePostUrl(s.postUrl, s.postId),
      platform: s.platform,
      recipientName: s.recipientName,
      recipientEmail: s.recipientEmail,
      recipientHandle: s.recipientHandle,
      recipientProfileUrl: s.recipientProfileUrl,
      gmailMessageId: s.gmailMessageId,
      subject: s.subject,
      message: s.message,
      postText: s.postDraft?.postText ?? null,
      actionMode: s.actionMode,
      status: s.status,
      lifecycleState,
      responseReceivedAt: s.responseReceivedAt?.toISOString() ?? null,
      sentAt: s.sentAt.toISOString(),
      threadIsRead: s.emailThread?.isRead ?? true,
      threadMessageCount: s.emailThread?.messageCount ?? 1,
      messages,
    }
  })

  return {
    emails: mapped,
    stats: {
      sent: mapped.filter((e) => e.lifecycleState === "SENT").length,
      aged: mapped.filter((e) => e.lifecycleState === "AGED").length,
      responded: mapped.filter((e) => e.lifecycleState === "RESPONDED").length,
      unread: mapped.filter((e) => !e.threadIsRead).length,
    },
  }
}

export async function getDMsData() {
  const user = await getAuthenticatedUser()

  const dms = await prisma.sentOutreach.findMany({
    where: { userId: user.id, actionMode: "DM" },
    orderBy: { sentAt: "desc" },
    take: 200,
    include: { postDraft: { select: { postText: true } } },
  })

  return { dms: dms.map(mapOutreachRecord) }
}

export async function getPipelineData() {
  const user = await getAuthenticatedUser()

  const [drafts, outreach] = await Promise.all([
    prisma.postDraft.findMany({
      where: { userId: user.id, sentOutreach: null },
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
    prisma.sentOutreach.findMany({
      where: { userId: user.id },
      orderBy: { sentAt: "desc" },
      take: 200,
      include: {
        postDraft: { select: { postText: true } },
        conversationMeta: true,
      },
    }),
  ])

  const drafted = drafts.map((d) => ({
    id: d.id,
    type: "draft" as const,
    column: "drafted" as const,
    recipientName: d.recipientName,
    recipientEmail: d.recipientEmail,
    platform: d.platform,
    actionMode: d.actionMode,
    message: d.message,
    postUrl: resolvePostUrl(d.postUrl, d.postId),
    matchScore: null as number | null,
    toneUsed: null as string | null,
    sentAt: null as string | null,
    responseReceivedAt: null as string | null,
    followUpEligible: false,
    followUpType: null as "bump" | "close" | null,
    conversationMeta: null,
  }))

  const outreachItems = outreach.map((s) => {
    const column = getPipelineColumnForOutreach(s.sentAt, s.responseReceivedAt)
    const followUp = isFollowUpEligible(s.sentAt, s.responseReceivedAt)
    return {
      id: s.id,
      type: "outreach" as const,
      column,
      recipientName: s.recipientName,
      recipientEmail: s.recipientEmail,
      platform: s.platform,
      actionMode: s.actionMode,
      message: s.message,
      postUrl: resolvePostUrl(s.postUrl, s.postId),
      matchScore: s.matchScore,
      toneUsed: s.toneUsed,
      sentAt: s.sentAt.toISOString(),
      responseReceivedAt: s.responseReceivedAt?.toISOString() ?? null,
      followUpEligible: followUp.eligible,
      followUpType: followUp.followUpType,
      conversationMeta: s.conversationMeta
        ? {
            company: s.conversationMeta.company,
            roleTitle: s.conversationMeta.roleTitle,
            pipelineStage: s.conversationMeta.pipelineStage,
            notes: s.conversationMeta.notes,
          }
        : null,
    }
  })

  const all = [...drafted, ...outreachItems]
  const columns = {
    drafted: all.filter((i) => i.column === "drafted"),
    sent: all.filter((i) => i.column === "sent"),
    awaiting: all.filter((i) => i.column === "awaiting"),
    replied: all.filter((i) => i.column === "replied"),
  }

  return { columns, total: all.length }
}

export async function getRecentReplies() {
  const user = await getAuthenticatedUser()

  const replies = await prisma.sentOutreach.findMany({
    where: { userId: user.id, responseReceivedAt: { not: null } },
    orderBy: { responseReceivedAt: "desc" },
    take: 10,
    select: {
      id: true,
      recipientName: true,
      recipientHandle: true,
      platform: true,
      actionMode: true,
      message: true,
      responseReceivedAt: true,
      postUrl: true,
      postId: true,
    },
  })

  return replies.map((r) => ({
    id: r.id,
    recipientName: r.recipientName || r.recipientHandle || "Someone",
    platform: r.platform,
    actionMode: r.actionMode,
    excerpt: r.message.slice(0, 120),
    responseReceivedAt: r.responseReceivedAt!.toISOString(),
    postUrl: resolvePostUrl(r.postUrl, r.postId),
  }))
}

export async function markEmailResponded(outreachId: string) {
  const user = await getAuthenticatedUser()

  const outreach = await prisma.sentOutreach.findFirst({
    where: { id: outreachId, userId: user.id, actionMode: "EMAIL", responseReceivedAt: null },
  })

  const updated = await prisma.sentOutreach.updateMany({
    where: { id: outreachId, userId: user.id, actionMode: "EMAIL", responseReceivedAt: null },
    data: { responseReceivedAt: new Date(), responseSource: "MANUAL" },
  })

  if (updated.count > 0) {
    const { incrementReplyStats } = await import("@/lib/user-stats")
    const { recordActivity } = await import("@/lib/engagement")
    await incrementReplyStats(user.id)
    if (outreach) {
      await recordActivity(user.id, "reply", {
        outreachId,
        recipientName: outreach.recipientName,
        messageExcerpt: outreach.message.slice(0, 200),
        actionMode: "EMAIL",
      })
    }
  }
}

export async function markDMResponded(outreachId: string) {
  const user = await getAuthenticatedUser()

  const outreach = await prisma.sentOutreach.findFirst({
    where: { id: outreachId, userId: user.id, actionMode: "DM", responseReceivedAt: null },
  })

  const updated = await prisma.sentOutreach.updateMany({
    where: { id: outreachId, userId: user.id, actionMode: "DM", responseReceivedAt: null },
    data: { responseReceivedAt: new Date(), responseSource: "MANUAL" },
  })

  if (updated.count > 0) {
    const { incrementReplyStats } = await import("@/lib/user-stats")
    const { recordActivity } = await import("@/lib/engagement")
    await incrementReplyStats(user.id)
    if (outreach) {
      await recordActivity(user.id, "reply", {
        outreachId,
        recipientName: outreach.recipientName,
        messageExcerpt: outreach.message.slice(0, 200),
        actionMode: "DM",
      })
    }
  }
}

export async function markThreadRead(outreachId: string) {
  const user = await getAuthenticatedUser()

  const outreach = await prisma.sentOutreach.findFirst({
    where: { id: outreachId, userId: user.id },
    select: { emailThread: { select: { id: true } } },
  })

  if (outreach?.emailThread?.id) {
    await prisma.emailThread.update({
      where: { id: outreach.emailThread.id },
      data: { isRead: true },
    })
    await prisma.emailMessage.updateMany({
      where: { threadId: outreach.emailThread.id, isRead: false },
      data: { isRead: true },
    })
  }
}

export async function syncMailbox() {
  const user = await getAuthenticatedUser()

  const { processInboundForUser } = await import("@/lib/email-sync/inbound-processor")
  const result = await processInboundForUser(user.id)

  if (!result.ok) {
    throw new Error(formatGmailAuthError(result.error ?? "Sync failed"))
  }

  return { ok: true, newMessages: result.newMessages }
}

export async function getAnalyticsData() {
  const user = await getAuthenticatedUser()
  const { getUserReplyMetrics } = await import("@/lib/reply-metrics")

  const [totalDrafts, sentOutreach, cacheAggregate, draftsThisWeek, sentThisWeek, replyMetrics] =
    await Promise.all([
    prisma.postDraft.count({ where: { userId: user.id } }),
    prisma.sentOutreach.findMany({
      where: { userId: user.id },
      orderBy: { sentAt: "desc" },
      take: 100,
      include: { postDraft: true },
    }),
    prisma.postDraft.aggregate({
      where: { userId: user.id },
      _sum: { cacheHits: true },
    }),
    prisma.postDraft.count({
      where: {
        userId: user.id,
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    }),
    prisma.sentOutreach.count({
      where: {
        userId: user.id,
        sentAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    }),
    getUserReplyMetrics(user.id),
  ])

  const emailsSent = sentOutreach.filter((s) => s.status === "SENT").length
  const dmsCopied = sentOutreach.filter((s) => s.status === "COPIED").length
  const cacheHits = cacheAggregate._sum.cacheHits ?? 0
  const tokensSavedEstimate = cacheHits * 1200

  const platformBreakdown = sentOutreach.reduce<Record<string, number>>((acc, item) => {
    acc[item.platform] = (acc[item.platform] || 0) + 1
    return acc
  }, {})

  return {
    totalDrafts,
    draftsThisWeek,
    sentThisWeek,
    emailsSent,
    dmsCopied,
    totalOutreach: sentOutreach.length,
    cacheHits,
    tokensSavedEstimate,
    platformBreakdown,
    replyRate: replyMetrics.replyRate,
    replyRate7d: replyMetrics.replyRate7d,
    totalReplied: replyMetrics.totalReplied,
    repliedThisWeek: replyMetrics.repliedThisWeek,
    toneInsights: replyMetrics.toneInsights,
    sentOutreach: sentOutreach.map((s) => mapOutreachRecord(s)),
  }
}

export async function getWinningTemplates(industryTag?: string | null) {
  const user = await getAuthenticatedUser()

  const templates = await prisma.winningTemplate.findMany({
    where: {
      isPublished: true,
      OR: [{ userId: user.id }, { userId: null }],
      ...(industryTag ? { industryTag } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  })

  return templates.map((t) => ({
    id: t.id,
    industryTag: t.industryTag,
    toneUsed: t.toneUsed,
    excerpt: t.excerpt,
    matchScore: t.matchScore,
  }))
}

export async function getUserWinningTemplates() {
  const user = await getAuthenticatedUser()

  const templates = await prisma.winningTemplate.findMany({
    where: { userId: user.id, isPublished: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  })

  return templates.map((t) => ({
    id: t.id,
    industryTag: t.industryTag,
    toneUsed: t.toneUsed,
    excerpt: t.excerpt,
    matchScore: t.matchScore,
    createdAt: t.createdAt.toISOString(),
  }))
}

export async function syncWinningTemplatesFromReplies() {
  const user = await getAuthenticatedUser()

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
  }

  return { synced: winners.length }
}

export const getDashboardData = cache(async function getDashboardData() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return null

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      candidateProfile: true,
      apiKeys: true,
    },
  })

  if (!user) return null

  return {
    candidateProfile: user.candidateProfile
      ? toCandidateProfileData(user.candidateProfile)
      : null,
    apiKey: user.apiKeys[0]?.keyPrefix ? `${user.apiKeys[0].keyPrefix}••••••••` : null,
    apiKeyIssued: user.apiKeys.length > 0,
    onboardingComplete: user.candidateProfile?.onboardingComplete ?? false,
  }
})

export async function getDashboardNavCounts() {
  const user = await getAuthenticatedUser()

  const [drafts, emails, dms] = await Promise.all([
    prisma.postDraft.count({
      where: { userId: user.id, sentOutreach: null },
    }),
    prisma.sentOutreach.count({
      where: { userId: user.id, actionMode: "EMAIL" },
    }),
    prisma.sentOutreach.count({
      where: { userId: user.id, actionMode: "DM" },
    }),
  ])

  return { drafts, emails, dms }
}

export async function getOnboardingData() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return null

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { candidateProfile: true },
  })

  if (!user) return null

  return {
    email: user.email,
    name: user.name,
    profile: user.candidateProfile
      ? toCandidateProfileData(user.candidateProfile)
      : null,
    onboardingComplete: user.candidateProfile?.onboardingComplete ?? false,
  }
}

export async function connectExtension(state: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !session.user.email) {
    throw new Error("You must sign in to connect the extension")
  }

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(state)) {
    throw new Error("Invalid connection state")
  }

  const profile = await prisma.candidateProfile.findUnique({
    where: { userId: session.user.id },
  })

  if (!profile?.onboardingComplete) {
    throw new Error("Complete your profile onboarding before connecting the extension")
  }

  const apiKey = await createUserApiKey(session.user.id)

  return {
    state,
    apiKey,
    email: session.user.email,
    name: session.user.name ?? null,
  }
}
