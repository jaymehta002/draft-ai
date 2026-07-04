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
        "inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-4 transition-colors duration-200 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className
      )}
    >
      <ExternalLink className="h-3 w-3" />
      {label}
    </a>
  )
}
