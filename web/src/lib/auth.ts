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
          scope: "openid email profile https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly",
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
      // Preserve explicit relative callback URLs (e.g. /extension/connect?state=...)
      if (url.startsWith("/")) return `${baseUrl}${url}`
      // Preserve same-origin absolute URLs
      if (new URL(url).origin === baseUrl) return url
      // Default landing spot after sign-in is the dashboard
      return `${baseUrl}/dashboard`
    },
  },
  pages: {
    signIn: "/",
  },
}
