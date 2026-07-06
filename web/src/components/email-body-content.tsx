"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import {
  parseEmailBody,
  parseInlineEmailParts,
  type EmailLinkHints,
  type InlineEmailPart,
} from "@/lib/email-body-format"
import { cn } from "@/lib/utils"

function InlineEmailText({ parts, linkClassName }: { parts: InlineEmailPart[]; linkClassName?: string }) {
  return (
    <>
      {parts.map((part, index) =>
        part.type === "link" ? (
          <a
            key={`${part.href}-${index}`}
            href={part.href}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "underline underline-offset-2 decoration-current/40 transition-[color,decoration-color] duration-150 hover:decoration-current",
              linkClassName
            )}
          >
            {part.label}
          </a>
        ) : (
          <span key={`text-${index}`}>{part.value}</span>
        )
      )}
    </>
  )
}

function EmailParagraphs({
  text,
  className,
  linkClassName,
  linkHints,
}: {
  text: string
  className?: string
  linkClassName?: string
  linkHints?: EmailLinkHints
}) {
  const paragraphs = text.split(/\n{2,}/).filter((p) => p.trim())

  if (paragraphs.length === 0) return null

  return (
    <div className={cn("space-y-3", className)}>
      {paragraphs.map((paragraph, index) => (
        <p key={index} className="text-sm leading-[1.7] whitespace-pre-wrap break-words">
          {paragraph.split("\n").map((line, lineIndex, lines) => (
            <span key={lineIndex}>
              <InlineEmailText
                parts={parseInlineEmailParts(line, linkHints)}
                linkClassName={linkClassName}
              />
              {lineIndex < lines.length - 1 ? <br /> : null}
            </span>
          ))}
        </p>
      ))}
    </div>
  )
}

function QuotedSection({
  quote,
  defaultExpanded = false,
  linkHints,
}: {
  quote: { header: string; body: string }
  defaultExpanded?: boolean
  linkHints?: EmailLinkHints
}) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const preview = quote.body.split("\n").find((line) => line.trim())?.slice(0, 80)

  return (
    <div className="mt-4 border-l-2 border-border/80 pl-3">
      <button
        type="button"
        onClick={() => setExpanded((open) => !open)}
        className="group flex w-full items-center gap-1.5 text-left text-xs text-muted-foreground transition-colors duration-150 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
      >
        <ChevronDown
          className={cn(
            "size-3.5 shrink-0 transition-transform duration-200",
            expanded ? "rotate-0" : "-rotate-90"
          )}
        />
        <span className="truncate font-medium">{quote.header}</span>
      </button>

      {!expanded && preview && (
        <p className="mt-1 truncate text-xs text-muted-foreground/80 pl-5">{preview}…</p>
      )}

      {expanded && (
        <div className="mt-2 rounded-lg bg-muted/40 px-3 py-2.5">
          <EmailParagraphs
            text={quote.body}
            className="space-y-2"
            linkClassName="text-primary font-medium"
            linkHints={linkHints}
          />
        </div>
      )}
    </div>
  )
}

export function EmailBodyContent({
  body,
  variant = "default",
  linkHints,
}: {
  body: string
  variant?: "default" | "outbound" | "inbound"
  linkHints?: EmailLinkHints
}) {
  const parsed = parseEmailBody(body)
  const linkClassName = "text-primary font-medium hover:text-primary/80"

  return (
    <div>
      {parsed.main ? (
        <EmailParagraphs text={parsed.main} linkClassName={linkClassName} linkHints={linkHints} />
      ) : !parsed.quote ? (
        <p className="text-sm italic text-muted-foreground">(empty message)</p>
      ) : null}

      {parsed.quote && <QuotedSection quote={parsed.quote} linkHints={linkHints} />}
    </div>
  )
}
