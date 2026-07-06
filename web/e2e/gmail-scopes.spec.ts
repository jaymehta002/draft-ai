import { test, expect } from "@playwright/test"
import {
  accountHasFullGmailAccess,
  accountHasGmailReadonly,
  accountHasGmailSend,
  formatGmailAuthError,
} from "@/lib/gmail-scopes"
import { buildGoogleAccountTokenUpdate } from "@/lib/google-account-tokens"

test.describe("gmail-scopes", () => {
  const fullScope =
    "openid email profile https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly"
  const sendOnlyScope =
    "openid email profile https://www.googleapis.com/auth/gmail.send"

  test("detects send and readonly scopes", () => {
    expect(accountHasGmailSend(fullScope)).toBe(true)
    expect(accountHasGmailReadonly(fullScope)).toBe(true)
    expect(accountHasFullGmailAccess(fullScope)).toBe(true)
  })

  test("detects send-only scope", () => {
    expect(accountHasGmailSend(sendOnlyScope)).toBe(true)
    expect(accountHasGmailReadonly(sendOnlyScope)).toBe(false)
    expect(accountHasFullGmailAccess(sendOnlyScope)).toBe(false)
  })

  test("formatGmailAuthError maps insufficient scopes", () => {
    expect(formatGmailAuthError("Request had insufficient authentication scopes.")).toContain(
      "Reconnect Google"
    )
  })

  test("formatGmailAuthError maps invalid_grant", () => {
    expect(formatGmailAuthError("invalid_grant: Token has been revoked")).toContain("revoked")
  })

  test("buildGoogleAccountTokenUpdate persists OAuth callback fields", () => {
    const update = buildGoogleAccountTokenUpdate({
      provider: "google",
      providerAccountId: "123",
      refresh_token: "rt",
      access_token: "at",
      expires_at: 123,
      scope: "https://www.googleapis.com/auth/gmail.readonly",
      token_type: "Bearer",
      id_token: "id",
    })

    expect(update).toEqual({
      refresh_token: "rt",
      access_token: "at",
      expires_at: 123,
      scope: "https://www.googleapis.com/auth/gmail.readonly",
      token_type: "Bearer",
      id_token: "id",
    })
  })

  test("buildGoogleAccountTokenUpdate skips undefined tokens", () => {
    expect(
      buildGoogleAccountTokenUpdate({
        provider: "google",
        providerAccountId: "123",
        scope: "openid email",
      })
    ).toEqual({ scope: "openid email" })
  })
})
