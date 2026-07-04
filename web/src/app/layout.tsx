import type { Metadata } from "next"
import { Inter, Merriweather, JetBrains_Mono } from "next/font/google"
import "./globals.css"
import { Providers } from "@/components/Providers"

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
  title: "Draft AI",
  description: "AI-powered outreach drafts for job seekers on X and LinkedIn",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${fontSans.variable} ${fontSerif.variable} ${fontMono.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
