import { ExternalLink, User } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type RecipientProfileProps = {
  name?: string | null
  email?: string | null
  handle?: string | null
  profileUrl?: string | null
  platform?: string
  className?: string
  compact?: boolean
}

export function RecipientProfile({
  name,
  email,
  handle,
  profileUrl,
  platform,
  className,
  compact = false,
}: RecipientProfileProps) {
  const displayName = name || email || handle || "Unknown recipient"

  return (
    <div className={cn("flex items-start gap-3", className)}>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <User className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className={cn("font-medium text-foreground", compact ? "text-sm" : "text-base")}>
            {displayName}
          </p>
          {platform && <Badge variant="secondary">{platform}</Badge>}
        </div>
        {!compact && email && (
          <p className="text-sm text-muted-foreground truncate">{email}</p>
        )}
        {handle && (
          <p className="text-xs text-muted-foreground">@{handle}</p>
        )}
        {profileUrl && (
          <a
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1 rounded-sm text-xs text-primary underline-offset-4 transition-colors duration-200 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <ExternalLink className="h-3 w-3" />
            View profile
          </a>
        )}
      </div>
    </div>
  )
}
