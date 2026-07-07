/** Cal.com demo booking URL with optional tier query param. */
export function getCalDemoUrl(tier?: string): string {
  const base =
    process.env.NEXT_PUBLIC_CAL_DEMO_URL ||
    "https://cal.com/draft-ai/enterprise-demo"

  if (!tier) return base

  const url = new URL(base)
  url.searchParams.set("tier", tier)
  return url.toString()
}
