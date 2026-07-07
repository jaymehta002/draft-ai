import { test, expect } from "@playwright/test"
import { computeStreakForTest } from "@/lib/engagement"
import { recommendTone } from "@/lib/tone-recommendation"
import { getPipelineColumnForOutreach, isFollowUpEligible } from "@/lib/pipeline"

test.describe("engagement", () => {
  test("streak increments on new calendar day within 48h", () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const result = computeStreakForTest(yesterday, 3, 5, new Date())
    expect(result.currentStreak).toBe(4)
    expect(result.longestStreak).toBe(5)
  })

  test("streak resets after 48h gap", () => {
    const threeDaysAgo = new Date(Date.now() - 72 * 60 * 60 * 1000)
    const result = computeStreakForTest(threeDaysAgo, 5, 5, new Date())
    expect(result.currentStreak).toBe(1)
  })

  test("same calendar day does not increment streak", () => {
    const now = new Date()
    const result = computeStreakForTest(now, 4, 4, now)
    expect(result.currentStreak).toBe(4)
  })
})

test.describe("tone-recommendation", () => {
  test("recommends high-performing tone when data sufficient", () => {
    const rec = recommendTone(
      {
        totalSent: 20,
        totalReplied: 6,
        replyRate: 30,
        replyRate7d: 30,
        repliedThisWeek: 2,
        byChannel: { EMAIL: { sent: 10, replied: 3, rate: 30 }, DM: { sent: 10, replied: 3, rate: 30 } },
        byPlatform: {},
        byTone: { warm: { sent: 10, replied: 5, rate: 50 }, professional: { sent: 10, replied: 1, rate: 10 } },
        toneInsights: [
          { tone: "warm", sent: 10, replied: 5, rate: 50, message: "" },
          { tone: "professional", sent: 10, replied: 1, rate: 10, message: "" },
        ],
      },
      "professional"
    )
    expect(rec.tone).toBe("warm")
    expect(rec.confidence).not.toBe("low")
  })
})

test.describe("pipeline", () => {
  test("assigns awaiting column after 3 days", () => {
    const sentAt = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
    expect(getPipelineColumnForOutreach(sentAt, null)).toBe("awaiting")
  })

  test("follow-up bump eligible at 4 days", () => {
    const sentAt = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
    const result = isFollowUpEligible(sentAt, null)
    expect(result.eligible).toBe(true)
    expect(result.followUpType).toBe("bump")
  })
})
