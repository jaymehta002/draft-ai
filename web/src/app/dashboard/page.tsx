import Link from "next/link"
import { redirect } from "next/navigation"
import {
  Copy,
  Mail,
  Sparkles,
  TrendingUp,
  ExternalLink,
  LayoutGrid,
} from "lucide-react"
import {
  getAnalyticsData,
  getDashboardData,
  getDraftsData,
  getEmailsData,
  getWinningTemplates,
  getRecentReplies,
} from "@/app/actions"
import { getEngagementData } from "@/app/actions/engagement"
import { getUserReplyMetrics } from "@/lib/reply-metrics"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FadeIn } from "@/components/motion"
import { cn } from "@/lib/utils"
import { dashboardPathForSection, dashboardSectionFromSearchParam } from "@/lib/dashboard-routes"
import { StreakCard } from "@/components/dashboard/streak-card"
import { WeeklyGoalCard } from "@/components/panels/draft-actions"
import { ReplyRateRing } from "@/components/dashboard/reply-rate-ring"
import { TrophyCase } from "@/components/dashboard/trophy-case"
import { TonePerformanceChart } from "@/components/dashboard/tone-performance-chart"
import { MilestoneBadges } from "@/components/dashboard/milestone-badges"
import { PlanUpgradeCard } from "@/components/billing/plan-upgrade-card"

