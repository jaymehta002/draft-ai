import { getServerSession } from "next-auth/next"
import { createUploadthing, type FileRouter } from "uploadthing/next"
import { authOptions } from "@/lib/auth"

const f = createUploadthing()

export const uploadRouter = {
  resumeUploader: f({
    pdf: { maxFileSize: "8MB", maxFileCount: 1 },
    text: { maxFileSize: "2MB", maxFileCount: 1 },
  })
    .middleware(async () => {
      const session = await getServerSession(authOptions)

      if (!session?.user?.id) {
        throw new Error("Unauthorized")
      }

      return { userId: session.user.id }
    })
    .onUploadComplete(async ({ file, metadata }) => {
      return {
        uploadedBy: metadata.userId,
        storageKey: file.key,
        fileUrl: file.ufsUrl ?? file.url,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
      }
    }),
} satisfies FileRouter

export type OurFileRouter = typeof uploadRouter
