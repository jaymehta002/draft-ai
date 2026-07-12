/**
 * Canonical email extraction + validation, shared by the web app (imported
 * as `@/lib/email`) and the extension (draft/, which reaches in via a
 * relative import — Next's Turbopack is pinned to `web/` as its root in
 * next.config.ts, so it can't bundle a file living outside `web/`; Plasmo's
 * bundler has no such restriction, so this is the only direction that
 * works for both).
 *
 * Zero external dependencies on purpose: draft/ and web/ are independent,
 * non-workspaced projects with separate node_modules, so a bare-specifier
 * dependency like `tldts` wouldn't resolve when this file is imported from
 * outside web/'s node_modules tree. Instead we vendor a small, deliberately
 * non-exhaustive public-suffix table used only to *rank* ambiguous
 * extraction candidates (e.g. "foo@bar.com.join" vs "foo@bar.com") — it is
 * not used to reject otherwise well-formed emails with unfamiliar TLDs.
 */

const GENERIC_RECIPIENT_TOKENS = new Set([
  "admin",
  "careers",
  "contact",
  "cv",
  "cvs",
  "hello",
  "hiring",
  "hr",
  "info",
  "jobs",
  "people",
  "recruiter",
  "recruiting",
  "resume",
  "support",
  "talent",
  "team",
])

const LOCAL_PART_LABEL_PREFIXES = [
  "emailaddress",
  "emailid",
  "mailid",
  "email",
  "address",
  "mail",
]

// Single-label public suffixes commonly seen as the final label of a
// business email domain (generic TLDs + ccTLDs that are frequently
// registered directly).
const SIMPLE_TLDS = new Set([
  "com", "net", "org", "io", "co", "ai", "dev", "app", "me", "info", "biz",
  "edu", "gov", "mil", "int", "name", "pro", "mobi", "asia", "xyz", "tech",
  "cloud", "tv", "online", "site", "store", "blog", "agency", "studio",
  "digital", "network", "systems", "solutions", "company", "group",
  "global", "world", "email", "media", "news", "live", "work", "team",
  "today", "run", "page", "link", "us", "ca", "de", "fr", "jp", "cn", "in",
  "ru", "es", "it", "nl", "se", "no", "dk", "fi", "pl", "ch", "at", "be",
  "pt", "gr", "tr", "ae", "sa", "il", "sg", "hk", "tw", "kr", "my", "id",
  "th", "vn", "ph", "nz", "ie", "is", "lu", "cz", "sk", "hu", "ro", "bg",
  "hr", "si", "lt", "lv", "ee", "ua", "by", "kz", "ge", "am", "az", "mx",
  "ar", "cl", "pe", "ve", "ec", "uy", "py", "bo", "cr", "pa", "do", "gt",
  "hn", "ni", "sv", "jm", "tt", "bs", "bb", "ke", "ng", "gh", "tz", "ug",
  "zm", "zw", "mu", "ma", "tn", "dz", "eg", "jo", "lb", "qa", "kw", "om",
  "bh", "pk", "bd", "lk", "np", "mm", "kh", "la",
])

