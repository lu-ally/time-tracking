import { expect, test, type Page } from "@playwright/test"
import { PrismaClient } from "@prisma/client"
import { hashPassword } from "../../lib/password"

const prisma = new PrismaClient()
const TEST_PASSWORD = "ChangeMe123!"

const randomEmail = () => `e2e-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`

async function createTestUser(name: string) {
  const email = randomEmail()
  const passwordHash = await hashPassword(TEST_PASSWORD)
  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: "user"
    }
  })
  return { email }
}

async function login(page: Page, email: string) {
  await page.goto("/login")
  await page.getByLabel("E-Mail").fill(email)
  await page.getByLabel("Passwort").fill(TEST_PASSWORD)
  await page.getByRole("button", { name: "Einloggen" }).click()
  await expect(page).toHaveURL(/\/time/)
}

test.afterAll(async () => {
  await prisma.$disconnect()
})

test("login + time entry", async ({ page }) => {
  const user = await createTestUser("Test User")
  await login(page, user.email)

  await page.getByLabel("Start").first().fill("09:00")
  await page.getByLabel("Ende").first().fill("17:00")
  await page.getByLabel("Pause (Min.)").first().fill("30")
  await page.getByLabel("Was habe ich gemacht?").first().fill("Projektarbeit")
  await page.getByRole("button", { name: "Speichern" }).first().click()

  await expect(page.getByText("Projektarbeit")).toBeVisible()
})

test("leave entry visible in team calendar", async ({ page }) => {
  const user = await createTestUser("Leave User")
  await login(page, user.email)

  await page.goto("/leave")
  await page.getByLabel("Start").fill("2026-06-10")
  await page.getByLabel("Ende").fill("2026-06-12")
  await page.getByLabel("Notiz (teamweit sichtbar)").fill("Sommerurlaub")
  await page.getByRole("button", { name: "Urlaub speichern" }).click()

  await expect(page.getByText("Sommerurlaub")).toBeVisible()
})
