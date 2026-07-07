/** Static content for programmatic SEO landing + case-study pages. */

export type FaqItem = { q: string; a: string }

export type PersonaContent = {
  slug: string
  eyebrow: string
  title: string
  subtitle: string
  metaTitle: string
  metaDescription: string
  bullets: string[]
  faqs: FaqItem[]
}

export const PERSONAS: PersonaContent[] = [
  {
    slug: "software-engineers",
    eyebrow: "For software engineers",
    title: "LinkedIn outreach for software engineers that gets replies",
    subtitle:
      "Turn any hiring post or engineering leader's update into a tailored, resume-aware message in seconds — without sounding like a template.",
    metaTitle: "LinkedIn Outreach for Software Engineers",
    metaDescription:
      "Draft AI writes personalized LinkedIn and X outreach for software engineers, tuned to your resume and the role, so your cold messages actually get replies.",
    bullets: [
      "Reference the exact stack and problem in the post",
      "Pull relevant projects and impact from your resume automatically",
      "Match the tone hiring managers respond to",
      "Track reply rates so you can double down on what works",
    ],
    faqs: [
      {
        q: "How is this different from a generic cold message template?",
        a: "Draft AI reads the specific post and your resume, then writes a message that connects your experience to what the author actually cares about — not a fill-in-the-blank template.",
      },
      {
        q: "Does it work for both LinkedIn and X?",
        a: "Yes. The Chrome extension works on LinkedIn and X, generating outreach from any post or profile you're viewing.",
      },
      {
        q: "Will it help me get more replies?",
        a: "Personalized, relevant outreach consistently outperforms generic messages. Draft AI also tracks your reply rate so you can see what's landing.",
      },
    ],
  },
  {
    slug: "product-managers",
    eyebrow: "For product managers",
    title: "DM templates for PM job search — personalized, not copy-paste",
    subtitle:
      "Draft AI writes outreach that shows product judgment: it ties your shipped outcomes to the exact problem a team is hiring for.",
    metaTitle: "DM Templates for PM Job Search",
    metaDescription:
      "Draft AI generates personalized outreach for product managers, connecting your shipped outcomes to the roles you want, so your DMs get read and answered.",
    bullets: [
      "Lead with outcomes and metrics from your resume",
      "Speak to the product problem in the post",
      "Adjust tone from warm to direct in one click",
      "Follow up automatically when there's no reply",
    ],
    faqs: [
      {
        q: "Can I control the tone of the message?",
        a: "Yes — generate variants in professional, warm, direct, or formal tones and pick the one that fits the recipient.",
      },
      {
        q: "Does it handle follow-ups?",
        a: "Draft AI can draft follow-up bumps and closes for conversations that go quiet, so you never drop a promising lead.",
      },
      {
        q: "Is my resume data private?",
        a: "Your profile powers the drafts and is never shared. You can export or delete your data anytime from your account.",
      },
    ],
  },
  {
    slug: "career-changers",
    eyebrow: "For career changers",
    title: "Career change outreach that reframes your story",
    subtitle:
      "Breaking into a new field? Draft AI translates your transferable skills into language the hiring team recognizes.",
    metaTitle: "Career Change Outreach Messages",
    metaDescription:
      "Draft AI helps career changers write outreach that reframes transferable skills for a new field, so cold messages open real conversations.",
    bullets: [
      "Reframe past experience for the role you want",
      "Highlight transferable skills the team is looking for",
      "Sound confident without overclaiming",
      "Learn which framing gets the most replies",
    ],
    faqs: [
      {
        q: "I don't have direct experience — can this still help?",
        a: "That's exactly the case Draft AI is good at: it surfaces transferable skills and reframes your background so it maps to the new role.",
      },
      {
        q: "How long does a message take?",
        a: "A few seconds. Open a post, click generate, tweak if you want, and send.",
      },
      {
        q: "Do I need a credit card to try it?",
        a: "No. You can try a draft for free, and the Free plan includes a monthly allowance of drafts and emails.",
      },
    ],
  },
]

export function getPersona(slug: string): PersonaContent | undefined {
  return PERSONAS.find((p) => p.slug === slug)
}

export type StoryContent = {
  slug: string
  name: string
  role: string
  metaTitle: string
  metaDescription: string
  summary: string
  replyRateBefore: number
  replyRateAfter: number
  quote: string
  body: string[]
}

export const STORIES: StoryContent[] = [
  {
    slug: "priya-frontend-engineer",
    name: "Priya",
    role: "Frontend Engineer",
    metaTitle: "How Priya 3x'd her reply rate",
    metaDescription:
      "A frontend engineer went from a 6% to a 22% reply rate on cold outreach using Draft AI's personalized messages.",
    summary:
      "Priya was sending thoughtful but generic messages and hearing back from almost no one. Personalizing each message to the post and her resume changed the numbers overnight.",
    replyRateBefore: 6,
    replyRateAfter: 22,
    quote:
      "I stopped guessing what to say. Draft AI connected my actual projects to each role, and people finally replied.",
    body: [
      "Before Draft AI, Priya spent 15–20 minutes per message and still sent something that read like everyone else's.",
      "By drafting from the specific post and her resume, each message opened with a concrete, relevant hook.",
      "Within three weeks her reply rate climbed from 6% to 22%, and she landed four screening calls.",
    ],
  },
  {
    slug: "marcus-pm-career-switch",
    name: "Marcus",
    role: "PM (career switch from consulting)",
    metaTitle: "How Marcus broke into product",
    metaDescription:
      "A consultant switching into product management used Draft AI to reframe his experience and doubled his response rate.",
    summary:
      "Marcus needed to reframe consulting work as product impact. Draft AI translated his background into language hiring managers recognized.",
    replyRateBefore: 8,
    replyRateAfter: 19,
    quote:
      "The hardest part of switching careers is explaining why you're a fit. Draft AI did that for me in every message.",
    body: [
      "Marcus struggled to connect consulting engagements to product outcomes in a way that landed.",
      "Draft AI reframed his experience around shipped outcomes and user problems for each specific role.",
      "His response rate more than doubled, and he moved from cold outreach to onsite interviews in a month.",
    ],
  },
]

export function getStory(slug: string): StoryContent | undefined {
  return STORIES.find((s) => s.slug === slug)
}