// Two-label public suffixes ("registrable under a second-level category")
// where the final label alone is not meaningful as a business domain TLD.
const COMPOUND_TLDS = new Set([
  "co.uk", "org.uk", "ac.uk", "gov.uk", "ltd.uk", "plc.uk", "me.uk", "net.uk", "sch.uk",
  "com.au", "net.au", "org.au", "edu.au", "gov.au", "id.au",
  "co.nz", "org.nz", "net.nz", "govt.nz", "ac.nz",
  "co.in", "net.in", "org.in", "gen.in", "firm.in", "ind.in",
  "co.jp", "or.jp", "ne.jp", "ac.jp", "go.jp",
  "co.kr", "or.kr", "ne.kr",
  "com.br", "net.br", "org.br", "gov.br",
  "com.mx", "org.mx", "gob.mx",
  "co.za", "org.za", "net.za", "gov.za",
  "com.sg", "net.sg", "org.sg", "edu.sg", "gov.sg",
  "com.hk", "org.hk", "net.hk", "edu.hk", "gov.hk",
  "co.il", "org.il", "net.il", "gov.il", "ac.il",
  "co.th", "or.th", "in.th", "ac.th", "go.th",
  "com.cn", "net.cn", "org.cn", "gov.cn", "edu.cn",
  "co.id", "or.id", "ac.id", "go.id",
  "com.tw", "org.tw", "net.tw", "gov.tw", "edu.tw",
  "com.ar", "net.ar", "org.ar", "gov.ar",
  "co.ke", "or.ke", "go.ke", "ne.ke",
  "com.pk", "net.pk", "org.pk", "gov.pk", "edu.pk",
  "com.ng", "net.ng", "org.ng", "gov.ng", "edu.ng",
  "co.ug", "or.ug", "go.ug",
  "co.tz", "or.tz", "go.tz",
  "com.co", "net.co", "org.co",
  "com.pe", "net.pe", "org.pe",
  "com.ve", "net.ve", "org.ve",
  "com.ec", "net.ec", "org.ec",
  "com.vn", "net.vn", "org.vn", "edu.vn", "gov.vn",
  "com.ph", "net.ph", "org.ph", "gov.ph",
  "com.my", "net.my", "org.my", "gov.my", "edu.my",
  "com.eg", "net.eg", "org.eg", "gov.eg",
  "com.sa", "net.sa", "org.sa", "gov.sa", "edu.sa",
  "com.tr", "net.tr", "org.tr", "gov.tr", "edu.tr",
  "com.ua", "net.ua", "org.ua", "gov.ua", "edu.ua",
  "co.rs", "org.rs", "edu.rs", "gov.rs",
])

const isUpper = (char: string) => char >= "A" && char <= "Z"
const isLower = (char: string) => char >= "a" && char <= "z"
const isLocalPartChar = (char: string) => /[A-Za-z0-9._%+-]/.test(char)
const isDomainChar = (char: string) => /[A-Za-z0-9.-]/.test(char)

