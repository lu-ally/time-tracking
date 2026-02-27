import { prisma } from "./db"
import { hamburgHolidays } from "./holidays"

export async function getHolidaysForYear(year: number, state: string) {
  const fallback = state === "HH" ? hamburgHolidays(year) : []
  const stored = await prisma.holiday.findMany({
    where: { state, date: { startsWith: `${year}-` } }
  })

  if (stored.length === 0) {
    return fallback
  }

  const merged = new Map(fallback.map((holiday) => [holiday.date, holiday]))
  for (const holiday of stored) {
    merged.set(holiday.date, {
      date: holiday.date,
      name: holiday.name,
      state: holiday.state as "HH"
    })
  }
  return Array.from(merged.values()).sort((a, b) => a.date.localeCompare(b.date))
}
