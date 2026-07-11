type ConnectableProfile = {
  onboardingComplete?: boolean
  fullName?: string | null
  skills?: string | null
} | null

export function canConnectExtension(profile: ConnectableProfile): boolean {
  if (!profile) return false
  if (profile.onboardingComplete) return true

  return Boolean(profile.fullName?.trim() && profile.skills?.trim())
}
