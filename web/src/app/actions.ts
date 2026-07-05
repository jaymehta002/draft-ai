"use server"

import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { ensureUserApiKey } from "@/lib/api-key"
import { randomBytes } from "crypto"
import {
  formatOnboardingValidationError,
  getOnboardingValidationIssues,
  isOnboardingComplete,
  parseCandidateFormData,
  migrateLegacyToStructured,
  syncLegacyFields,
  type CandidateProfileData,
} from "@/lib/candidate-profile"
import { getEmailLifecycleState } from "@/lib/outreach-state"
import { resolvePostUrl } from "@/lib/post-url"
import { utapi } from "@/lib/uploadthing-server"

async function getAuthenticatedUser() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) throw new Error("Unauthorized")

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) throw new Error("User not found")

  return user
}

function toCandidateProfileData(profile: {
  fullName: string | null
  phone: string | null
  location: string | null
  linkedinUrl: string | null
  portfolioUrl: string | null
  githubUrl: string | null
  currentTitle: string | null
  yearsExperience: number | null
  summary: string | null
  workExperience: string | null
  workExperiences?: unknown
  projects?: unknown
  certificates?: unknown
  education: string | null
  skills: string | null
  certifications: string | null
  resumeFileName: string | null
  resumeMimeType: string | null
  resumeStorageKey: string | null
  resumeFileUrl: string | null
  resumeFileSize: number | null
  resumeFileData: Uint8Array | null
  resumeContent: string | null
  desiredRoles: string | null
  salaryExpectation: string | null
  workPreference: string | null
  availability: string | null
}): CandidateProfileData {
  const structured = migrateLegacyToStructured(profile)
  const base: CandidateProfileData = {
    fullName: profile.fullName ?? "",
    phone: profile.phone ?? "",
    location: profile.location ?? "",
    linkedinUrl: profile.linkedinUrl ?? "",
    portfolioUrl: profile.portfolioUrl ?? "",
    githubUrl: profile.githubUrl ?? "",
    currentTitle: profile.currentTitle ?? "",
    yearsExperience: profile.yearsExperience?.toString() ?? "",
    summary: profile.summary ?? "",
    workExperience: profile.workExperience ?? "",
    workExperiences: structured.workExperiences,
    projects: structured.projects,
    certificates: structured.certificates,
    education: profile.education ?? "",
    skills: profile.skills ?? "",
    certifications: profile.certifications ?? "",
    resumeFileName: profile.resumeFileName ?? "",
    resumeMimeType: profile.resumeMimeType ?? "",
    resumeStorageKey: profile.resumeStorageKey ?? "",
    resumeFileUrl: profile.resumeFileUrl ?? "",
    resumeFileSize: profile.resumeFileSize?.toString() ?? "",
    resumeFileData: profile.resumeFileData ? Buffer.from(profile.resumeFileData).toString("base64") : "",
    resumeContent: profile.resumeContent ?? "",
    desiredRoles: profile.desiredRoles ?? "",
    salaryExpectation: profile.salaryExpectation ?? "",
    workPreference: profile.workPreference ?? "",
    availability: profile.availability ?? "",
  }
  return syncLegacyFields(base)
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

  const key = "rp_" + randomBytes(32).toString("hex")

  await prisma.apiKey.deleteMany({ where: { userId: user.id } })

  await prisma.apiKey.create({
    data: {
      key,
      userId: user.id
    }
  })

  return key
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
  const lifecycleState =
    s.actionMode === "EMAIL" || s.status === "SENT"
      ? getEmailLifecycleState(s.sentAt, s.responseReceivedAt)
      : null

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

export async function markEmailResponded(outreachId: string) {
  const user = await getAuthenticatedUser()

  await prisma.sentOutreach.updateMany({
    where: { id: outreachId, userId: user.id, actionMode: "EMAIL" },
    data: { responseReceivedAt: new Date() },
  })
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
    throw new Error(result.error ?? "Sync failed")
  }

  return { ok: true, newMessages: result.newMessages }
}

export async function getAnalyticsData() {
  const user = await getAuthenticatedUser()

  const [totalDrafts, sentOutreach, cacheAggregate, draftsThisWeek] = await Promise.all([
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
    emailsSent,
    dmsCopied,
    totalOutreach: sentOutreach.length,
    cacheHits,
    tokensSavedEstimate,
    platformBreakdown,
    sentOutreach: sentOutreach.map((s) => mapOutreachRecord(s)),
  }
}

export async function getDashboardData() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return null

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      candidateProfile: true,
      hiringProfile: true,
      apiKeys: true
    }
  })

  if (!user) return null

  return {
    candidateProfile: user.candidateProfile
      ? toCandidateProfileData(user.candidateProfile)
      : null,
    hiringProfile: user.hiringProfile,
    apiKey: user.apiKeys[0]?.key || null,
    onboardingComplete: user.candidateProfile?.onboardingComplete ?? false,
  }
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

  const apiKey = await ensureUserApiKey(session.user.id)

  return {
    state,
    apiKey,
    email: session.user.email,
    name: session.user.name ?? null,
  }
}
