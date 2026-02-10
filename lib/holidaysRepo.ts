import { prisma } from "./db"
import { hamburgHolidays } from "./holidays"

export async function getHolidaysForYear(year: number, state: string) {
  const stored = await prisma.holiday.findMany({
    where: { state, date: { startsWith: `${year}-` } }
  })

  if (stored.length > 0) {
    return stored.map((h) => ({ date: h.date, name: h.name, state: h.state as "HH" }))
  }

  if (state === "HH") {
    return hamburgHolidays(year)
  }

  return []
}
