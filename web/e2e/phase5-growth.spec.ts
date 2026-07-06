import { test, expect } from "@playwright/test"
import { classifyIndustry } from "@/lib/industry-classifier"
import { computeReplyRate } from "@/lib/reply-metrics"

test.describe("industry-classifier", () => {
  test("detects software engineering from post text", () => {
    expect(
      classifyIndustry({
        postText: "Hiring senior TypeScript backend engineers for our API team",
      })
    ).toBe("software-engineering")
  })

  test("detects product management from desired roles", () => {
    expect(
      classifyIndustry({
        desiredRoles: "Product Manager, Senior PM",
      })
    ).toBe("product-management")
  })

  test("returns general when no signals", () => {
    expect(classifyIndustry({})).toBe("general")
  })
})

test.describe("reply-metrics", () => {
  test("computeReplyRate returns percentage with one decimal", () => {
    expect(computeReplyRate(10, 3)).toBe(30)
    expect(computeReplyRate(3, 1)).toBe(33.3)
    expect(computeReplyRate(0, 0)).toBe(0)
  })
})
