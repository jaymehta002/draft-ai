import { test, expect } from "@playwright/test"
import { buildDraftSystemPrompt } from "@/lib/draft-prompt"

test.describe("draft prompt variants", () => {
  test("includes industry override when industryTag is set", () => {
    const prompt = buildDraftSystemPrompt(
      { fullName: "Alex" },
      { text: "We're hiring engineers" },
      { outreachTone: "warm" },
      "software-engineering"
    )

    expect(prompt).toContain("warm, friendly, and conversational")
    expect(prompt).toContain("Reference specific stack")
    expect(prompt).toContain("Industry-specific guidance")
  })

  test("respects tone override for A/B variants", () => {
    const prompt = buildDraftSystemPrompt(
      { fullName: "Alex" },
      { text: "We're hiring" },
      { outreachTone: "direct" }
    )

    expect(prompt).toContain("direct and concise")
  })
})
