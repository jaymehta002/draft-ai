"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { signOut } from "next-auth/react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ProfileCard } from "@/components/profile-card"
import { ProfileEditor } from "@/components/profile/profile-editor"
import { PreferencesSection } from "@/components/dashboard/preferences-section"
import { BillingTab } from "@/components/billing/billing-tab"
import { getDashboardData, saveCandidateProfile } from "@/app/actions"
import { profileToFormData, syncLegacyFields, PROFILE_CONFLICT_ERROR } from "@/lib/candidate-profile"
import type { CandidateProfileData } from "@/lib/candidate-profile"
import { CreditCard, ShieldCheck, Sliders, User } from "lucide-react"

export function ProfilePageClient({ initialProfile }: { initialProfile: CandidateProfileData }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [tab, setTab] = useState(() => searchParams.get("tab") || "profile")

  const [profileData, setProfileData] = useState<CandidateProfileData>(initialProfile)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [confirmEmail, setConfirmEmail] = useState("")
  const [deleting, setDeleting] = useState(false)
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await fetch("/api/account/export")
      if (!res.ok) throw new Error("Export failed")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "draft-ai-export.json"
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to export data")
    } finally {
      setExporting(false)
    }
  }

  const handleDeleteAccount = async () => {
    setDeleting(true)
    setError(null)
    try {
      const res = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmEmail }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to delete account")
      }
      await signOut({ callbackUrl: "/" })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete account")
    } finally {
      setDeleting(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      await saveCandidateProfile(profileToFormData(syncLegacyFields(profileData)), true)
      router.refresh()
    } catch (e) {
      if (e instanceof Error && e.message === PROFILE_CONFLICT_ERROR) {
        const fresh = await getDashboardData().catch(() => null)
        if (fresh?.candidateProfile) {
          setProfileData((prev) => ({ ...prev, version: fresh.candidateProfile!.version }))
        }
        setError("Your profile was updated elsewhere while you were editing. We've refreshed it — your changes here are still intact, just try again.")
      } else {
        setError(e instanceof Error ? e.message : "Failed to save profile")
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Tabs
      value={tab}
      onValueChange={(v) => {
        setTab(v)
        router.replace(`/dashboard/profile?tab=${encodeURIComponent(v)}`)
      }}
    >
      <TabsList className="mb-6">
        <TabsTrigger value="profile" className="gap-2">
          <User className="size-3.5" />
          Profile
        </TabsTrigger>
        <TabsTrigger value="preferences" className="gap-2">
          <Sliders className="size-3.5" />
          Preferences
        </TabsTrigger>
        <TabsTrigger value="billing" className="gap-2">
          <CreditCard className="size-3.5" />
          Billing
        </TabsTrigger>
        <TabsTrigger value="security" className="gap-2">
          <ShieldCheck className="size-3.5" />
          Security
        </TabsTrigger>
      </TabsList>

      <TabsContent value="profile">
        <div className="space-y-6">
          <ProfileCard
            name={profileData.fullName || "Draft AI user"}
            title={profileData.currentTitle || "Candidate profile"}
            avatarUrl={null}
            bio={profileData.summary || "Add a short summary so your outreach drafts have stronger context."}
            stats={[
              { label: "Years", value: profileData.yearsExperience || "0" },
              {
                label: "Skills",
                value: profileData.skills
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean).length,
              },
              { label: "Projects", value: profileData.projects.length },
              { label: "Certificates", value: profileData.certificates.length },
            ]}
            actions={[
              ...(profileData.linkedinUrl ? [{ label: "LinkedIn", href: profileData.linkedinUrl, variant: "outline" as const }] : []),
              ...(profileData.portfolioUrl ? [{ label: "Portfolio", href: profileData.portfolioUrl, variant: "secondary" as const }] : []),
            ]}
          />
          <ProfileEditor
            profile={profileData}
            onChange={(p) => {
              setError(null)
              setProfileData(p)
            }}
            onSave={handleSave}
            saving={saving}
            error={error}
          />
        </div>
      </TabsContent>

      <TabsContent value="preferences">
        <PreferencesSection
          outreachTone={profileData.outreachTone}
          draftLength={profileData.draftLength}
          outreachLanguage={profileData.outreachLanguage}
        />
      </TabsContent>

      <TabsContent value="billing">
        <BillingTab />
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
                <p className="text-xs text-muted-foreground">Signed in</p>
              </div>
              <Badge variant="success" className="ml-auto">Secured</Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
                {exporting ? "Exporting…" : "Export my data"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setShowDeleteDialog(true)}
              >
                Delete account
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>
              This permanently deletes your profile, drafts, and outreach history. Type your
              email to confirm.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={confirmEmail}
            onChange={(e) => setConfirmEmail(e.target.value)}
            placeholder="your@email.com"
            autoComplete="off"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={deleting || !confirmEmail.trim()}
            >
              {deleting ? "Deleting…" : "Delete permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Tabs>
  )
}

