import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { siteConfig } from "@/lib/site"
import { MarketingHome } from "@/components/marketing/marketing-home"

const title = "Draft AI — Personalized outreach for X and LinkedIn"

export const metadata: Metadata = {
  title: { absolute: title },
  description: siteConfig.description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    title,
    description: siteConfig.description,
    siteName: siteConfig.name,
  },
  twitter: {
    card: "summary_large_image",
    title,
    description: siteConfig.description,
  },
}

export default async function HomePage() {
  const session = await getServerSession(authOptions)

  // Logged-in users have no reason to see the marketing page.
  if (session?.user) {
    redirect("/dashboard")
  }

  return <MarketingHome />
}
