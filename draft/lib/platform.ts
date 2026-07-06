export type FeedPlatformId = "X" | "LINKEDIN"

export function getFeedPlatformFromHostname(hostname: string): FeedPlatformId | null {
  if (hostname.includes("x.com") || hostname.includes("twitter.com")) return "X"
  if (hostname.includes("linkedin.com")) return "LINKEDIN"
  return null
}

export function getLinkedInProfilePublicId(pathname: string): string | null {
  const match = pathname.match(/\/in\/([^/?#]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

export function buildLinkedInProfilePostId(publicId: string): string {
  return `linkedin:profile:${publicId}`
}