type EmailsData = Awaited<ReturnType<typeof getEmailsData>>

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const section = dashboardSectionFromSearchParam(
    typeof params.section === "string" ? params.section : null
  )
  if (section && section !== "analytics") {
    redirect(dashboardPathForSection(section))
  }

  const session = await getServerSession(authOptions)
  const user = session?.user?.email
    ? await prisma.user.findUnique({ where: { email: session.user.email } })
    : null

  const [analytics, draftsData, emailsData, winningTemplates, dashboardData, engagement, recentReplies, replyMetrics] =
    await Promise.all([
      getAnalyticsData(),
      getDraftsData(),
      getEmailsData(),
      getWinningTemplates(),
      getDashboardData(),
      getEngagementData(),
      getRecentReplies(),
      user ? getUserReplyMetrics(user.id) : null,
    ])

  const draftCount = draftsData?.drafts.length ?? 0
  const needsProfileEnrichment =
    (dashboardData?.candidateProfile?.workExperiences?.length ?? 0) === 0

  return (
    <FadeIn className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        {needsProfileEnrichment && (
          <Card className="border-border bg-card shadow-sm">
            <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Add work experience to improve draft quality and match scores.
              </p>
              <Button size="sm" variant="outline" asChild>
                <Link href="/dashboard/profile">Complete profile</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        <PlanUpgradeCard />

        {(analytics.sentThisWeek ?? 0) > 0 && (
          <Card className="border-primary/20 bg-primary/5 shadow-sm">
            <CardContent className="py-4">
              <p className="text-sm text-foreground">
                You started{" "}
                <span className="font-semibold text-primary">{analytics.sentThisWeek}</span>{" "}
                conversation{analytics.sentThisWeek !== 1 ? "s" : ""} this week. Keep going.
              </p>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StreakCard
            currentStreak={engagement.currentStreak}
            longestStreak={engagement.longestStreak}
          />
          <WeeklyGoalCard
            weekProgress={engagement.weekProgress}
            weeklyGoal={engagement.weeklyGoal}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="border-border shadow-sm">
            <CardContent className="flex items-center justify-center py-8">
              <ReplyRateRing
                rate={analytics.replyRate ?? 0}
                sublabel={`${analytics.replyRate7d ?? 0}% last 7 days · ${analytics.totalReplied ?? 0} replied`}
              />
            </CardContent>
          </Card>
          <TrophyCase replies={recentReplies} />
        </div>

        <MilestoneBadges unlocked={engagement.milestones} />

        {replyMetrics && (
          <TonePerformanceChart
            byTone={replyMetrics.byTone}
            fallbackTone={dashboardData?.candidateProfile?.outreachTone ?? "professional"}
          />
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={Sparkles}
            label="Pending drafts"
            value={draftCount}
            color="primary"
            href="/dashboard/drafts"
          />
          <StatCard
            icon={Mail}
            label="Emails started"
            value={analytics.emailsSent}
            color="chart-2"
            href="/dashboard/emails"
          />
          <StatCard
            icon={Copy}
            label="DMs started"
            value={analytics.dmsCopied}
            color="chart-1"
            href="/dashboard/dms"
          />
          <StatCard
            icon={LayoutGrid}
            label="Pipeline"
            value={draftCount + (analytics.totalOutreach ?? 0)}
            color="chart-3"
            href="/dashboard/pipeline"
          />
        </div>

        {winningTemplates.length > 0 && (
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardDescription className="text-[10px] font-semibold uppercase tracking-widest">
                Messages that got replies
              </CardDescription>
              <Button variant="ghost" size="sm" asChild className="text-xs h-7">
                <Link href="/dashboard/templates">View all</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {winningTemplates.slice(0, 3).map((t) => (
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

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <EmailPipelineCard emailsData={emailsData} />

          <Card className="border-border shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardHeader className="pb-2">
              <CardDescription className="text-[10px] font-semibold uppercase tracking-widest flex items-center gap-2">
                <TrendingUp className="size-3" /> By platform
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(analytics.platformBreakdown).length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  No conversations yet — your first thoughtful note is one draft away.
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
                          className="h-full rounded-full bg-primary transition-[width] duration-500"
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

        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Quick actions</CardTitle>
            <CardDescription>
              {draftCount} pending draft{draftCount !== 1 ? "s" : ""} · {analytics.emailsSent} emails · {analytics.dmsCopied} DMs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" asChild className="gap-2">
                <Link href="/dashboard/pipeline">
                  <LayoutGrid className="size-3.5" />
                  Pipeline
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild className="gap-2">
                <Link href="/dashboard/drafts">
                  <Sparkles className="size-3.5" />
                  Drafts
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild className="gap-2">
                <Link href="/dashboard/emails">
                  <Mail className="size-3.5" />
                  Inbox
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild className="gap-2">
                <Link href="/dashboard/extension">
                  <ExternalLink className="size-3.5" />
                  Integrations
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
    </FadeIn>
  )
}

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
  href,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number | string
  sub?: string
  color?: StatColor
  href?: string
}) {
  const colors = COLOR_CLASSES[color]
  return (
    <Card className={cn("group relative border-border shadow-sm transition-[box-shadow,transform] duration-200 hover:shadow-md")}>
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
      {href && (
        <Link
          href={href}
          aria-label={`Open ${label}`}
          className="absolute inset-0 rounded-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        />
      )}
    </Card>
  )
}

function EmailPipelineCard({ emailsData }: { emailsData: EmailsData }) {
  return (
    <Card className="border-border shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-2">
        <CardDescription className="text-[10px] font-semibold uppercase tracking-widest">
          Conversation pipeline
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {[
          { label: "Started", value: emailsData?.stats.sent ?? 0, color: "bg-chart-2" },
          { label: "Awaiting", value: emailsData?.stats.aged ?? 0, color: "bg-chart-4" },
          { label: "Replied", value: emailsData?.stats.responded ?? 0, color: "bg-primary" },
        ].map(({ label, value, color }) => {
          const total =
            (emailsData?.stats.sent ?? 0) +
            (emailsData?.stats.aged ?? 0) +
            (emailsData?.stats.responded ?? 0)
          const pct = total > 0 ? (value / total) * 100 : 0
          return (
            <div key={label} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-semibold tabular-nums text-foreground">{value}</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-[width] duration-500", color)}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )
        })}
        <Button variant="outline" size="sm" asChild className="w-full mt-2">
          <Link href="/dashboard/pipeline">Open full pipeline</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
