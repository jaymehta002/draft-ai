import { test, expect } from "@playwright/test"
import {
  parseEmailBody,
  parseInlineEmailParts,
  stripQuoteMarkers,
  buildEmailLinkHintMap,
} from "@/lib/email-body-format"

test.describe("email-body-format", () => {
  test("parses Gmail reply with quoted thread", () => {
    const body = `hello, Looks good to me

On Mon, 6 Jul 2026 at 22:05, jay mehta wrote:

> Hello,
>
> Best,
> Jay`

    const parsed = parseEmailBody(body)
    expect(parsed.main).toBe("hello, Looks good to me")
    expect(parsed.quote?.header).toContain("jay mehta wrote:")
    expect(parsed.quote?.body).toContain("Hello,")
    expect(parsed.quote?.body).not.toContain(">")
  })

  test("stripQuoteMarkers removes leading chevrons", () => {
    expect(stripQuoteMarkers("> line one\n> line two")).toBe("line one\nline two")
  })

  test("parseInlineEmailParts handles markdown links", () => {
    const parts = parseInlineEmailParts(
      "Contact [jayymehta.in](http://jayymehta.in) today"
    )
    expect(parts).toEqual([
      { type: "text", value: "Contact " },
      { type: "link", label: "jayymehta.in", href: "http://jayymehta.in" },
      { type: "text", value: " today" },
    ])
  })

  test("parseInlineEmailParts handles bare URLs", () => {
    const parts = parseInlineEmailParts("See https://github.com/jaymehta002")
    expect(parts[1]).toEqual({
      type: "link",
      label: "https://github.com/jaymehta002",
      href: "https://github.com/jaymehta002",
    })
  })

  test("parseInlineEmailParts handles plain email addresses", () => {
    const parts = parseInlineEmailParts("jaymehta002@gmail.com")
    expect(parts).toEqual([
      { type: "link", label: "jaymehta002@gmail.com", href: "mailto:jaymehta002@gmail.com" },
    ])
  })

  test("parseInlineEmailParts handles signature pipe links with profile hints", () => {
    const parts = parseInlineEmailParts("jayymehta.in | LinkedIn | GitHub", {
      portfolioUrl: "http://jayymehta.in",
      linkedinUrl: "https://linkedin.com/in/jaymehta002",
      githubUrl: "https://github.com/jaymehta002",
    })

    expect(parts).toEqual([
      { type: "link", label: "jayymehta.in", href: "http://jayymehta.in" },
      { type: "text", value: " | " },
      { type: "link", label: "LinkedIn", href: "https://linkedin.com/in/jaymehta002" },
      { type: "text", value: " | " },
      { type: "link", label: "GitHub", href: "https://github.com/jaymehta002" },
    ])
  })

  test("buildEmailLinkHintMap maps portfolio host", () => {
    const map = buildEmailLinkHintMap({ portfolioUrl: "https://jayymehta.in" })
    expect(map.get("jayymehta.in")).toBe("https://jayymehta.in")
  })
})
