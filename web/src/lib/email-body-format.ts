export type EmailBodyQuote = {
  header: string
  body: string
}

export type ParsedEmailBody = {
  main: string
  quote: EmailBodyQuote | null
}

const REPLY_HEADER_PATTERN = /\nOn .+ wrote:\s*\n/i

/** Strip Gmail-style `>` quote prefixes from each line. */
export function stripQuoteMarkers(text: string): string {
  return text
    .split("\n")
    .map((line) => line.replace(/^>\s?/, ""))
    .join("\n")
    .trim()
}

/** Split a reply into the new message and the quoted prior thread. */
export function parseEmailBody(body: string): ParsedEmailBody {
  const normalized = body.replace(/\r\n/g, "\n").trim()
  if (!normalized) return { main: "", quote: null }

  const match = normalized.match(REPLY_HEADER_PATTERN)
  if (!match || match.index === undefined) {
    const withoutMarkers = stripQuoteMarkers(normalized)
    const allQuoted = normalized.split("\n").every((line) => line.trim() === "" || line.startsWith(">"))
    if (allQuoted && withoutMarkers) {
      return { main: "", quote: { header: "Quoted message", body: withoutMarkers } }
    }
    return { main: withoutMarkers, quote: null }
  }

  const main = stripQuoteMarkers(normalized.slice(0, match.index)).trim()
  const quoteBody = stripQuoteMarkers(normalized.slice(match.index + match[0].length)).trim()
  const quoteHeader = match[0].trim()

  return {
    main,
    quote: quoteBody ? { header: quoteHeader, body: quoteBody } : null,
  }
}

export type InlineEmailPart =
  | { type: "text"; value: string }
  | { type: "link"; label: string; href: string }

export type EmailLinkHints = {
  email?: string | null
  linkedinUrl?: string | null
  githubUrl?: string | null
  portfolioUrl?: string | null
}

export function normalizeHttpUrl(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`
}

export function buildEmailLinkHintMap(hints?: EmailLinkHints): Map<string, string> {
  const map = new Map<string, string>()
  if (!hints) return map

  if (hints.email) {
    map.set(hints.email.toLowerCase(), `mailto:${hints.email}`)
  }
  if (hints.linkedinUrl) {
    map.set("linkedin", normalizeHttpUrl(hints.linkedinUrl))
  }
  if (hints.githubUrl) {
    map.set("github", normalizeHttpUrl(hints.githubUrl))
  }
  if (hints.portfolioUrl) {
    const url = normalizeHttpUrl(hints.portfolioUrl)
    map.set("portfolio", url)
    try {
      const host = new URL(url).hostname.replace(/^www\./i, "").toLowerCase()
      map.set(host, url)
    } catch {
      // ignore invalid portfolio URL
    }
  }

  return map
}

const MARKDOWN_LINK_RE = /\[([^\]]+)\]\(([^)]+)\)/g
const PLAIN_URL_RE = /https?:\/\/[^\s<>)]+/g
const EMAIL_RE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g
const DOMAIN_RE = /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}\b/gi

function overlaps(
  index: number,
  length: number,
  ranges: Array<{ index: number; length: number }>
) {
  return ranges.some((r) => index < r.index + r.length && index + length > r.index)
}

function parseInlineEmailSegment(
  segment: string,
  hintMap: Map<string, string>
): InlineEmailPart[] {
  const trimmed = segment.trim()
  if (!trimmed) return [{ type: "text", value: segment }]

  const hintUrl = hintMap.get(trimmed.toLowerCase())
  if (hintUrl) {
    return [{ type: "link", label: trimmed, href: hintUrl }]
  }

  if (/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(trimmed)) {
    return [{ type: "link", label: trimmed, href: `mailto:${trimmed}` }]
  }

  if (/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i.test(trimmed)) {
    const hostUrl = hintMap.get(trimmed.toLowerCase()) ?? `https://${trimmed}`
    return [{ type: "link", label: trimmed, href: hostUrl }]
  }

  const parts: InlineEmailPart[] = []
  let cursor = 0

  const pushText = (value: string) => {
    if (!value) return
    const last = parts[parts.length - 1]
    if (last?.type === "text") last.value += value
    else parts.push({ type: "text", value })
  }

  const matches: Array<{ index: number; length: number; part: InlineEmailPart }> = []

  for (const match of trimmed.matchAll(MARKDOWN_LINK_RE)) {
    if (match.index === undefined) continue
    matches.push({
      index: match.index,
      length: match[0].length,
      part: { type: "link", label: match[1], href: match[2] },
    })
  }

  const taken = matches.map((m) => ({ index: m.index, length: m.length }))

  for (const match of trimmed.matchAll(PLAIN_URL_RE)) {
    if (match.index === undefined || overlaps(match.index, match[0].length, taken)) continue
    matches.push({
      index: match.index,
      length: match[0].length,
      part: { type: "link", label: match[0], href: match[0] },
    })
    taken.push({ index: match.index, length: match[0].length })
  }

  for (const match of trimmed.matchAll(EMAIL_RE)) {
    if (match.index === undefined || overlaps(match.index, match[0].length, taken)) continue
    matches.push({
      index: match.index,
      length: match[0].length,
      part: { type: "link", label: match[0], href: `mailto:${match[0]}` },
    })
    taken.push({ index: match.index, length: match[0].length })
  }

  for (const match of trimmed.matchAll(DOMAIN_RE)) {
    if (match.index === undefined || overlaps(match.index, match[0].length, taken)) continue
    const domain = match[0]
    const href = hintMap.get(domain.toLowerCase()) ?? `https://${domain}`
    matches.push({
      index: match.index,
      length: match[0].length,
      part: { type: "link", label: domain, href },
    })
    taken.push({ index: match.index, length: match[0].length })
  }

  for (const [label, href] of hintMap) {
    if (label.includes(".") || label.includes("@")) continue
    const labelRe = new RegExp(`\\b${label}\\b`, "gi")
    for (const match of trimmed.matchAll(labelRe)) {
      if (match.index === undefined || overlaps(match.index, match[0].length, taken)) continue
      matches.push({
        index: match.index,
        length: match[0].length,
        part: { type: "link", label: match[0], href },
      })
      taken.push({ index: match.index, length: match[0].length })
    }
  }

  matches.sort((a, b) => a.index - b.index)

  for (const match of matches) {
    pushText(trimmed.slice(cursor, match.index))
    parts.push(match.part)
    cursor = match.index + match.length
  }

  pushText(trimmed.slice(cursor))
  return parts.length > 0 ? parts : [{ type: "text", value: segment }]
}

/** Tokenize a line into plain text and link segments (markdown + bare URLs). */
export function parseInlineEmailParts(
  line: string,
  hints?: EmailLinkHints
): InlineEmailPart[] {
  if (!line) return [{ type: "text", value: "" }]

  const hintMap = buildEmailLinkHintMap(hints)

  if (line.includes("|")) {
    const segments = line.split(/\s*\|\s*/)
    const parts: InlineEmailPart[] = []
    segments.forEach((segment, index) => {
      if (index > 0) parts.push({ type: "text", value: " | " })
      parts.push(...parseInlineEmailSegment(segment, hintMap))
    })
    return parts
  }

  return parseInlineEmailSegment(line, hintMap)
}