const trimEmailToken = (value: string) =>
  value
    .replace(/^[<([{'"`]+/, "")
    .replace(/[>\])}',"`.!?:;]+$/, "")

const normalizeEmail = (value: string) => {
  const trimmed = value.trim().replace(/^mailto:/i, "")
  const atIndex = trimmed.lastIndexOf("@")
  if (atIndex === -1) return trimmed

  return `${trimmed.slice(0, atIndex)}@${trimmed.slice(atIndex + 1).toLowerCase()}`
}

export function isValidEmailAddress(email: string) {
  const normalized = normalizeEmail(email)
  const parts = normalized.split("@")
  if (parts.length !== 2) return false

  const [local, domain] = parts
  if (!local || !domain) return false
  if (!/^[A-Za-z0-9._%+-]+$/.test(local)) return false
  if (!/^[A-Za-z0-9.-]+$/.test(domain)) return false
  if (domain.includes("..") || domain.startsWith(".") || domain.endsWith(".")) return false

  const labels = domain.split(".")
  if (labels.length < 2) return false

  if (labels.some((label) => !label || label.startsWith("-") || label.endsWith("-") || !/^[A-Za-z0-9-]+$/.test(label))) {
    return false
  }

  return /^[A-Za-z]{2,24}$/.test(labels[labels.length - 1])
}

/**
 * Ranks a candidate domain by how confident we are that its trailing
 * label(s) are a real public suffix rather than over-captured sentence
 * text (e.g. the ".join" in "bar.com.join"). Higher is better; 0 means
 * "shape looks valid but we don't recognize the suffix" (still usable —
 * just lowest priority against a recognized candidate).
 */
const suffixScore = (domain: string) => {
  const labels = domain.split(".")
  if (labels.length < 2) return -1

  const last1 = labels[labels.length - 1]
  if (labels.length >= 3) {
    const last2 = `${labels[labels.length - 2]}.${last1}`
    if (COMPOUND_TLDS.has(last2)) return 2
  }
  if (SIMPLE_TLDS.has(last1)) return 1
  return 0
}

const candidateCutoffs = (value: string) => {
  const cutoffs = new Set<number>([value.length])

  for (let index = 1; index < value.length; index += 1) {
    if (isUpper(value[index]) && isLower(value[index - 1])) {
      cutoffs.add(index)
    }
    if (value[index] === ".") {
      cutoffs.add(index)
    }
  }

  return [...cutoffs]
}

const candidateLocalPartStarts = (localPart: string) => {
  const starts = new Set<number>([0])
  const lowerLocalPart = localPart.toLowerCase()

  for (const prefix of LOCAL_PART_LABEL_PREFIXES) {
    if (lowerLocalPart.startsWith(prefix) && localPart.length > prefix.length) {
      starts.add(prefix.length)
    }
  }

  return [...starts].sort((a, b) => b - a)
}

const collectEmailToken = (text: string, atIndex: number) => {
  let start = atIndex - 1
  while (start >= 0 && isLocalPartChar(text[start])) {
    start -= 1
  }
  start += 1

  let end = atIndex + 1
  let seenDot = false
  while (end < text.length) {
    const char = text[end]
    if (!isDomainChar(char)) break
    if (seenDot && isUpper(char) && isLower(text[end - 1] || "")) break
    if (char === ".") seenDot = true
    end += 1
  }

  return trimEmailToken(text.slice(start, end))
}

/**
 * Picks the best-scoring valid email for a given local part against every
 * dot/camelCase-boundary truncation of the captured domain text. Prefers a
 * recognized public suffix (and, among those, the longest/most specific
 * match) over an unrecognized-but-shape-valid one, so genuine multi-label
 * domains like "company.co.uk" still win over a merely-longer truncation.
 */
const bestDomainCandidate = (localPart: string, domainPart: string) => {
  let best: { candidate: string; score: number; length: number } | null = null

  for (const cutoff of candidateCutoffs(domainPart)) {
    const candidate = normalizeEmail(`${localPart}@${domainPart.slice(0, cutoff)}`)
    if (!isValidEmailAddress(candidate)) continue

    const domain = candidate.slice(candidate.lastIndexOf("@") + 1)
    const score = suffixScore(domain)

    if (!best || score > best.score || (score === best.score && cutoff > best.length)) {
      best = { candidate, score, length: cutoff }
    }
  }

  return best?.candidate ?? null
}

export function extractEmailFromText(text: string) {
  if (!text) return null

  for (let index = 0; index < text.length; index += 1) {
    if (text[index] !== "@") continue

    const rawToken = collectEmailToken(text, index)
    if (!rawToken) continue

    const atIndex = rawToken.lastIndexOf("@")
    if (atIndex === -1) continue

    const localPart = rawToken.slice(0, atIndex)
    const domainPart = rawToken.slice(atIndex + 1)

    for (const localStart of candidateLocalPartStarts(localPart)) {
      const strippedLocalPart = localPart.slice(localStart)
      if (!strippedLocalPart) continue

      const best = bestDomainCandidate(strippedLocalPart, domainPart)
      if (best) return best
    }
  }

  return null
}

const toTitleCase = (value: string) => value.slice(0, 1).toUpperCase() + value.slice(1).toLowerCase()

export function inferRecipientNameFromEmail(email: string) {
  const normalized = normalizeEmail(email)
  if (!isValidEmailAddress(normalized)) return null

  const localPart = normalized.split("@")[0]?.split("+")[0] || ""
  const tokens = localPart
    .split(/[._-]+/)
    .map((token) => token.replace(/\d+/g, "").trim())
    .filter(Boolean)

  if (tokens.length < 2 || tokens.length > 3) return null
  if (tokens.some((token) => token.length < 2 || !/^[A-Za-z]+$/.test(token))) return null
  if (tokens.some((token) => GENERIC_RECIPIENT_TOKENS.has(token.toLowerCase()))) return null

  return tokens.map(toTitleCase).join(" ")
}
