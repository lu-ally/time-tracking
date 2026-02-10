import { test, expect } from "@playwright/test"

const randomEmail = () => `user${Date.now()}@example.com`

test("login + time entry", async ({ page }) => {
  const email = randomEmail()
  await page.goto("/register")
  await page.getByLabel("Name").fill("Test User")
  await page.getByLabel("E-Mail").fill(email)
  await page.getByLabel("Passwort").fill("ChangeMe123")
  await page.getByRole("button", { name: "Registrieren" }).click()

  await expect(page).toHaveURL(/\/time/)
  await page.getByLabel("Start").first().fill("09:00")
  await page.getByLabel("Ende").first().fill("17:00")
  await page.getByLabel("Pause (Min.)").first().fill("30")
  await page.getByLabel("Was habe ich gemacht?").first().fill("Projektarbeit")
  await page.getByRole("button", { name: "Speichern" }).first().click()

  await expect(page.getByText("Projektarbeit")).toBeVisible()
})

test("leave entry visible in team calendar", async ({ page }) => {
  const email = randomEmail()
  await page.goto("/register")
  await page.getByLabel("Name").fill("Leave User")
  await page.getByLabel("E-Mail").fill(email)
  await page.getByLabel("Passwort").fill("ChangeMe123")
  await page.getByRole("button", { name: "Registrieren" }).click()

  await page.goto("/leave")
  await page.getByLabel("Start").fill("2026-06-10")
  await page.getByLabel("Ende").fill("2026-06-12")
  await page.getByLabel("Notiz (teamweit sichtbar)").fill("Sommerurlaub")
  await page.getByRole("button", { name: "Urlaub speichern" }).click()

  await expect(page.getByText("Sommerurlaub")).toBeVisible()
})
