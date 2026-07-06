import type { Metadata } from "next"
import { Suspense } from "react"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Authoritative auth check. The proxy does an optimistic cookie check to
  // avoid a flash of protected content; this validates the session against
  // the database (Prisma adapter) as the real gate.
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect("/api/auth/signin?callbackUrl=/dashboard")
  }

  return <Suspense fallback={null}>{children}</Suspense>
}
