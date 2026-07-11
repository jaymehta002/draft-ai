import type { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { persistGoogleAccountOnSignIn } from "@/lib/google-account-tokens"
import { prisma } from "@/lib/prisma"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          include_granted_scopes: "true",
          scope: "openid email profile",
        },
      },
    }),
  ],
  events: {
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.id) {
        await persistGoogleAccountOnSignIn(user.id, account)
      }
    },
  },
  callbacks: {
    async session({ session, user }) {
      if (session?.user) {
        session.user.id = user.id
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      // Relative paths are safe, except protocol-relative ("//evil.com") which
      // browsers resolve as an absolute URL to a different origin.
      if (url.startsWith("/") && !url.startsWith("//")) {
        return `${baseUrl}${url}`
      }
      // Compare parsed origins (not raw strings) so a trailing slash on
      // baseUrl, or an unparseable url, can't produce a false match or throw.
      try {
        const target = new URL(url)
        const base = new URL(baseUrl)
        if (target.origin === base.origin) {
          return url
        }
      } catch {
        // Not a valid absolute URL — fall through to the safe default.
      }
      // Default landing spot after sign-in is the dashboard
      return `${baseUrl}/dashboard`
    },
  },
  pages: {
    signIn: "/",
  },
}
