"use client"

import { useSession } from "next-auth/react"
import { useCallback, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { signIn } from "next-auth/react"
import {
  Copy,
  Mail,
  Sparkles,
  TrendingUp,
  ExternalLink,
  ArrowUpRight,
  Check,
  AlertCircle,
  Wifi,
  WifiOff,
  Globe,
  XIcon,
  Link2,
  RefreshCw,
  KeyRound,
  ShieldCheck,
  User,
  Sliders,
} from "lucide-react"
import {
  saveCandidateProfile,
  generateApiKey,
  getDashboardData,
  getAnalyticsData,
  getDraftsData,
  getEmailsData,
  getDMsData,
  getIntegrationStatus,
  markDMResponded,
  getWinningTemplates,
} from "@/app/actions"
import type { CandidateProfileData } from "@/lib/candidate-profile"
import {
  migrateLegacyToStructured,
  syncLegacyFields,
  profileToFormData,
} from "@/lib/candidate-profile"
import { AppSidebar, MobileMenuButton, type DashboardSection } from "@/components/app-sidebar"
import { AccountMenu } from "@/components/account-menu"
import { ProfileCard } from "@/components/profile-card"
import { ProfileEditor } from "@/components/profile/profile-editor"
import { DraftsPanel } from "@/components/panels/drafts-panel"
import { EmailsPanel } from "@/components/panels/emails-panel"
import { DMsPanel } from "@/components/panels/dms-panel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FadeIn } from "@/components/motion"
import { PreferencesSection } from "@/components/dashboard/preferences-section"
import { cn } from "@/lib/utils"

type DashboardData = NonNullable<Awaited<ReturnType<typeof getDashboardData>>>
type CandidateProfile = DashboardData["candidateProfile"]
type AnalyticsData = Awaited<ReturnType<typeof getAnalyticsData>>
type DraftsData = Awaited<ReturnType<typeof getDraftsData>>
type EmailsData = Awaited<ReturnType<typeof getEmailsData>>
type DMsData = Awaited<ReturnType<typeof getDMsData>>

function rawToProfileData(profile: NonNullable<CandidateProfile>): CandidateProfileData {
  const structured = migrateLegacyToStructured(profile)
  return syncLegacyFields({
    ...profile,
    workExperiences: structured.workExperiences,
    projects: structured.projects,
    certificates: structured.certificates,
  })
}

const SECTION_LABELS: Record<DashboardSection, string> = {
  analytics: "Overview",
  drafts: "Outreach Studio",
  emails: "Inbox",
  dms: "Messages",
  profile: "Account",
  extension: "Integrations",
}

const VALID_SECTIONS: DashboardSection[] = [
  "analytics", "drafts", "emails", "dms", "profile", "extension",
]

function parseSection(value: string | null): DashboardSection {
  if (value && VALID_SECTIONS.includes(value as DashboardSection)) {
    return value as DashboardSection
  }
  return "analytics"
}

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [section, setSection] = useState<DashboardSection>(() =>
    parseSection(searchParams.get("section"))
  )
  const [profileTab, setProfileTab] = useState(() => searchParams.get("tab") || "profile")
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [candidateProfile, setCandidateProfile] = useState<CandidateProfile>(null)
  const [profileData, setProfileData] = useState<CandidateProfileData | null>(null)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [apiKeyCopied, setApiKeyCopied] = useState(false)
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [draftsData, setDraftsData] = useState<DraftsData | null>(null)
  const [emailsData, setEmailsData] = useState<EmailsData | null>(null)
  const [dmsData, setDMsData] = useState<DMsData | null>(null)
  const [integrationStatus, setIntegrationStatus] = useState<Awaited<ReturnType<typeof getIntegrationStatus>> | null>(null)
  const [winningTemplates, setWinningTemplates] = useState<Awaited<ReturnType<typeof getWinningTemplates>>>([])
  const [showAdvancedConnection, setShowAdvancedConnection] = useState(false)
  const [loading, setLoading] = useState(true)

  const navigateSection = useCallback(
    (next: DashboardSection, tab?: string) => {
      setSection(next)
      if (tab) setProfileTab(tab)
      const params = new URLSearchParams()
      if (next !== "analytics") params.set("section", next)
      if (tab && next === "profile") params.set("tab", tab)
      const qs = params.toString()
      router.replace(qs ? `/dashboard?${qs}` : "/dashboard", { scroll: false })
    },
    [router]
  )

  useEffect(() => {
    const urlSection = parseSection(searchParams.get("section"))
    const urlTab = searchParams.get("tab") || "profile"
    setSection(urlSection)
    if (urlSection === "profile") setProfileTab(urlTab)
  }, [searchParams])

  const loadData = useCallback(async () => {
    const [data, stats, drafts, emails, dms, integrations, templates] = await Promise.all([
      getDashboardData(),
      getAnalyticsData(),
      getDraftsData(),
      getEmailsData(),
      getDMsData(),
      getIntegrationStatus(),
      getWinningTemplates(),
    ])

    if (!data?.onboardingComplete) {
      router.replace("/onboarding")
      return
    }

    if (data) {
      setCandidateProfile(data.candidateProfile)
      if (data.candidateProfile) {
        setProfileData(rawToProfileData(data.candidateProfile))
      }
      setApiKey(data.apiKey)
    }
    setAnalytics(stats)
    setDraftsData(drafts)
    setEmailsData(emails)
    setDMsData(dms)
    setIntegrationStatus(integrations)
    setWinningTemplates(templates)
    setLoading(false)
  }, [router])

  useEffect(() => {
    if (status === "authenticated") {
      loadData()
    } else if (status === "unauthenticated") {
      router.replace("/")
    }
  }, [status, loadData, router])

  const handleSaveProfile = async () => {
    if (!profileData) return
    setProfileSaving(true)
    setProfileError(null)
    try {
      await saveCandidateProfile(profileToFormData(syncLegacyFields(profileData)), true)
      setCandidateProfile((prev) =>
        prev
          ? {
            ...prev,
            fullName: profileData.fullName,
            currentTitle: profileData.currentTitle,
          }
          : prev
      )
    } catch (error) {
      setProfileError(
        error instanceof Error ? error.message : "Failed to save profile"
      )
    } finally {
      setProfileSaving(false)
    }
  }

  const handleProfileChange = (nextProfile: CandidateProfileData) => {
    setProfileError(null)
    setProfileData(nextProfile)
  }

  const handleGenerateKey = async () => {
    const key = await generateApiKey()
    setApiKey(key)
  }

  const handleCopyApiKey = async () => {
    if (!apiKey) return
    await navigator.clipboard.writeText(apiKey)
    setApiKeyCopied(true)
    setTimeout(() => setApiKeyCopied(false), 2000)
  }

  const refreshEmails = async () => {
    const [emails, drafts, stats] = await Promise.all([
      getEmailsData(),
      getDraftsData(),
      getAnalyticsData(),
    ])
    setEmailsData(emails)
    setDraftsData(drafts)
    setAnalytics(stats)
  }

  const refreshDMs = async () => {
    const [dms, stats] = await Promise.all([getDMsData(), getAnalyticsData()])
    setDMsData(dms)
    setAnalytics(stats)
  }

  const handleMarkDMReplied = async (outreachId: string) => {
    await markDMResponded(outreachId)
    await refreshDMs()
  }

  if (loading) {
    return (
      <div className="flex min-h-screen bg-background">
        <Skeleton className="hidden h-screen w-[224px] lg:block shrink-0" />
        <div className="flex-1 flex flex-col min-w-0 p-6 gap-6">
          <Skeleton className="h-14 w-full rounded-xl" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  const profile = profileData
  const draftCount = draftsData?.drafts.length ?? 0
  const emailCount = emailsData?.emails.length ?? 0
  const dmCount = dmsData?.dms.length ?? 0

  return (
    <div className="min-h-screen bg-background flex">
      <AppSidebar
        active={section}
        onNavigate={navigateSection}
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
        counts={{
          drafts: draftCount,
          emails: emailCount,
          dms: dmCount,
        }}
        user={{
          name: candidateProfile?.fullName || session?.user?.name,
          email: session?.user?.email,
          image: session?.user?.image,
          title: candidateProfile?.currentTitle,
        }}
        loading={false}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-40 border-b border-border bg-card/95 shadow-sm backdrop-blur-sm">
          <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <MobileMenuButton onClick={() => setMobileNavOpen(true)} />
              <h1 className="text-sm font-semibold tracking-tight text-foreground">
                {SECTION_LABELS[section]}
              </h1>
            </div>
            <AccountMenu
              name={candidateProfile?.fullName || session?.user?.name}
              email={session?.user?.email}
              image={session?.user?.image}
              title={candidateProfile?.currentTitle}
              onNavigate={(s) => {
                if (s === "profile:preferences") navigateSection("profile", "preferences")
                else if (s === "profile") navigateSection("profile", "profile")
                else if (s === "extension") navigateSection("extension")
                else navigateSection(s as DashboardSection)
              }}
            />
          </div>
        </header>

        <main className="flex-1 overflow-auto bg-background">

          {/* ── A. OVERVIEW ─────────────────────────────────────── */}
          {section === "analytics" && analytics && (
            <FadeIn className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
              {/* Page header */}
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-foreground">Overview</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Your outreach performance at a glance
                  </p>
                </div>
                <Button onClick={() => navigateSection("drafts")} className="gap-2">
                  <Sparkles className="size-4" />
                  Open Studio
                </Button>
              </div>

              {/* Weekly wins */}
              {(analytics.sentThisWeek ?? 0) > 0 && (
                <Card className="border-primary/20 bg-primary/5 shadow-sm">
                  <CardContent className="py-4">
                    <p className="text-sm text-foreground">
                      You sent{" "}
                      <span className="font-semibold text-primary">{analytics.sentThisWeek}</span>{" "}
                      thoughtful message{analytics.sentThisWeek !== 1 ? "s" : ""} this week. Keep going.
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* North star + activity stats */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  icon={TrendingUp}
                  label="Reply rate"
                  value={`${analytics.replyRate ?? 0}%`}
                  sub={`${analytics.replyRate7d ?? 0}% last 7 days · ${analytics.totalReplied ?? 0} replied`}
                  color="primary"
                />
                <StatCard
                  icon={Sparkles}
                  label="Pending drafts"
                  value={draftCount}
                  color="primary"
                  onClick={() => navigateSection("drafts")}
                />
                <StatCard
                  icon={Mail}
                  label="Emails sent"
                  value={analytics.emailsSent}
                  color="chart-2"
                  onClick={() => navigateSection("emails")}
                />
                <StatCard
                  icon={Copy}
                  label="DMs copied"
                  value={analytics.dmsCopied}
                  color="chart-1"
                  onClick={() => navigateSection("dms")}
                />
              </div>

              {/* Tone insights */}
              {(analytics.toneInsights?.length ?? 0) > 0 && (
                <Card className="border-border shadow-sm">
                  <CardHeader className="pb-2">
                    <CardDescription className="text-[10px] font-semibold uppercase tracking-widest flex items-center gap-2">
                      <TrendingUp className="size-3" /> What&apos;s working
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {analytics.toneInsights.map((insight) => (
                      <p key={insight.tone} className="text-sm text-muted-foreground">
                        {insight.message}
                      </p>
                    ))}
                  </CardContent>
                </Card>
              )}

              {winningTemplates.length > 0 && (
                <Card className="border-border shadow-sm">
                  <CardHeader className="pb-2">
                    <CardDescription className="text-[10px] font-semibold uppercase tracking-widest">
                      Messages that got replies
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {winningTemplates.map((t) => (
                      <blockquote
                        key={t.id}
                        className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground italic"
                      >
                        &ldquo;{t.excerpt}&rdquo;
                        {t.toneUsed && (
                          <span className="mt-1 block not-italic text-[10px] text-foreground/70">
                            {t.toneUsed} tone{t.matchScore ? ` · ${t.matchScore}% match` : ""}
                          </span>
                        )}
                      </blockquote>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Activity grid */}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                {/* This week */}
                <Card className="border-border shadow-sm hover:shadow-md transition-shadow duration-200">
                  <CardHeader className="pb-2">
                    <CardDescription className="text-[10px] font-semibold uppercase tracking-widest">
                      This week
                    </CardDescription>
                    <div className="flex items-end gap-2">
                      <CardTitle className="text-5xl font-bold tracking-tight tabular-nums text-foreground">
                        {analytics.draftsThisWeek}
                      </CardTitle>
                      <div className="mb-1.5 flex items-center gap-1 text-chart-2 text-xs font-semibold">
                        <ArrowUpRight className="size-3.5" />
                        new
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">drafts generated</p>
                    <div className="mt-3">
                      <Progress
                        value={Math.min((analytics.draftsThisWeek / Math.max(analytics.emailsSent, 1)) * 100, 100)}
                        className="h-1.5"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Email pipeline */}
                <Card className="border-border shadow-sm hover:shadow-md transition-shadow duration-200">
                  <CardHeader className="pb-2">
                    <CardDescription className="text-[10px] font-semibold uppercase tracking-widest">
                      Email pipeline
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      { label: "Active", value: emailsData?.stats.sent ?? 0, color: "bg-chart-2" },
                      { label: "Aged", value: emailsData?.stats.aged ?? 0, color: "bg-chart-4" },
                      { label: "Responded", value: emailsData?.stats.responded ?? 0, color: "bg-primary" },
                    ].map(({ label, value, color }) => {
                      const total = (emailsData?.stats.sent ?? 0) + (emailsData?.stats.aged ?? 0) + (emailsData?.stats.responded ?? 0)
                      const pct = total > 0 ? (value / total) * 100 : 0
                      return (
                        <div key={label} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">{label}</span>
                            <span className="font-semibold tabular-nums text-foreground">{value}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className={cn("h-full rounded-full transition-all duration-500", color)}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </CardContent>
                </Card>

                {/* By platform */}
                <Card className="border-border shadow-sm hover:shadow-md transition-shadow duration-200">
                  <CardHeader className="pb-2">
                    <CardDescription className="text-[10px] font-semibold uppercase tracking-widest flex items-center gap-2">
                      <TrendingUp className="size-3" /> By platform
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {Object.entries(analytics.platformBreakdown).length === 0 ? (
                      <p className="text-xs text-muted-foreground py-4 text-center">
                        No messages yet — your first thoughtful note is one draft away.
                      </p>
                    ) : (
                      Object.entries(analytics.platformBreakdown).map(([platform, count]) => {
                        const total = Object.values(analytics.platformBreakdown).reduce((a, b) => a + b, 0)
                        const pct = total > 0 ? (count / total) * 100 : 0
                        return (
                          <div key={platform} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground font-medium">{platform}</span>
                              <span className="font-semibold tabular-nums text-foreground">{count}</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full bg-primary transition-all duration-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        )
                      })
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Quick actions */}
              <Card className="border-border shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">Quick actions</CardTitle>
                  <CardDescription>
                    {draftCount} pending draft{draftCount !== 1 ? "s" : ""} · {analytics.emailsSent} emails · {analytics.dmsCopied} DMs
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => navigateSection("drafts")} className="gap-2">
                      <Sparkles className="size-3.5" />
                      Outreach Studio
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => navigateSection("emails")} className="gap-2">
                      <Mail className="size-3.5" />
                      View inbox
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => navigateSection("dms")} className="gap-2">
                      <Copy className="size-3.5" />
                      View DMs
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => navigateSection("extension")} className="gap-2">
                      <ExternalLink className="size-3.5" />
                      Integrations
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </FadeIn>
          )}

          {/* ── B. OUTREACH STUDIO ──────────────────────────────── */}
          {section === "drafts" && draftsData && (
            <FadeIn className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
              <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-foreground">Outreach Studio</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Review and copy your AI-generated outreach drafts
                  </p>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {draftCount} pending
                </Badge>
              </div>
              <DraftsPanel drafts={draftsData.drafts} />
            </FadeIn>
          )}

          {/* ── C. INBOX ────────────────────────────────────────── */}
          {section === "emails" && emailsData && (
            <FadeIn className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
              <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-foreground">Inbox</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Manage your email outreach pipeline
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={refreshEmails} className="gap-2">
                  <RefreshCw className="size-3.5" />
                  Refresh
                </Button>
              </div>
              <EmailsPanel
                emails={emailsData.emails}
                onRefresh={refreshEmails}
                gmailMissingReadonly={integrationStatus?.gmailMissingReadonly}
                linkHints={{
                  email: session?.user?.email ?? null,
                  linkedinUrl: profile?.linkedinUrl || null,
                  githubUrl: profile?.githubUrl || null,
                  portfolioUrl: profile?.portfolioUrl || null,
                }}
              />
            </FadeIn>
          )}

          {/* ── D. MESSAGES ─────────────────────────────────────── */}
          {section === "dms" && dmsData && (
            <FadeIn className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
              <div className="mb-5">
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">Messages</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your direct message outreach history
                </p>
              </div>
              <DMsPanel dms={dmsData.dms} onMarkReplied={handleMarkDMReplied} />
            </FadeIn>
          )}

          {/* ── E. ACCOUNT ──────────────────────────────────────── */}
          {section === "profile" && profile && (
            <FadeIn className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
              <div className="mb-6">
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">Account</h2>
                <p className="mt-1 text-sm text-muted-foreground">Manage your profile and preferences</p>
              </div>

              <Tabs value={profileTab} onValueChange={(v) => navigateSection("profile", v)}>
                <TabsList className="mb-6">
                  <TabsTrigger value="profile" className="gap-2">
                    <User className="size-3.5" />
                    Profile
                  </TabsTrigger>
                  <TabsTrigger value="preferences" className="gap-2">
                    <Sliders className="size-3.5" />
                    Preferences
                  </TabsTrigger>
                  <TabsTrigger value="security" className="gap-2">
                    <ShieldCheck className="size-3.5" />
                    Security
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="profile">
                  <div className="space-y-6">
                    <ProfileCard
                      name={profile.fullName || session?.user?.name || "Draft AI user"}
                      title={profile.currentTitle || "Candidate profile"}
                      avatarUrl={session?.user?.image}
                      bio={profile.summary || "Add a short summary so your outreach drafts have stronger context."}
                      stats={[
                        { label: "Years", value: profile.yearsExperience || "0" },
                        {
                          label: "Skills",
                          value: profile.skills
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean).length,
                        },
                        { label: "Projects", value: profile.projects.length },
                        { label: "Certificates", value: profile.certificates.length },
                      ]}
                      actions={[
                        ...(profile.linkedinUrl ? [{ label: "LinkedIn", href: profile.linkedinUrl, variant: "outline" as const }] : []),
                        ...(profile.portfolioUrl ? [{ label: "Portfolio", href: profile.portfolioUrl, variant: "secondary" as const }] : []),
                      ]}
                    />
                    <ProfileEditor
                      profile={profile}
                      onChange={handleProfileChange}
                      onSave={handleSaveProfile}
                      saving={profileSaving}
                      error={profileError}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="preferences">
                  <PreferencesSection
                    outreachTone={profile.outreachTone}
                    draftLength={profile.draftLength}
                    outreachLanguage={profile.outreachLanguage}
                  />
                </TabsContent>

                <TabsContent value="security">
                  <Card className="border-border shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-base">Security</CardTitle>
                      <CardDescription>
                        Your account is secured via Google OAuth. No password is stored.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-4">
                        <div className="flex size-9 items-center justify-center rounded-lg bg-chart-2/10 text-chart-2">
                          <ShieldCheck className="size-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">Google OAuth active</p>
                          <p className="text-xs text-muted-foreground">{session?.user?.email}</p>
                        </div>
                        <Badge variant="success" className="ml-auto">Secured</Badge>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </FadeIn>
          )}

          {/* ── F. INTEGRATIONS ─────────────────────────────────── */}
          {section === "extension" && (
            <FadeIn className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
              <div className="mb-6">
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">Integrations</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Connect your tools and platforms to supercharge your outreach
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Chrome Extension */}
                <IntegrationCard
                  icon={<Globe className="size-5" />}
                  name="Chrome Extension"
                  description="Generate personalized drafts directly from X and LinkedIn feed posts."
                  status={apiKey ? "connected" : "disconnected"}
                  statusLabel={apiKey ? "Connection code ready" : "Not connected"}
                  action={
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowAdvancedConnection((v) => !v)}
                    >
                      {showAdvancedConnection ? "Hide details" : "Connection details"}
                    </Button>
                  }
                  extra={
                    apiKey ? (
                      <div className="mt-3 space-y-2">
                        <p className="text-xs text-muted-foreground">
                          Open the extension popup and tap Connect — no manual code needed for most users.
                        </p>
                        {showAdvancedConnection && (
                          <>
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                              Connection code (advanced)
                            </p>
                            <div className="flex gap-2">
                              <Input
                                readOnly
                                value={apiKey}
                                className="font-mono text-[11px] h-8 bg-muted/30 border-border/60"
                              />
                              <Button
                                variant="outline"
                                size="icon"
                                className={cn(
                                  "size-8 shrink-0 transition-[border-color,background-color] duration-200",
                                  apiKeyCopied && "border-transparent bg-primary/10 text-primary"
                                )}
                                onClick={handleCopyApiKey}
                              >
                                {apiKeyCopied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                              </Button>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-muted-foreground"
                              onClick={handleGenerateKey}
                            >
                              <KeyRound className="size-3 mr-1.5" />
                              Regenerate connection code
                            </Button>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="mt-3">
                        <p className="text-xs text-muted-foreground">
                          Install the extension, then use Connect in the popup to link your account.
                        </p>
                      </div>
                    )
                  }
                />

                {/* Gmail */}
                <IntegrationCard
                  icon={<Mail className="size-5" />}
                  name="Gmail"
                  description={
                    integrationStatus?.gmailMissingReadonly
                      ? "Reply tracking needs inbox read access. Reconnect to enable sync."
                      : "Send thoughtful emails through your own Gmail — you approve every message."
                  }
                  status={
                    integrationStatus?.gmailConnected
                      ? "connected"
                      : integrationStatus?.gmailNeedsReconnect ||
                          integrationStatus?.gmailMissingReadonly
                        ? "error"
                        : "disconnected"
                  }
                  statusLabel={
                    integrationStatus?.gmailConnected
                      ? "Connected"
                      : integrationStatus?.gmailMissingReadonly
                        ? "Needs inbox access"
                        : integrationStatus?.gmailNeedsReconnect
                          ? "Needs reconnect"
                          : "Not enabled"
                  }
                  action={
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        signIn("google", {
                          callbackUrl: integrationStatus?.gmailMissingReadonly
                            ? "/dashboard?section=emails"
                            : "/dashboard?section=extension",
                        })
                      }
                    >
                      {integrationStatus?.gmailMissingReadonly ? "Reconnect" : "Manage"}
                    </Button>
                  }
                />

                <IntegrationCard
                  icon={<Link2 className="size-5" />}
                  name="LinkedIn"
                  description="Draft messages for LinkedIn feed posts via the Chrome extension."
                  status={apiKey ? "connected" : "disconnected"}
                  statusLabel={apiKey ? "Via extension" : "Connect extension first"}
                />

                <IntegrationCard
                  icon={<XIcon className="size-5" />}
                  name="X (Twitter)"
                  description="Draft messages for X feed posts via the Chrome extension."
                  status={apiKey ? "connected" : "disconnected"}
                  statusLabel={apiKey ? "Via extension" : "Connect extension first"}
                />
              </div>
            </FadeIn>
          )}
        </main>
      </div>
    </div>
  )
}

// ── Shared sub-components ────────────────────────────────────────────────────

type StatColor = "primary" | "chart-1" | "chart-2" | "chart-3" | "chart-4" | "chart-5"

const COLOR_CLASSES: Record<StatColor, { bg: string; text: string; iconBg: string }> = {
  primary: { bg: "group-hover:text-primary", text: "text-primary", iconBg: "bg-primary/10" },
  "chart-1": { bg: "group-hover:text-chart-1", text: "text-chart-1", iconBg: "bg-chart-1/10" },
  "chart-2": { bg: "group-hover:text-chart-2", text: "text-chart-2", iconBg: "bg-chart-2/10" },
  "chart-3": { bg: "group-hover:text-chart-3", text: "text-chart-3", iconBg: "bg-chart-3/10" },
  "chart-4": { bg: "group-hover:text-chart-4", text: "text-chart-4", iconBg: "bg-chart-4/10" },
  "chart-5": { bg: "group-hover:text-chart-5", text: "text-chart-5", iconBg: "bg-chart-5/10" },
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color = "primary",
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number | string
  sub?: string
  color?: StatColor
  onClick?: () => void
}) {
  const colors = COLOR_CLASSES[color]
  return (
    <Card
      className={cn(
        "group border-border shadow-sm transition-[box-shadow,transform] duration-200 hover:shadow-md",
        onClick && "cursor-pointer select-none"
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-3 pt-6">
        <div className="flex items-center justify-between mb-3">
          <CardDescription className="text-[10px] font-semibold uppercase tracking-widest">
            {label}
          </CardDescription>
          <div className={cn("flex size-9 items-center justify-center rounded-lg transition-colors", colors.iconBg)}>
            <Icon className={cn("size-4", colors.text)} />
          </div>
        </div>
        <CardTitle
          className={cn(
            "text-4xl font-bold tracking-tight tabular-nums transition-colors duration-200",
            colors.bg
          )}
        >
          {value}
        </CardTitle>
      </CardHeader>
      {sub && (
        <CardContent className="pb-6">
          <p className="text-xs text-muted-foreground">{sub}</p>
        </CardContent>
      )}
    </Card>
  )
}

function IntegrationCard({
  icon,
  name,
  description,
  status,
  statusLabel,
  action,
  extra,
}: {
  icon: React.ReactNode
  name: string
  description: string
  status: "connected" | "disconnected" | "error"
  statusLabel: string
  action?: React.ReactNode
  extra?: React.ReactNode
}) {
  const statusConfig = {
    connected: {
      icon: <Wifi className="size-3" />,
      class: "text-chart-2",
      badgeVariant: "success" as const,
    },
    disconnected: {
      icon: <WifiOff className="size-3" />,
      class: "text-muted-foreground",
      badgeVariant: "outline" as const,
    },
    error: {
      icon: <AlertCircle className="size-3" />,
      class: "text-destructive",
      badgeVariant: "outline" as const,
    },
  }[status]

  return (
    <Card className="border-border shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/50 text-foreground">
              {icon}
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">{name}</CardTitle>
              <div className={cn("mt-0.5 flex items-center gap-1 text-[10px] font-medium", statusConfig.class)}>
                {statusConfig.icon}
                {statusLabel}
              </div>
            </div>
          </div>
          {action}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <Separator className="mb-3" />
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
        {extra}
      </CardContent>
    </Card>
  )
}
