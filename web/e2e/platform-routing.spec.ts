import { test, expect } from "@playwright/test"
import {
  buildLinkedInProfilePostId,
  getFeedPlatformFromHostname,
  getLinkedInProfilePublicId,
} from "../../draft/lib/platform"

test.describe("platform routing", () => {
  test("twitter.com maps to X platform", () => {
    expect(getFeedPlatformFromHostname("twitter.com")).toBe("X")
    expect(getFeedPlatformFromHostname("www.twitter.com")).toBe("X")
  })

  test("x.com maps to X platform", () => {
    expect(getFeedPlatformFromHostname("x.com")).toBe("X")
  })

  test("linkedin profile postId is stable", () => {
    const publicId = getLinkedInProfilePublicId("/in/jane-doe-123/")
    expect(publicId).toBe("jane-doe-123")
    expect(buildLinkedInProfilePostId(publicId!)).toBe("linkedin:profile:jane-doe-123")
  })
})
