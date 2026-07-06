import type { WorkExperienceEntry } from "@/lib/candidate-profile"
import { emptyWorkExperience } from "@/lib/candidate-profile"

const MONTH_NAMES: Record<string, string> = {
  jan: "01",
  january: "01",
  feb: "02",
  february: "02",
  mar: "03",
  march: "03",
  apr: "04",
  april: "04",
  may: "05",
  jun: "06",
  june: "06",
  jul: "07",
  july: "07",
  aug: "08",
  august: "08",
  sep: "09",
  sept: "09",
  september: "09",
  oct: "10",
  october: "10",
  nov: "11",
  november: "11",
  dec: "12",
  december: "12",
}

export const YEAR_RANGE_BACK = 50

export function getYearOptions(): string[] {
  const currentYear = new Date().getFullYear()
  return Array.from({ length: YEAR_RANGE_BACK + 1 }, (_, i) => String(currentYear - i))
}

export function clampYear(year: string | number | null | undefined): string | null {
  if (year == null || year === "") return null
  const raw = String(year).trim()
  const match = raw.match(/\b(19|20)\d{2}\b/)
  if (!match) return null
  const y = parseInt(match[0], 10)
  const currentYear = new Date().getFullYear()
  if (y < currentYear - YEAR_RANGE_BACK || y > currentYear + 1) return null
  return String(y)
}

export function normalizeMonth(month: string | null | undefined): string | null {
  if (month == null || month === "") return null
  const raw = String(month).trim().toLowerCase()
  if (/^\d{1,2}$/.test(raw)) {
    const n = parseInt(raw, 10)
    if (n >= 1 && n <= 12) return String(n).padStart(2, "0")
    return null
  }
  const fromName = MONTH_NAMES[raw.replace(/\./g, "")]
  return fromName ?? null
}

export type ParsedMonthYear = { month: string | null; year: string | null }

export function parseMonthYear(input: string | null | undefined): ParsedMonthYear {
  if (!input?.trim()) return { month: null, year: null }
  const text = input.trim()

  if (/^(present|current|now)$/i.test(text)) {
    return { month: null, year: null }
  }

  // "Jun 2020", "June 2020"
  const namedMonth = text.match(
    /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+((?:19|20)\d{2})\b/i
  )
  if (namedMonth) {
    return {
      month: normalizeMonth(namedMonth[1]),
      year: clampYear(namedMonth[2]),
    }
  }

  // "2020-06" or "2020/06"
  const iso = text.match(/\b((?:19|20)\d{2})[-/](\d{1,2})\b/)
  if (iso) {
    return {
      month: normalizeMonth(iso[2]),
      year: clampYear(iso[1]),
    }
  }

  // "06/2020" or "06-2020"
  const us = text.match(/\b(\d{1,2})[-/]((?:19|20)\d{2})\b/)
  if (us) {
    return {
      month: normalizeMonth(us[1]),
      year: clampYear(us[2]),
    }
  }

  // bare year
  const yearOnly = text.match(/\b((?:19|20)\d{2})\b/)
  if (yearOnly) {
    return { month: null, year: clampYear(yearOnly[1]) }
  }

  return { month: null, year: null }
}

export function parseDateRange(input: string): {
  start: ParsedMonthYear
  end: ParsedMonthYear
  isCurrent: boolean
} {
  const text = input.trim()
  if (/present|current|now/i.test(text) && !/\d{4}/.test(text)) {
    return {
      start: { month: null, year: null },
      end: { month: null, year: null },
      isCurrent: true,
    }
  }

  const parts = text.split(/\s*(?:–|—|-|to)\s*/i).map((p) => p.trim()).filter(Boolean)
  if (parts.length >= 2) {
    const endPart = parts[parts.length - 1]
    const isCurrent = /^(present|current|now)$/i.test(endPart)
    return {
      start: parseMonthYear(parts[0]),
      end: isCurrent ? { month: null, year: null } : parseMonthYear(endPart),
      isCurrent,
    }
  }

  const single = parseMonthYear(text)
  return { start: single, end: { month: null, year: null }, isCurrent: false }
}

export function coerceSelectYear(
  year: string,
  options: string[] = getYearOptions()
): string {
  if (!year) return ""
  if (options.includes(year)) return year
  const normalized = clampYear(year) ?? parseMonthYear(year).year
  if (normalized && options.includes(normalized)) return normalized
  return ""
}

export type ExtractedWorkRole = {
  title?: string | null
  company?: string | null
  description?: string | null
  start_month?: string | null
  start_year?: string | null
  end_month?: string | null
  end_year?: string | null
  is_current?: boolean | null
}

