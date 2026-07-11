import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"

// Guards against static optimization/caching regardless of future changes to
// this layout — see the identical note in dashboard/layout.tsx.
export const dynamic = "force-dynamic"

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect("/?signin=required")
  }

  return children
}
