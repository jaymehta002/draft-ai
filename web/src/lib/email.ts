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

const candidateCutoffs = (value: string) => {
  const cutoffs = new Set<number>([value.length])

  for (let index = 1; index < value.length; index += 1) {
    if (isUpper(value[index]) && isLower(value[index - 1])) {
      cutoffs.add(index)
    }
  }

  return [...cutoffs].sort((a, b) => b - a)
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

      for (const cutoff of candidateCutoffs(domainPart)) {
        const candidate = normalizeEmail(`${strippedLocalPart}@${domainPart.slice(0, cutoff)}`)
        if (isValidEmailAddress(candidate)) {
          return candidate
        }
      }
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
