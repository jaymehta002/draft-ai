import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Privacy Policy | Draft AI",
  description: "Privacy Policy for Draft AI web app and Chrome extension.",
}

const sections = [
  {
    title: "Information We Collect",
    body: [
      "Draft AI collects information you choose to provide so it can create and manage outreach drafts. This may include your name, email address, Google account details used for authentication, candidate profile information, resume content, work experience, projects, certifications, links to your LinkedIn, GitHub, or portfolio, and preferences related to your job search.",
      "When you use the extension on X or LinkedIn, Draft AI may process the text of a post, the poster's public profile details, post URLs, detected contact details such as an email address in a post, generated outreach drafts, and records of whether an outreach message was copied or sent.",
    ],
  },
  {
    title: "How We Use Information",
    body: [
      "We use your information to authenticate your account, generate personalized email or DM drafts, let you edit and send those drafts, save your outreach history, prevent duplicate outreach on the same post, and show analytics inside the dashboard.",
      "Your profile and resume data are used to tailor outreach content so messages are more relevant to your experience, role preferences, and skills.",
    ],
  },
  {
    title: "AI and Third-Party Services",
    body: [
      "Draft AI uses third-party services to operate core features. Outreach generation may use OpenAI to create draft content from the post context and your candidate profile. If you choose to send an email, Draft AI uses your Google account and the Gmail API to send that email on your behalf.",
      "Draft AI may also use infrastructure providers such as hosting, database, and authentication services to run the web app and extension backend. These providers process data only as needed to deliver the service.",
    ],
  },
  {
    title: "Chrome Extension Permissions",
    body: [
      "The extension requests permissions including storage, active tab access, clipboard write, tabs, and side panel access. These permissions are used to store your authenticated state and draft data, inject the Draft button into supported sites, copy DM text to your clipboard, open the side panel editor, and associate drafts with the current tab or post.",
      "The extension is intended to operate on supported pages on X and LinkedIn and to connect to the Draft AI web app for authentication and backend requests.",
    ],
  },
  {
    title: "Data Sharing",
    body: [
      "We do not sell your personal information. We only share data with third-party service providers when necessary to deliver the product, such as AI generation, account authentication, email sending, hosting, and database operations.",
      "We may disclose information if required by law, regulation, or a valid legal process, or when necessary to protect the security, rights, or integrity of Draft AI and its users.",
    ],
  },
  {
    title: "Data Retention",
    body: [
      "We retain your profile information, drafts, and outreach records for as long as your account remains active or as needed to provide the service. You can request deletion of your account data, subject to any legal or operational retention requirements.",
    ],
  },
  {
    title: "Your Choices",
    body: [
      "You can update your candidate profile from the Draft AI dashboard, disconnect the extension, stop using the extension at any time, and choose whether or not to send or copy a generated draft. You may also revoke Google account access through your Google account settings.",
    ],
  },
  {
    title: "Security",
    body: [
      "We take reasonable steps to protect user information, but no method of transmission or storage is completely secure. You are responsible for keeping access to your browser profile, email account, and connected services secure.",
    ],
  },
  {
    title: "Children's Privacy",
    body: [
      "Draft AI is not intended for children under 13, and we do not knowingly collect personal information from children.",
    ],
  },
  {
    title: "Changes to This Policy",
    body: [
      "We may update this Privacy Policy from time to time. When we do, we will update the effective date on this page. Continued use of Draft AI after changes become effective means you accept the updated policy.",
    ],
  },
  {
    title: "Contact",
    body: [
      "If you have questions about this Privacy Policy or your data, please contact the Draft AI team through the contact details provided in the app, website, or extension listing.",
    ],
  },
]

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-4xl px-6 py-16 sm:px-8">
        <div className="mb-10">
          <p className="mb-3 text-sm font-medium text-muted-foreground">
            Draft AI
          </p>
          <h1 className="text-4xl font-semibold tracking-tight">
            Privacy Policy
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">
            Effective date: July 3, 2026. This Privacy Policy explains how Draft
            AI collects, uses, and shares information when you use the Draft AI
            web app and Chrome extension.
          </p>
          <div className="mt-6">
            <Link
              href="/"
              className="text-sm font-medium text-foreground underline underline-offset-4"
            >
              Back to Draft AI
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
          <div className="space-y-10">
            {sections.map((section) => (
              <section key={section.title}>
                <h2 className="text-xl font-semibold tracking-tight">
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
