import { test, expect } from "@playwright/test"
import { authOptions } from "@/lib/auth"

const baseUrl = "https://app.example.com"

function redirect(url: string) {
  const callback = authOptions.callbacks?.redirect
  if (!callback) throw new Error("redirect callback not configured")
  return callback({ url, baseUrl })
}

test.describe("auth redirect callback", () => {
  test("rejects protocol-relative URLs", async () => {
    await expect(redirect("//evil.com")).resolves.toBe(`${baseUrl}/dashboard`)
  })

  test("rejects suffix-match origin tricks", async () => {
    await expect(redirect("https://app.example.com.evil.com")).resolves.toBe(
      `${baseUrl}/dashboard`
    )
  })

  test("rejects scheme-shorthand tricks (https:evil.com)", async () => {
    await expect(redirect("https:evil.com")).resolves.toBe(`${baseUrl}/dashboard`)
  })

  test("keeps backslash-prefixed paths on the same origin", async () => {
    const result = await redirect("/\\evil.com")
    expect(new URL(result).origin).toBe(baseUrl)
  })

  test("falls back to the default on unparseable input instead of throwing", async () => {
    await expect(redirect("not a url")).resolves.toBe(`${baseUrl}/dashboard`)
  })

  test("preserves a legitimate relative path", async () => {
    await expect(redirect("/onboarding")).resolves.toBe(`${baseUrl}/onboarding`)
  })

  test("preserves a legitimate relative path with query params", async () => {
    await expect(redirect("/extension/connect?state=abc123")).resolves.toBe(
      `${baseUrl}/extension/connect?state=abc123`
    )
  })

  test("preserves a legitimate same-origin absolute URL", async () => {
    const url = `${baseUrl}/dashboard/extension`
    await expect(redirect(url)).resolves.toBe(url)
  })
})
