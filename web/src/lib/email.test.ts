import assert from "node:assert/strict"
import { test } from "node:test"
import { extractEmailFromText, inferRecipientNameFromEmail, isValidEmailAddress } from "./email.ts"

test("extractEmailFromText", async (t) => {
  const cases: Array<[string, string | null]> = [
    ["noreply@edtechgamify.com. Join us", "noreply@edtechgamify.com"],
    ["noreply@edtechgamify.com.join", "noreply@edtechgamify.com"],
    ["contact@company.co.uk", "contact@company.co.uk"],
    ["email: careers@startup.io!", "careers@startup.io"],
    ["reach us at hello@firm.com, thanks", "hello@firm.com"],
    ["no email here", null],
    ["EmailAddressjohn@company.com", "john@company.com"],
  ]

  for (const [input, expected] of cases) {
    await t.test(input, () => {
      assert.equal(extractEmailFromText(input), expected)
    })
  }
})

test("isValidEmailAddress", () => {
  assert.equal(isValidEmailAddress("a@b.com"), true)
  assert.equal(isValidEmailAddress("a@b.co.uk"), true)
  assert.equal(isValidEmailAddress("not-an-email"), false)
  assert.equal(isValidEmailAddress("a@@b.com"), false)
  assert.equal(isValidEmailAddress("a@b..com"), false)
})

test("inferRecipientNameFromEmail", () => {
  assert.equal(inferRecipientNameFromEmail("jane.doe@company.com"), "Jane Doe")
  assert.equal(inferRecipientNameFromEmail("careers@company.com"), null)
  assert.equal(inferRecipientNameFromEmail("info@company.com"), null)
  assert.equal(inferRecipientNameFromEmail("j@company.com"), null)
})
