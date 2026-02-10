import { PrismaClient } from "@prisma/client"
import { hamburgHolidays } from "../lib/holidays"
import { hashPassword } from "../lib/password"

const prisma = new PrismaClient()

async function main() {
  const now = new Date()
  const currentYear = now.getFullYear()
  const years = [currentYear - 1, currentYear, currentYear + 1]

  for (const year of years) {
    const holidays = hamburgHolidays(year)
    for (const holiday of holidays) {
      await prisma.holiday.upsert({
        where: { date_state: { date: holiday.date, state: holiday.state } },
        update: { name: holiday.name },
        create: holiday
      })
    }
  }

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "engineering@allywell.de"
  const adminPassword = process.env.SEED_ADMIN_PASSWORD
  if (!adminPassword) {
    console.warn("SEED_ADMIN_PASSWORD is not set. Skipping admin user seed.")
  } else {
    const existing = await prisma.user.findUnique({ where: { email: adminEmail } })
    if (!existing) {
      const passwordHash = await hashPassword(adminPassword)
      await prisma.user.create({
        data: {
          email: adminEmail,
          name: "Admin",
          passwordHash,
          role: "admin"
        }
      })
    }
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
