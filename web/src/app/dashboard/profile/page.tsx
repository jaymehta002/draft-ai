import { FadeIn } from "@/components/motion"
import { getDashboardData } from "@/app/actions"
import { ProfilePageClient } from "@/app/dashboard/profile/profile-page-client"

export default async function ProfilePage() {
  const dashboard = await getDashboardData()
  const profile = dashboard?.candidateProfile

  if (!profile) {
    return (
      <FadeIn className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        <p className="text-sm text-muted-foreground">Profile not available.</p>
      </FadeIn>
    )
  }

  return (
    <FadeIn className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <ProfilePageClient initialProfile={profile} />
    </FadeIn>
  )
}
