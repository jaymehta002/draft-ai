import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { getAdminMetrics, isAdminEmail } from "@/lib/admin-metrics"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
}

// Metrics are live — never cache this page.
export const dynamic = "force-dynamic"

export default async function AdminPage() {
  const session = await getServerSession(authOptions)
  if (!isAdminEmail(session?.user?.email)) notFound()

  const m = await getAdminMetrics()

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <h1 className="font-serif text-3xl tracking-tight text-foreground">Admin</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Live monetization &amp; growth metrics.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="MRR" value={`$${m.mrr.toLocaleString()}`} highlight />
          <Metric label="Trial → paid" value={`${m.trialToPaidRate}%`} />
          <Metric label="Active Pro" value={m.activePro} />
          <Metric label="Active Power" value={m.activePower} />
          <Metric label="Trialing now" value={m.trialing} />
          <Metric label="Past due" value={m.pastDue} />
          <Metric label="Canceled (mo)" value={m.canceledThisMonth} />
          <Metric label="Total users" value={m.totalUsers} />
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Activation funnel</CardTitle>
              <CardDescription>Users who have sent at least one outreach.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-foreground">
                {m.activatedUsers.toLocaleString()}
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  of {m.totalUsers.toLocaleString()} (
                  {m.totalUsers > 0 ? Math.round((m.activatedUsers / m.totalUsers) * 100) : 0}%)
                </span>
              </p>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Usage this period</CardTitle>
              <CardDescription>Metered drafts and emails across active periods.</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-8">
              <div>
                <p className="text-3xl font-semibold text-foreground">
                  {m.usageThisPeriod.drafts.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">Drafts</p>
              </div>
              <div>
                <p className="text-3xl font-semibold text-foreground">
                  {m.usageThisPeriod.emails.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">Emails</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function Metric({
  label,
  value,
  highlight,
}: {
  label: string
  value: string | number
  highlight?: boolean
}) {
  return (
    <div
      className={`rounded-xl border p-5 shadow-sm ${
        highlight ? "border-primary/40 bg-primary/5" : "border-border bg-card"
      }`}
    >
      <p className="text-2xl font-semibold text-foreground">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  )
}
