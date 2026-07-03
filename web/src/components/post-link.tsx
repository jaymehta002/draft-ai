import { ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"

type PostLinkProps = {
  url: string | null
  className?: string
  label?: string
}

export function PostLink({ url, className, label = "View post" }: PostLinkProps) {
  if (!url) return null

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline",
        className
      )}
    >
      <ExternalLink className="h-3 w-3" />
      {label}
    </a>
  )
}
