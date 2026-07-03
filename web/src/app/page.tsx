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
import { ProfileCard } from "@/components/profile-card"
import { ProfileEditor } from "@/components/profile/profile-editor"
import { DraftsPanel } from "@/components/panels/drafts-panel"
import { EmailsPanel } from "@/components/panels/emails-panel"
import { DMsPanel } from "@/components/panels/dms-panel"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
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
    resumeContent: profile.resumeContent ?? "",
    desiredRoles: profile.desiredRoles ?? "",
    salaryExpectation: profile.salaryExpectation ?? "",
    workPreference: profile.workPreference ?? "",
    availability: profile.availability ?? "",
  })
}

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [section, setSection] = useState<DashboardSection>("analytics")
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [candidateProfile, setCandidateProfile] = useState<CandidateProfile>(null)
  const [profileData, setProfileData] = useState<CandidateProfileData | null>(null)
  const [profileSaving, setProfileSaving] = useState(false)
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
    } finally {
      setProfileSaving(false)
    }
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading Draft AI...</p>
        </div>
      </div>
    )
  }

  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <FadeIn className="max-w-md w-full">
          <Card className="border-border/60 shadow-lg">
            <CardHeader className="text-center space-y-4 pt-10">
              <div className="flex justify-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-foreground">
                  <Sparkles className="h-6 w-6 text-background" />
                </div>
              </div>
              <div>
                <CardTitle className="text-2xl tracking-tight">Draft AI</CardTitle>
                <CardDescription className="text-base mt-2">
                  Draft personalized outreach on X and LinkedIn
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pb-10">
              <Button onClick={() => signIn("google")} className="w-full h-11 rounded-full" size="lg">
                <Sparkles className="h-4 w-4" />
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
        <header className="sticky top-0 z-40 border-b border-border/60 bg-card/80 backdrop-blur-xl">
          <div className="px-4 sm:px-8 h-14 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <MobileMenuButton onClick={() => setMobileNavOpen(true)} />
              <h1 className="text-sm font-semibold tracking-tight capitalize lg:hidden">{section}</h1>
            </div>
            <ProfileCard
              name={candidateProfile?.fullName || session?.user?.name}
              email={session?.user?.email}
              image={session?.user?.image}
              title={candidateProfile?.currentTitle}
              onNavigate={(s) => setSection(s as DashboardSection)}
            />
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8 overflow-auto max-w-6xl w-full">
          {section === "analytics" && analytics && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight">Overview</h2>
                <p className="text-sm text-muted-foreground mt-1">Your outreach activity at a glance</p>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Card className="border-border/60 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardDescription>This week</CardDescription>
                    <CardTitle className="text-3xl font-semibold tracking-tight">{analytics.draftsThisWeek}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">new drafts generated</p>
                  </CardContent>
                </Card>
                <Card className="border-border/60 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardDescription>Email pipeline</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Active</span>
                      <span className="font-medium tabular-nums">{emailsData?.stats.sent ?? 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Aged</span>
                      <span className="font-medium tabular-nums text-amber-600">{emailsData?.stats.aged ?? 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Responded</span>
                      <span className="font-medium tabular-nums text-emerald-600">{emailsData?.stats.responded ?? 0}</span>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-border/60 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-1.5">
                      <TrendingUp className="h-3.5 w-3.5" /> By platform
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {Object.entries(analytics.platformBreakdown).length === 0 ? (
                      <p className="text-xs text-muted-foreground">No outreach yet</p>
                    ) : (
                      Object.entries(analytics.platformBreakdown).map(([platform, count]) => (
                        <div key={platform} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{platform}</span>
                          <span className="font-medium tabular-nums">{count}</span>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card className="border-border/60 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Quick actions</CardTitle>
                  <CardDescription>
                    {draftCount} pending draft{draftCount !== 1 ? "s" : ""} · {analytics.emailsSent} emails · {analytics.dmsCopied} DMs
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" className="rounded-full" onClick={() => setSection("drafts")}>
                    View drafts
                  </Button>
                  <Button variant="outline" size="sm" className="rounded-full" onClick={() => setSection("emails")}>
                    View emails
                  </Button>
                  <Button variant="outline" size="sm" className="rounded-full" onClick={() => setSection("dms")}>
                    View DMs
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {section === "drafts" && draftsData && (
            <DraftsPanel drafts={draftsData.drafts} />
          )}

          {section === "emails" && emailsData && (
            <EmailsPanel emails={emailsData.emails} onRefresh={refreshEmails} />
          )}

          {section === "dms" && dmsData && (
            <DMsPanel dms={dmsData.dms} />
          )}

          {section === "profile" && profile && (
            <FadeIn>
              <Card className="border-border/60 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-xl tracking-tight">Your profile</CardTitle>
                  <CardDescription>
                    Structured experience, projects, and certificates power your outreach drafts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ProfileEditor
                    profile={profile}
                    onChange={setProfileData}
                    onSave={handleSaveProfile}
                    saving={profileSaving}
                  />
                </CardContent>
              </Card>
            </FadeIn>
          )}

          {section === "extension" && (
            <FadeIn>
              <Card className="max-w-md border-border/60 shadow-sm">
                <CardHeader>
                  <CardTitle>Chrome extension</CardTitle>
                  <CardDescription>Connect Draft AI to draft on X and LinkedIn</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button className="w-full" asChild>
                    <a href="/extension/connect">
                      <ExternalLink className="h-4 w-4" />
                      Connect extension
                    </a>
                  </Button>
                  {apiKey ? (
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">API key</label>
                      <div className="flex gap-2">
                        <Input readOnly value={apiKey} className="font-mono text-xs" />
                        <Button variant="outline" size="icon" onClick={() => navigator.clipboard.writeText(apiKey)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No API key yet</p>
                  )}
                  <Button variant="outline" className="w-full" onClick={handleGenerateKey}>
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
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-2 pt-5">
        <div className="flex items-center justify-between">
          <CardDescription className="text-xs">{label}</CardDescription>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <CardTitle className="text-3xl font-semibold tracking-tight tabular-nums">{value}</CardTitle>
      </CardHeader>
      {sub && (
        <CardContent className="pb-5">
          <p className="text-[11px] text-muted-foreground">{sub}</p>
        </CardContent>
      )}
    </Card>
  )
}
