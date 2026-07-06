import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Terms of Service | Draft AI",
  description: "Terms of Service for Draft AI web app and Chrome extension.",
}

const sections = [
  {
    title: "Acceptance of Terms",
    body: [
      "By using the Draft AI web application and Chrome extension, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the service.",
    ],
  },
  {
    title: "Description of Service",
    body: [
      "Draft AI is a tool designed to help users generate and manage outreach drafts for recruiting or networking purposes. It integrates with platforms like X and LinkedIn and uses AI to personalize messages based on user profiles.",
      "We reserve the right to modify, suspend, or discontinue any part of the service at any time without notice.",
    ],
  },
  {
    title: "User Responsibilities",
    body: [
      "You must provide accurate information when setting up your profile.",
      "You are responsible for the content of the messages you send using Draft AI. Do not use the service to send spam, harassing messages, or any content that violates the terms of the platforms you are using (e.g., X, LinkedIn).",
      "You are responsible for maintaining the security of your account and connected services.",
    ],
  },
  {
    title: "Prohibited Uses",
    body: [
      "You may not use Draft AI for any illegal or unauthorized purpose.",
      "You may not attempt to reverse engineer, decompile, or otherwise extract the source code of the web app or Chrome extension.",
      "You may not use automated scripts or bots to interact with the service beyond the provided extension features.",
    ],
  },
  {
    title: "Intellectual Property",
    body: [
      "The Draft AI service, including its original content, features, and functionality, is owned by Draft AI and is protected by international copyright, trademark, and other intellectual property laws.",
      "You retain ownership of the data and profile information you provide to Draft AI.",
    ],
  },
  {
    title: "Limitation of Liability",
    body: [
      "Draft AI is provided on an \"as is\" and \"as available\" basis. We make no warranties regarding the reliability, accuracy, or availability of the service.",
      "In no event shall Draft AI be liable for any indirect, incidental, special, consequential or punitive damages resulting from your use of or inability to use the service.",
    ],
  },
  {
    title: "Third-Party Services",
    body: [
      "Draft AI relies on third-party services like OpenAI for text generation and Google for authentication and email sending. Your use of these features is also subject to the terms and policies of those third-party providers.",
    ],
  },
  {
    title: "Changes to Terms",
    body: [
      "We may update these Terms of Service periodically. We will notify you of any changes by posting the new Terms on this page. Your continued use of the service after such changes constitutes acceptance of the new Terms.",
    ],
  },
  {
    title: "Contact Information",
    body: [
      "If you have any questions about these Terms, please contact us.",
    ],
  },
]

export default function TermsOfServicePage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-10">
          <p className="mb-3 text-sm font-medium text-muted-foreground">
            Draft AI
          </p>
          <h1 className="font-serif text-4xl tracking-tight sm:text-5xl">
            Terms of Service
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">
            Effective date: July 6, 2026. Please read these Terms of Service
            carefully before using the Draft AI web app and Chrome extension.
          </p>
          <div className="mt-6">
            <Link
              href="/"
              className="text-sm font-medium text-foreground underline underline-offset-4 transition-colors duration-200 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Back to Draft AI
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8 lg:p-10">
          <div className="space-y-10">
            {sections.map((section) => (
              <section key={section.title}>
                <h2 className="font-serif text-2xl tracking-tight">
                  {section.title}
                </h2>
                <div className="mt-4 space-y-4 text-sm leading-7 text-muted-foreground sm:text-base">
                  {section.body.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
