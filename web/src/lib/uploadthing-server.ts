import { UTApi } from "uploadthing/server"

export const utapi = new UTApi()

export async function resolveUploadThingFileUrl(
  storageKey?: string | null,
  fileUrl?: string | null
): Promise<string | null> {
  if (!storageKey && !fileUrl) return null

  const access = process.env.UPLOADTHING_FILE_ACL

  if (storageKey && access === "private") {
    const result = await utapi.generateSignedURL(storageKey, { expiresIn: 60 * 5 })
    return typeof result === "string" ? result : result?.ufsUrl ?? null
  }

  return fileUrl || null
}
