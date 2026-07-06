import { test, expect } from "@playwright/test"
import {
  clampYear,
  coerceSelectYear,
  getYearOptions,
  normalizeWorkExperienceEntry,
  parseDateRange,
  parseLegacyWorkLine,
  parseMonthYear,
} from "../src/lib/work-experience-dates"
import { mapExtractionToProfile, parseResumeExtraction } from "../src/lib/resume-extract"

test.describe("work-experience-dates", () => {
  test("parses named month and year", () => {
    const result = parseMonthYear("Jun 2020")
    expect(result.month).toBe("06")
    expect(result.year).toBe("2020")
  })

  test("parses date ranges with Present", () => {
    const result = parseDateRange("Jan 2020 – Present")
    expect(result.start.year).toBe("2020")
    expect(result.start.month).toBe("01")
    expect(result.isCurrent).toBe(true)
  })

  test("parses year range 2018 – 2021", () => {
    const result = parseDateRange("2018 – 2021")
    expect(result.start.year).toBe("2018")
    expect(result.end.year).toBe("2021")
    expect(result.isCurrent).toBe(false)
  })

  test("clamps invalid years", () => {
    expect(clampYear("1901")).toBeNull()
    expect(clampYear("2019")).toBe("2019")
  })

  test("coerces malformed select year", () => {
    const options = getYearOptions()
    expect(coerceSelectYear("2019-2020", options)).toBe("2019")
    expect(coerceSelectYear("bogus", options)).toBe("")
  })

  test("getYearOptions returns newest first", () => {
    const years = getYearOptions()
    const current = new Date().getFullYear()
    expect(years[0]).toBe(String(current))
    expect(years).toHaveLength(51)
  })
})

test.describe("parseLegacyWorkLine", () => {
  test("parses Title at Company (dates)", () => {
    const entry = parseLegacyWorkLine("Senior Engineer at Acme Corp (Jan 2020 – Present)")
    expect(entry.title).toBe("Senior Engineer")
    expect(entry.company).toBe("Acme Corp")
    expect(entry.description).toBe("")
    expect(entry.isCurrent).toBe(true)
    expect(entry.joinYear).toBe("2020")
  })

  test("parses Company — Title — description", () => {
    const entry = parseLegacyWorkLine(
      "Acme Corp — Staff Engineer — Built payment APIs and led on-call rotation."
    )
    expect(entry.company).toBe("Acme Corp")
    expect(entry.title).toBe("Staff Engineer")
    expect(entry.description).toBe("Built payment APIs and led on-call rotation.")
    expect(entry.description).not.toBe(entry.company)
  })
})

test.describe("resume-extract", () => {
  test("parses structured work_experience from API response", () => {
    const parsed = parseResumeExtraction({
      name: "Jane Doe",
      work_experience: [
        {
          title: "Senior Engineer",
          company: "Acme",
          description: "Shipped features",
          start_month: "03",
          start_year: "2021",
          end_month: null,
          end_year: null,
          is_current: true,
        },
        {
          title: "Engineer",
          company: "Beta Inc",
          description: "Maintained services",
          start_month: "01",
          start_year: "2018",
          end_month: "12",
          end_year: "2020",
          is_current: false,
        },
      ],
      education: [],
      skills: [],
      certifications: [],
      confidence: "high",
    })

    expect(parsed).not.toBeNull()
    expect(parsed!.work_experience).toHaveLength(2)
  })

  test("maps structured work_experience to distinct fields", () => {
    const parsed = parseResumeExtraction({
      name: "Jane Doe",
      work_experience: [
        {
          title: "Senior Engineer",
          company: "Acme",
          description: "Shipped features",
          start_month: "03",
          start_year: "2021",
          end_month: null,
          end_year: null,
          is_current: true,
        },
      ],
      education: [],
      skills: [],
      certifications: [],
      confidence: "high",
    })!

    const { profile } = mapExtractionToProfile(parsed)
    const role = profile.workExperiences![0]

    expect(role.title).toBe("Senior Engineer")
    expect(role.company).toBe("Acme")
    expect(role.description).toBe("Shipped features")
    expect(role.title).not.toBe(role.description)
    expect(role.company).not.toBe(role.description)
    expect(role.joinYear).toBe("2021")
    expect(role.isCurrent).toBe(true)
  })

  test("legacy past_companies does not duplicate blob into all fields", () => {
    const line =
      "Beta Inc — Software Engineer — Developed internal tools and automated deployments."
    const parsed = parseResumeExtraction({
      name: "John",
      past_companies: [line],
      education: [],
      skills: [],
      certifications: [],
      confidence: "medium",
    })!

    const { profile } = mapExtractionToProfile(parsed)
    const role = profile.workExperiences![0]

    expect(role.company).toBe("Beta Inc")
    expect(role.title).toBe("Software Engineer")
    expect(role.description).toBe("Developed internal tools and automated deployments.")
    expect(role.description).not.toBe(line)
  })

  test("sorts multiple roles with current first", () => {
    const parsed = parseResumeExtraction({
      work_experience: [
        {
          title: "Past Role",
          company: "Old Co",
          description: "Did work",
          start_month: "01",
          start_year: "2018",
          end_month: "06",
          end_year: "2020",
          is_current: false,
        },
        {
          title: "Current Role",
          company: "New Co",
          description: "Doing work",
          start_month: "07",
          start_year: "2020",
          end_month: null,
          end_year: null,
          is_current: true,
        },
      ],
      education: [],
      skills: [],
      certifications: [],
      confidence: "high",
    })!

    const { profile } = mapExtractionToProfile(parsed)
    expect(profile.workExperiences![0].title).toBe("Current Role")
    expect(profile.workExperiences![1].title).toBe("Past Role")
  })
})

test.describe("normalizeWorkExperienceEntry", () => {
  test("normalizes month and year fields", () => {
    const entry = normalizeWorkExperienceEntry(
      {
        title: "Dev",
        company: "Co",
        description: "Work",
        start_month: "6",
        start_year: "2019",
        end_month: null,
        end_year: null,
        is_current: true,
      },
      0
    )
    expect(entry.joinMonth).toBe("06")
    expect(entry.joinYear).toBe("2019")
    expect(entry.isCurrent).toBe(true)
  })
})
