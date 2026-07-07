"use client"

import { useState } from "react"
import { GoogleSignInExplainer } from "@/components/google-sign-in-explainer"
import { AlertCircle, Check, Copy, Globe, KeyRound, Link2, Mail, Wifi, WifiOff, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { generateApiKey, type getIntegrationStatus } from "@/app/actions"

export function ExtensionPageClient({
  initialApiKey,
  integrationStatus: initialIntegrationStatus,
}: {
  initialApiKey: string | null
  integrationStatus: Awaited<ReturnType<typeof getIntegrationStatus>> | null
}) {
  const [apiKey, setApiKey] = useState<string | null>(initialApiKey)
  const [integrationStatus, setIntegrationStatus] = useState(initialIntegrationStatus)
  const [apiKeyCopied, setApiKeyCopied] = useState(false)
  const [showAdvancedConnection, setShowAdvancedConnection] = useState(false)
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)

  const extensionKeyIssued = integrationStatus?.extensionKeyIssued ?? false
  const extensionConnected = integrationStatus?.extensionConnected ?? false

  const handleGenerateKey = async () => {
    setIsRegenerating(true)
    try {
      const key = await generateApiKey()
      setApiKey(key)
      setIntegrationStatus((prev) =>
        prev
          ? { ...prev, extensionKeyIssued: true, extensionConnected: false }
          : prev
      )
    } finally {
      setIsRegenerating(false)
      setShowRegenerateConfirm(false)
    }
  }

  const handleCopyApiKey = async () => {
    if (!apiKey) return
    await navigator.clipboard.writeText(apiKey)
    setApiKeyCopied(true)
    setTimeout(() => setApiKeyCopied(false), 2000)
  }

  const chromeStatus = extensionConnected
    ? "connected"
    : extensionKeyIssued
      ? "disconnected"
      : "disconnected"

  const chromeStatusLabel = extensionConnected
    ? "Extension active"
    : extensionKeyIssued
      ? "Code ready — open extension"
      : "Not set up"

  const platformStatus = extensionConnected ? "connected" : "disconnected"
  const platformStatusLabel = extensionConnected
    ? "Via active extension"
    : extensionKeyIssued
      ? "Open extension to connect"
      : "Connect extension first"

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <IntegrationCard
          icon={<Globe className="size-5" />}
          name="Chrome Extension"
          description="Generate personalized drafts directly from X and LinkedIn feed posts."
          status={chromeStatus}
          statusLabel={chromeStatusLabel}
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
            extensionKeyIssued || apiKey ? (
              <div className="mt-3 space-y-2">
                <p className="text-xs text-muted-foreground">
                  Open the extension popup and tap Connect — no manual code needed for most users.
                </p>
                {showAdvancedConnection && apiKey && (
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
                      onClick={() => setShowRegenerateConfirm(true)}
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
                <Button variant="outline" size="sm" className="mt-2" onClick={handleGenerateKey}>
                  Generate connection code
                </Button>
              </div>
            )
          }
        />

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
              : integrationStatus?.gmailNeedsReconnect || integrationStatus?.gmailMissingReadonly
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
          integrationStatus?.gmailMissingReadonly ? (
            <GoogleSignInExplainer
              mode="gmail-read"
              callbackUrl="/dashboard/emails"
              trigger={(open) => (
                <Button size="sm" variant="outline" onClick={open}>
                  Reconnect
                </Button>
              )}
            />
          ) : integrationStatus?.gmailNotEnabled ? (
            <GoogleSignInExplainer
              mode="gmail-send"
              callbackUrl="/dashboard/extension"
              trigger={(open) => (
                <Button size="sm" variant="outline" onClick={open}>
                  Enable Gmail
                </Button>
              )}
            />
          ) : (
            <GoogleSignInExplainer
              mode="gmail-read"
              callbackUrl="/dashboard/extension"
              trigger={(open) => (
                <Button size="sm" variant="outline" onClick={open}>
                  Manage
                </Button>
              )}
            />
          )
        }
        />

        <IntegrationCard
          icon={<Link2 className="size-5" />}
          name="LinkedIn"
          description="Draft messages for LinkedIn feed posts via the Chrome extension."
          status={platformStatus}
          statusLabel={platformStatusLabel}
        />

        <IntegrationCard
          icon={<XIcon className="size-5" />}
          name="X (Twitter)"
          description="Draft messages for X feed posts via the Chrome extension."
          status={platformStatus}
          statusLabel={platformStatusLabel}
        />
      </div>

      <Dialog open={showRegenerateConfirm} onOpenChange={setShowRegenerateConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Regenerate connection code?</DialogTitle>
            <DialogDescription>
              This will disconnect your Chrome extension immediately. Open the extension popup and
              tap Connect again to link your account.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRegenerateConfirm(false)}>
              Cancel
            </Button>
            <Button onClick={handleGenerateKey} disabled={isRegenerating}>
              {isRegenerating ? "Regenerating…" : "Regenerate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
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
      className: "text-chart-2",
      badgeVariant: "success" as const,
    },
    disconnected: {
      icon: <WifiOff className="size-3" />,
      className: "text-muted-foreground",
      badgeVariant: "outline" as const,
    },
    error: {
      icon: <AlertCircle className="size-3" />,
      className: "text-destructive",
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
              <div className={cn("mt-0.5 flex items-center gap-1 text-[10px] font-medium", statusConfig.className)}>
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
        <div className="mt-3">
          <Badge variant={statusConfig.badgeVariant} className="text-[10px]">
            {status === "connected" ? "Connected" : status === "error" ? "Action needed" : "Disconnected"}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}
