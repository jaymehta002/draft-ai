import { test, expect } from "@playwright/test"
import { prisma } from "@/lib/prisma"
import { PROFILE_CONFLICT_ERROR } from "@/lib/candidate-profile"
import { writeCandidateProfileWithVersion } from "@/lib/candidate-profile-write"

test.describe("candidate profile optimistic concurrency", () => {
  test("two concurrent writes at the same version: exactly one wins, the other conflicts", async () => {
    const user = await prisma.user.create({
      data: { email: `concurrency-test-${Date.now()}@example.invalid` },
    })

    try {
      await prisma.candidateProfile.create({
        data: { userId: user.id, fullName: "Original Name", version: 0 },
      })

      const results = await Promise.allSettled([
        writeCandidateProfileWithVersion(
          user.id,
          { fullName: "Writer A" },
          { profileExists: true, expectedVersion: 0 }
        ),
        writeCandidateProfileWithVersion(
          user.id,
          { fullName: "Writer B" },
          { profileExists: true, expectedVersion: 0 }
        ),
      ])

      const fulfilled = results.filter((r) => r.status === "fulfilled")
      const rejected = results.filter((r) => r.status === "rejected")

      expect(fulfilled).toHaveLength(1)
      expect(rejected).toHaveLength(1)
      expect((fulfilled[0] as PromiseFulfilledResult<{ version: number }>).value.version).toBe(1)
      expect((rejected[0] as PromiseRejectedResult).reason.message).toBe(PROFILE_CONFLICT_ERROR)

      const final = await prisma.candidateProfile.findUniqueOrThrow({ where: { userId: user.id } })
      expect(final.version).toBe(1)
      expect(["Writer A", "Writer B"]).toContain(final.fullName)
    } finally {
      await prisma.user.delete({ where: { id: user.id } })
    }
  })

  test("stale version is rejected even when no concurrent write is in flight", async () => {
    const user = await prisma.user.create({
      data: { email: `concurrency-test-stale-${Date.now()}@example.invalid` },
    })

    try {
      await prisma.candidateProfile.create({
        data: { userId: user.id, fullName: "Original Name", version: 0 },
      })

      await writeCandidateProfileWithVersion(
        user.id,
        { fullName: "Updated Once" },
        { profileExists: true, expectedVersion: 0 }
      )

      await expect(
        writeCandidateProfileWithVersion(
          user.id,
          { fullName: "Late Writer" },
          { profileExists: true, expectedVersion: 0 }
        )
      ).rejects.toThrow(PROFILE_CONFLICT_ERROR)

      const final = await prisma.candidateProfile.findUniqueOrThrow({ where: { userId: user.id } })
      expect(final.fullName).toBe("Updated Once")
      expect(final.version).toBe(1)
    } finally {
      await prisma.user.delete({ where: { id: user.id } })
    }
  })
})
