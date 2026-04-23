import { NextResponse } from "next/server"
import { addDays } from "date-fns"
import { formatInTimeZone, fromZonedTime } from "date-fns-tz"
import { apiError, requireUser } from "../../../../lib/auth"
import { workMinutes } from "../../../../lib/calculations"
import { prisma } from "../../../../lib/db"
import { getHolidaysForYear } from "../../../../lib/holidaysRepo"
import { holidayReduction } from "../../../../lib/holidays"
import { BERLIN_TZ } from "../../../../lib/time"

const holidayCache = new Map<string, Map<string, number>>()

async function getHolidaySet(state: string, year: number) {
  const key = `${state}-${year}`
  if (holidayCache.has(key)) return holidayCache.get(key)!
  const holidays = await getHolidaysForYear(year, state)
  const holidaySet = new Map<string, number>(
    holidays.map((h) => [h.date, holidayReduction(h.date, [h])])
  )
  holidayCache.set(key, holidaySet)
  return holidaySet
}

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET() {
  try {
    const user = await requireUser()
    const now = new Date()
    const todayKey = formatInTimeZone(now, BERLIN_TZ, "yyyy-MM-dd")

    const firstEntry = await prisma.timeEntry.findFirst({
      where: { userId: user.id },
      orderBy: { date: "asc" },
      select: { date: true }
    })

    if (!firstEntry) {
      return NextResponse.json({ saldoMinutesTotal: 0 })
    }

    const effectiveStartDate = firstEntry.date

    const entries = await prisma.timeEntry.findMany({
      where: { userId: user.id, date: { gte: effectiveStartDate, lte: todayKey } },
      select: { startMinutes: true, endMinutes: true, breakMinutes: true }
    })

    const totalActual = entries.reduce((sum, e) => sum + workMinutes(e), 0)

    const weekdayMap = [
      user.targetMinutesSun,
      user.targetMinutesMon,
      user.targetMinutesTue,
      user.targetMinutesWed,
      user.targetMinutesThu,
      user.targetMinutesFri,
      user.targetMinutesSat
    ]

    let totalTarget = 0
    let cursor = fromZonedTime(`${effectiveStartDate}T12:00:00`, BERLIN_TZ)
    while (true) {
      const dateKey = formatInTimeZone(cursor, BERLIN_TZ, "yyyy-MM-dd")
      if (dateKey > todayKey) break
      const year = Number(dateKey.slice(0, 4))
      const holidays = await getHolidaySet(user.holidayState, year)
      const weekday = Number(formatInTimeZone(cursor, BERLIN_TZ, "i")) % 7
      const reduction = holidays.get(dateKey) ?? 0
      totalTarget += weekdayMap[weekday] * (1 - reduction)
      const nextDayKey = formatInTimeZone(addDays(cursor, 1), BERLIN_TZ, "yyyy-MM-dd")
      cursor = fromZonedTime(`${nextDayKey}T12:00:00`, BERLIN_TZ)
    }

    return NextResponse.json({ saldoMinutesTotal: totalActual - totalTarget })
  } catch (error) {
    return apiError(error)
  }
}
