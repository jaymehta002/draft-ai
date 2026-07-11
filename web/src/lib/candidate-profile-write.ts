import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { PROFILE_CONFLICT_ERROR } from "@/lib/candidate-profile"

export type CandidateProfileWritePayload = Omit<
  Prisma.CandidateProfileUncheckedCreateInput,
  "userId" | "version"
>

/**
 * Optimistic-concurrency write: the caller must already know whether a
 * profile row exists (a prior read) so this does a single atomic
 * create-or-conditional-update rather than re-checking existence itself,
 * which would reopen the same race it's meant to close.
 */
export async function writeCandidateProfileWithVersion(
  userId: string,
  payload: CandidateProfileWritePayload,
  options: { profileExists: boolean; expectedVersion: number }
): Promise<{ version: number }> {
  if (!options.profileExists) {
    try {
      await prisma.candidateProfile.create({
        data: { userId, ...payload, version: 0 },
      })
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        // Another request created the profile between our existence check
        // and this insert.
        throw new Error(PROFILE_CONFLICT_ERROR)
      }
      throw err
    }
    return { version: 0 }
  }

  const updated = await prisma.candidateProfile.updateMany({
    where: { userId, version: options.expectedVersion },
    data: { ...payload, version: { increment: 1 } },
  })

  if (updated.count === 0) {
    throw new Error(PROFILE_CONFLICT_ERROR)
  }

  return { version: options.expectedVersion + 1 }
}
