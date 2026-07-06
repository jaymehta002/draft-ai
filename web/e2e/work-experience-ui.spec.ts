import { test, expect, type Locator, type Page } from "@playwright/test"

const currentYear = new Date().getFullYear()
const oldestYear = currentYear - 50

function harnessRoot(page: Page): Locator {
  return page.getByTestId("work-experience-harness").last()
}

function labeledCombobox(root: Locator, label: string, index = 0) {
  return root
    .locator("label")
    .filter({ hasText: label })
    .locator("..")
    .getByRole("combobox")
    .nth(index)
}

async function allInputValues(locator: Locator) {
  const count = await locator.count()
  const values: string[] = []
  for (let i = 0; i < count; i++) {
    values.push(await locator.nth(i).inputValue())
  }
  return values
}

async function waitForHarness(page: Page) {
  const harness = harnessRoot(page)
  await expect(harness).toBeVisible()
  await expect(harness.getByPlaceholder("Senior Software Engineer").first()).toBeVisible()
}

async function openHarness(page: Page, query = "") {
  await page.goto(`/e2e/work-experience${query}`)
  await waitForHarness(page)
  return harnessRoot(page)
}

test.describe("work experience UI", () => {
  test("renders multiple roles with distinct title, company, and description", async ({ page }) => {
    const harness = await openHarness(page)

    const titles = harness.getByPlaceholder("Senior Software Engineer")
    const companies = harness.getByPlaceholder("Acme Inc.")
    const descriptions = harness.getByPlaceholder("Built and shipped features that...")

    await expect(titles).toHaveCount(3)
    await expect(companies).toHaveCount(3)
    await expect(descriptions).toHaveCount(3)

    await expect(titles.nth(0)).toHaveValue("Staff Engineer")
    await expect(companies.nth(0)).toHaveValue("Stripe")
    await expect(descriptions.nth(0)).toHaveValue("Led payments platform migration")

    await expect(titles.nth(1)).toHaveValue("Senior Engineer")
    await expect(companies.nth(1)).toHaveValue("Airbnb")
    await expect(descriptions.nth(1)).toHaveValue("Built search ranking features")

    await expect(titles.nth(2)).toHaveValue("Software Engineer")
    await expect(companies.nth(2)).toHaveValue("StartupCo")
    await expect(descriptions.nth(2)).toHaveValue("Full-stack product development")

    const titleValues = await allInputValues(titles)
    const companyValues = await allInputValues(companies)
    const descriptionValues = await allInputValues(descriptions)

    expect(new Set(titleValues).size).toBe(3)
    expect(new Set(companyValues).size).toBe(3)
    expect(new Set(descriptionValues).size).toBe(3)
  })

  test("shows current role first with parsed dates", async ({ page }) => {
    const harness = await openHarness(page)

    await expect(harness.getByText("Current role").first()).toBeVisible()
    await expect(labeledCombobox(harness, "Start year", 0)).toHaveText("2022")
  })

  test("year dropdown lists newest year first and includes full 50-year range", async ({
    page,
  }) => {
    const harness = await openHarness(page)

    await labeledCombobox(harness, "Start year", 0).click()

    const listbox = page.getByRole("listbox")
    await expect(listbox).toBeVisible()

    const yearOptions = (await listbox.getByRole("option").allTextContents()).filter((text) =>
      /^\d{4}$/.test(text)
    )

    expect(yearOptions[0]).toBe(String(currentYear))
    expect(yearOptions).toContain(String(oldestYear))
    expect(yearOptions).toHaveLength(51)

    const content = page.locator('[data-radix-select-viewport]')
    await expect(content).toBeVisible()
    const box = await content.boundingBox()
    expect(box?.height ?? 0).toBeGreaterThan(36)
  })

  test("coerces malformed stored year in the select", async ({ page }) => {
    const harness = await openHarness(page, "?badYear=1")
    await expect(labeledCombobox(harness, "Start year", 0)).toHaveText("2019")
  })

  test("shows pre-filled hint when aiFilled is enabled", async ({ page }) => {
    const harness = await openHarness(page, "?aiFilled=1")
    await expect(harness.getByText("Pre-filled from resume — review and edit")).toHaveCount(3)
  })
})
