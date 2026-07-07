import type { Metadata } from "next"
import { Inter, Merriweather, JetBrains_Mono } from "next/font/google"
import "./globals.css"
import { Providers } from "@/components/Providers"
import { siteConfig, siteUrl } from "@/lib/site"

const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
})
const fontSerif = Merriweather({
  subsets: ["latin"],
  variable: "--font-serif",
})
const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Draft AI — Personalized outreach for X and LinkedIn",
    template: "%s · Draft AI",
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  openGraph: {
    type: "website",
    siteName: siteConfig.name,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${fontSans.variable} ${fontSerif.variable} ${fontMono.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
