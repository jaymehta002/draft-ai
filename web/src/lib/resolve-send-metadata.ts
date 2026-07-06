import { prisma } from "@/lib/prisma"
import { buildSendMetadataFromDraft, buildSendMetadataFromProfile } from "@/lib/outreach-metadata"

export async function resolveOutreachSendFields(
  userId: string,
  draftId?: string | null,
  variantId?: string | null
) {
  if (!draftId) {
    const profile = await prisma.candidateProfile.findUnique({ where: { userId } })
    return {
      ...buildSendMetadataFromProfile(
        profile,
        "",
        profile?.desiredRoles ?? null,
        profile?.skills ?? null
      ),
      variantId: null as string | null,
    }
  }

  const draft = await prisma.postDraft.findFirst({
    where: { id: draftId, userId },
    include: {
      variants: variantId ? { where: { id: variantId } } : false,
    },
  })

  if (!draft) {
    const profile = await prisma.candidateProfile.findUnique({ where: { userId } })
    return {
      ...buildSendMetadataFromProfile(
        profile,
        "",
        profile?.desiredRoles ?? null,
        profile?.skills ?? null
      ),
      variantId: null as string | null,
    }
  }

  const profile = await prisma.candidateProfile.findUnique({ where: { userId } })
  const variant =
    variantId && Array.isArray(draft.variants) ? draft.variants[0] : null

  const meta = buildSendMetadataFromDraft(draft, profile, variant ?? null)

  if (variantId && variant) {
    await prisma.draftVariant.update({
      where: { id: variantId },
      data: { selectedAt: new Date() },
    })
  }

  return { ...meta, variantId: variant?.id ?? null }
}
