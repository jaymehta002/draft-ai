"use client"

import { useState } from "react"
import Link from "next/link"
import { Copy, Check, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { formatDateTime } from "@/lib/format-date"

type Template = {
  id: string
  industryTag: string | null
  toneUsed: string | null
  excerpt: string
  matchScore: number | null
  createdAt: string
}

export function TemplatesGallery({ templates }: { templates: Template[] }) {
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const handleCopy = async (id: string, text: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  if (templates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/8 text-primary">
          <Sparkles className="size-7" strokeWidth={1.5} />
        </div>
        <p className="text-sm text-muted-foreground max-w-sm">
          When you get replies, your best messages will appear here automatically.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {templates.map((t) => (
        <Card key={t.id} className="border-border shadow-sm">
          <CardContent className="p-4 space-y-3">
            <blockquote className="text-sm italic text-muted-foreground leading-relaxed">
              &ldquo;{t.excerpt}&rdquo;
            </blockquote>
            <div className="flex flex-wrap gap-1.5">
              {t.toneUsed && (
                <Badge variant="secondary" className="text-[10px] capitalize">
                  {t.toneUsed}
                </Badge>
              )}
              {t.matchScore != null && (
                <Badge variant="outline" className="text-[10px]">
                  {t.matchScore}% match
                </Badge>
              )}
              {t.industryTag && (
                <Badge variant="outline" className="text-[10px]">
                  {t.industryTag}
                </Badge>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground">
              {formatDateTime(t.createdAt)}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => handleCopy(t.id, t.excerpt)}
              >
                {copiedId === t.id ? (
                  <Check className="size-3.5 mr-1" />
                ) : (
                  <Copy className="size-3.5 mr-1" />
                )}
                Copy
              </Button>
              <Button size="sm" className="flex-1" asChild>
                <Link
                  href={`/try?tone=${encodeURIComponent(t.toneUsed || "professional")}&hint=${encodeURIComponent(t.excerpt.slice(0, 100))}`}
                >
                  Adapt
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
