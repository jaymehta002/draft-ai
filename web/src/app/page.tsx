"use client"

import { useSession, signIn } from "next-auth/react"
import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Copy,
  Mail,
  Sparkles,
  TrendingUp,
  Zap,
  ExternalLink,
} from "lucide-react"
import {
  saveCandidateProfile,
  generateApiKey,
  getDashboardData,
  getAnalyticsData,
  getDraftsData,
  getEmailsData,
  getDMsData,
} from "./actions"
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
import { Skeleton } from "@/components/ui/skeleton"
import { FadeIn } from "@/components/motion"

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
  drafts: "Drafts",
  emails: "Inbox",
  dms: "Messages",
  profile: "Account",
  extension: "Integrations",
}

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [section, setSection] = useState<DashboardSection>("analytics")
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [candidateProfile, setCandidateProfile] = useState<CandidateProfile>(null)
  const [profileData, setProfileData] = useState<CandidateProfileData | null>(null)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [draftsData, setDraftsData] = useState<DraftsData | null>(null)
  const [emailsData, setEmailsData] = useState<EmailsData | null>(null)
  const [dmsData, setDMsData] = useState<DMsData | null>(null)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    const [data, stats, drafts, emails, dms] = await Promise.all([
      getDashboardData(),
      getAnalyticsData(),
      getDraftsData(),
      getEmailsData(),
      getDMsData(),
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
    setLoading(false)
  }, [router])

  useEffect(() => {
    if (status === "authenticated") {
      loadData()
    } else if (status === "unauthenticated") {
      setLoading(false)
    }
  }, [status, loadData])

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

  if (loading) {
    return (
      <div className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-7xl gap-6">
          <Skeleton className="hidden h-[calc(100vh-4rem)] w-20 rounded-2xl lg:block" />
          <div className="flex-1 space-y-6">
            <Skeleton className="h-16 w-full rounded-2xl" />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-36 rounded-2xl" />
              ))}
            </div>
            <Skeleton className="h-72 rounded-2xl" />
          </div>
        </div>
      </div>
    )
  }

  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-background px-6 py-10">
        <FadeIn className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md items-center">
          <Card className="w-full border-border shadow-lg">
            <CardHeader className="space-y-6 pt-12 pb-8 text-center">
              <div className="flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent text-accent-foreground shadow-md">
                  <Sparkles className="h-8 w-8 text-accent-foreground" strokeWidth={2.5} />
                </div>
              </div>
              <div>
                <CardTitle className="font-serif text-4xl tracking-tight">Draft AI</CardTitle>
                <CardDescription className="mt-3 text-base leading-relaxed">
                  AI-powered outreach drafts for X and LinkedIn
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pb-12 px-8">
              <Button onClick={() => signIn("google")} className="w-full" size="lg" variant="accent">
                <Sparkles className="h-5 w-5" />
                Continue with Google
              </Button>
            </CardContent>
          </Card>
        </FadeIn>
      </div>
    )
  }

  const profile = profileData
  const draftCount = draftsData?.drafts.length ?? 0

  return (
    <div className="min-h-screen bg-background flex">
      <AppSidebar
        active={section}
        onNavigate={setSection}
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
        counts={{
          drafts: draftCount,
          emails: emailsData?.emails.length,
          dms: dmsData?.dms.length,
        }}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-40 border-b border-border bg-card/95 shadow-sm backdrop-blur">
          <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <MobileMenuButton onClick={() => setMobileNavOpen(true)} />
              <h1 className="text-base font-semibold tracking-tight">{SECTION_LABELS[section]}</h1>
            </div>
            <AccountMenu
              name={candidateProfile?.fullName || session?.user?.name}
              email={session?.user?.email}
              image={session?.user?.image}
              title={candidateProfile?.currentTitle}
              onNavigate={(s) => setSection(s as DashboardSection)}
            />
          </div>
        </header>

        <main className="flex-1 overflow-auto bg-background">
          {section === "analytics" && analytics && (
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard icon={Sparkles} label="Pending drafts" value={draftCount} />
                <StatCard icon={Mail} label="Emails sent" value={analytics.emailsSent} />
                <StatCard icon={Copy} label="DMs copied" value={analytics.dmsCopied} />
                <StatCard
                  icon={Zap}
                  label="Cache hits"
                  value={analytics.cacheHits}
                  sub={`~${analytics.tokensSavedEstimate.toLocaleString()} tokens saved`}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <Card className="border-border shadow-sm transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-md">
                  <CardHeader className="pb-3">
                    <CardDescription className="text-xs font-medium uppercase tracking-wider">This week</CardDescription>
                    <CardTitle className="text-4xl font-semibold tracking-tight tabular-nums">{analytics.draftsThisWeek}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">new drafts generated</p>
                  </CardContent>
                </Card>
                <Card className="border-border shadow-sm transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-md">
                  <CardHeader className="pb-3">
                    <CardDescription className="text-xs font-medium uppercase tracking-wider">Email pipeline</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-muted/40">
                      <span className="text-muted-foreground">Active</span>
                      <Badge variant="secondary" className="tabular-nums">{emailsData?.stats.sent ?? 0}</Badge>
                    </div>
                    <div className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-muted/40">
                      <span className="text-muted-foreground">Aged</span>
                      <Badge variant="warning" className="tabular-nums">{emailsData?.stats.aged ?? 0}</Badge>
                    </div>
                    <div className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-muted/40">
                      <span className="text-muted-foreground">Responded</span>
                      <Badge variant="accent" className="tabular-nums">{emailsData?.stats.responded ?? 0}</Badge>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-border shadow-sm transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-md">
                  <CardHeader className="pb-3">
                    <CardDescription className="text-xs font-medium uppercase tracking-wider flex items-center gap-2">
                      <TrendingUp className="h-3.5 w-3.5" /> By platform
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2.5">
                    {Object.entries(analytics.platformBreakdown).length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">No outreach yet</p>
                    ) : (
                      Object.entries(analytics.platformBreakdown).map(([platform, count]) => (
                        <div key={platform} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-muted/40">
                          <span className="text-muted-foreground font-medium">{platform}</span>
                          <span className="font-semibold tabular-nums text-foreground">{count}</span>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card className="border-border shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Quick actions</CardTitle>
                  <CardDescription>
                    {draftCount} pending draft{draftCount !== 1 ? "s" : ""} · {analytics.emailsSent} emails · {analytics.dmsCopied} DMs
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-3">
                  <Button variant="outline" size="default" className="font-semibold" onClick={() => setSection("drafts")}>
                    View drafts
                  </Button>
                  <Button variant="outline" size="default" className="font-semibold" onClick={() => setSection("emails")}>
                    View emails
                  </Button>
                  <Button variant="outline" size="default" className="font-semibold" onClick={() => setSection("dms")}>
                    View DMs
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {section === "drafts" && draftsData && (
            <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
              <DraftsPanel drafts={draftsData.drafts} />
            </div>
          )}

          {section === "emails" && emailsData && (
            <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
              <EmailsPanel emails={emailsData.emails} onRefresh={refreshEmails} />
            </div>
          )}

          {section === "dms" && dmsData && (
            <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
              <DMsPanel dms={dmsData.dms} />
            </div>
          )}

          {section === "profile" && profile && (
            <FadeIn className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
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
                        .map((skill) => skill.trim())
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
            </FadeIn>
          )}

          {section === "extension" && (
            <FadeIn className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 lg:px-8">
              <Card className="border-border shadow-sm">
                <CardContent className="space-y-6 p-6">
                  <Button className="w-full" size="lg" variant="accent" asChild>
                    <a href="/extension/connect">
                      <ExternalLink className="h-5 w-5" />
                      Connect extension
                    </a>
                  </Button>
                  {apiKey ? (
                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-foreground">API key</label>
                      <div className="flex gap-3">
                        <Input readOnly value={apiKey} className="font-mono text-xs" />
                        <Button variant="outline" size="icon" onClick={() => navigator.clipboard.writeText(apiKey)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No API key yet</p>
                  )}
                  <Button variant="outline" className="w-full" size="lg" onClick={handleGenerateKey}>
                    {apiKey ? "Regenerate key" : "Generate API key"}
                  </Button>
                </CardContent>
              </Card>
            </FadeIn>
          )}
        </main>
      </div>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number
  sub?: string
}) {
  return (
    <Card className="group border-border shadow-sm transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <CardHeader className="pb-3 pt-6">
        <div className="flex items-center justify-between mb-3">
          <CardDescription className="text-xs font-medium uppercase tracking-wider">{label}</CardDescription>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/12 transition-colors group-hover:bg-accent/18">
            <Icon className="h-4 w-4 text-accent" />
          </div>
        </div>
        <CardTitle className="text-4xl font-semibold tracking-tight tabular-nums transition-colors group-hover:text-accent">{value}</CardTitle>
      </CardHeader>
      {sub && (
        <CardContent className="pb-6">
          <p className="text-xs text-muted-foreground">{sub}</p>
        </CardContent>
      )}
    </Card>
  )
}
