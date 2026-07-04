const rawSiteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXTAUTH_URL ||
  "https://draft-ai-ashen.vercel.app"

/** Absolute site origin with any trailing slash removed. */
export const siteUrl = rawSiteUrl.replace(/\/+$/, "")

export const siteConfig = {
  name: "Draft AI",
  tagline: "Outreach Studio",
  description:
    "Draft AI turns each X and LinkedIn post into a personalized outreach message, tailored to your resume, so your cold reach-outs actually get replies.",
  url: siteUrl,
}