export function normalizeWorkExperienceEntry(
  role: ExtractedWorkRole,
  index: number
): WorkExperienceEntry {
  const isCurrent = Boolean(role.is_current)
  const joinMonth = normalizeMonth(role.start_month) ?? ""
  const joinYear = clampYear(role.start_year) ?? ""
  const endMonth = isCurrent ? "" : normalizeMonth(role.end_month) ?? ""
  const endYear = isCurrent ? "" : clampYear(role.end_year) ?? ""

  return {
    ...emptyWorkExperience(isCurrent && index === 0),
    title: (role.title ?? "").trim(),
    company: (role.company ?? "").trim(),
    description: (role.description ?? "").trim(),
    joinMonth,
    joinYear,
    endMonth,
    endYear,
    isCurrent,
  }
}

export function sortWorkExperiences(entries: WorkExperienceEntry[]): WorkExperienceEntry[] {
  return [...entries].sort((a, b) => {
    if (a.isCurrent !== b.isCurrent) return a.isCurrent ? -1 : 1
    const aEnd = a.isCurrent ? 9999 : parseInt(a.endYear || a.joinYear || "0", 10)
    const bEnd = b.isCurrent ? 9999 : parseInt(b.endYear || b.joinYear || "0", 10)
    if (bEnd !== aEnd) return bEnd - aEnd
    const aStart = parseInt(a.joinYear || "0", 10)
    const bStart = parseInt(b.joinYear || "0", 10)
    return bStart - aStart
  })
}

/** Heuristic parser for legacy `past_companies` string lines */
export function parseLegacyWorkLine(line: string): Omit<WorkExperienceEntry, "id"> {
  const trimmed = line.trim()
  const base = emptyWorkExperience(false)

  // Title at Company (Jan 2020 – Present)
  const atMatch = trimmed.match(
    /^(.+?)\s+at\s+(.+?)(?:\s*[(\[](.+?)[)\]])?$/i
  )
  if (atMatch) {
    const title = atMatch[1].trim()
    const company = atMatch[2].trim()
    const datePart = atMatch[3]?.trim() ?? ""
    const range = datePart ? parseDateRange(datePart) : null
    return {
      ...base,
      title,
      company,
      description: "",
      joinMonth: range?.start.month ?? "",
      joinYear: range?.start.year ?? "",
      endMonth: range?.isCurrent ? "" : range?.end.month ?? "",
      endYear: range?.isCurrent ? "" : range?.end.year ?? "",
      isCurrent: range?.isCurrent ?? false,
    }
  }

  // Company — Title — description (em dash segments)
  const segments = trimmed.split(/\s*[—–]\s*/).map((s) => s.trim()).filter(Boolean)
  if (segments.length >= 2) {
    const [seg0, seg1, ...rest] = segments
    const dateInSeg1 = parseDateRange(seg1)
    const hasDateInSeg1 = Boolean(dateInSeg1.start.year || dateInSeg1.isCurrent)

    if (hasDateInSeg1) {
      return {
        ...base,
        company: seg0,
        title: "",
        description: rest.join(" — "),
        joinMonth: dateInSeg1.start.month ?? "",
        joinYear: dateInSeg1.start.year ?? "",
        endMonth: dateInSeg1.isCurrent ? "" : dateInSeg1.end.month ?? "",
        endYear: dateInSeg1.isCurrent ? "" : dateInSeg1.end.year ?? "",
        isCurrent: dateInSeg1.isCurrent,
      }
    }

    return {
      ...base,
      company: seg0,
      title: seg1,
      description: rest.join(" — "),
    }
  }

  // Title, Company | 2019-2022
  const pipeMatch = trimmed.match(/^(.+?),\s*(.+?)(?:\s*[|]\s*(.+))?$/)
  if (pipeMatch) {
    const range = pipeMatch[3] ? parseDateRange(pipeMatch[3]) : null
    return {
      ...base,
      title: pipeMatch[1].trim(),
      company: pipeMatch[2].trim(),
      description: "",
      joinMonth: range?.start.month ?? "",
      joinYear: range?.start.year ?? "",
      endMonth: range?.isCurrent ? "" : range?.end.month ?? "",
      endYear: range?.isCurrent ? "" : range?.end.year ?? "",
      isCurrent: range?.isCurrent ?? false,
    }
  }

  // Fallback: treat as company name only
  return {
    ...base,
    company: trimmed,
    title: "",
    description: "",
  }
}
