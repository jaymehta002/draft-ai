import type { MetadataRoute } from "next"
import { siteUrl } from "@/lib/site"
import { PERSONAS, STORIES } from "@/lib/seo-content"

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()

  const personaPages: MetadataRoute.Sitemap = PERSONAS.map((p) => ({
    url: `${siteUrl}/outreach/${p.slug}`,
    lastModified,
    changeFrequency: "monthly",
    priority: 0.7,
  }))

  const storyPages: MetadataRoute.Sitemap = STORIES.map((s) => ({
    url: `${siteUrl}/stories/${s.slug}`,
    lastModified,
    changeFrequency: "monthly",
    priority: 0.5,
  }))

  return [
    {
      url: `${siteUrl}/`,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteUrl}/pricing`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    ...personaPages,
    ...storyPages,
    {
      url: `${siteUrl}/privacy-policy`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${siteUrl}/terms-of-service`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ]
}
