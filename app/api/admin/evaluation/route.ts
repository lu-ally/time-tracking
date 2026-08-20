import { NextRequest, NextResponse } from "next/server"
import { addDays } from "date-fns"
import { formatInTimeZone, fromZonedTime } from "date-fns-tz"
import { apiError, requireAdmin } from "../../../../lib/auth"
import { workMinutes } from "../../../../lib/calculations"
import { prisma } from "../../../../lib/db"
import { getHolidaysForYear } from "../../../../lib/holidaysRepo"
import { holidayReduction } from "../../../../lib/holidays"
import { BERLIN_TZ } from "../../../../lib/time"
import { targetMinutesForDate, WorkingTimeScheduleRecord } from "../../../../lib/workingTimeSchedule"

type TargetUser = {
  id: string
  name: string
  email: string
  holidayState: string
}

function parseMonth(value: string | null) {
  if (!value) return null
  const match = value.match(/^(\d{4})-(\d{2})$/)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return null
  return { year, month }
}

function maxDateKey(a: string, b: string) {
  return a >= b ? a : b
}

function minDateKey(a: string, b: string) {
  return a <= b ? a : b
}

const holidayCache = new Map<string, Map<string, number>>()

async function getHolidaySet(state: string, year: number) {
  const key = `${state}-${year}`
  if (holidayCache.has(key)) {
    return holidayCache.get(key)!
  }
  const holidays = await getHolidaysForYear(year, state)
  const holidaySet = new Map<string, number>(
    holidays.map((holiday) => [holiday.date, holidayReduction(holiday.date, [holiday])])
  )
  holidayCache.set(key, holidaySet)
  return holidaySet
}

async function computeTargetBetweenKeys(
  user: TargetUser,
  schedules: WorkingTimeScheduleRecord[],
  startKey: string,
  endKey: string
) {
  if (startKey > endKey) return 0
  let cursor = fromZonedTime(`${startKey}T12:00:00`, BERLIN_TZ)
  let target = 0
  while (true) {
    const dateKey = formatInTimeZone(cursor, BERLIN_TZ, "yyyy-MM-dd")
    if (dateKey > endKey) break
    const year = Number(dateKey.slice(0, 4))
    const holidays = await getHolidaySet(user.holidayState, year)
    const weekday = Number(formatInTimeZone(cursor, BERLIN_TZ, "i")) % 7
    const reduction = holidays.get(dateKey) ?? 0
    target += targetMinutesForDate(schedules, dateKey, weekday) * (1 - reduction)
    const nextDayKey = formatInTimeZone(addDays(cursor, 1), BERLIN_TZ, "yyyy-MM-dd")
    cursor = fromZonedTime(`${nextDayKey}T12:00:00`, BERLIN_TZ)
  }
  return target
}

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
    const { searchParams } = new URL(request.url)
    const parsedMonth = parseMonth(searchParams.get("month"))

    const now = new Date()
    const monthYear = parsedMonth?.year ?? Number(formatInTimeZone(now, BERLIN_TZ, "yyyy"))
    const monthNumber = parsedMonth?.month ?? Number(formatInTimeZone(now, BERLIN_TZ, "MM"))
    const month = `${String(monthYear).padStart(4, "0")}-${String(monthNumber).padStart(2, "0")}`

    const monthStart = fromZonedTime(`${month}-01T12:00:00`, BERLIN_TZ)
    const monthDays = new Date(monthYear, monthNumber, 0).getDate()
    const monthEnd = fromZonedTime(`${month}-${String(monthDays).padStart(2, "0")}T12:00:00`, BERLIN_TZ)
    const monthStartKey = formatInTimeZone(monthStart, BERLIN_TZ, "yyyy-MM-dd")
    const monthEndKey = formatInTimeZone(monthEnd, BERLIN_TZ, "yyyy-MM-dd")
    const todayKey = formatInTimeZone(now, BERLIN_TZ, "yyyy-MM-dd")

    const users = await prisma.user.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        holidayState: true
      }
    })

    if (users.length === 0) {
      return NextResponse.json({ month, rows: [] })
    }

    const userIds = users.map((user) => user.id)
    const schedules = await prisma.workingTimeSchedule.findMany({
      where: { userId: { in: userIds } },
      orderBy: { effectiveFrom: "asc" }
    })
    const schedulesByUser = new Map<string, WorkingTimeScheduleRecord[]>()
    for (const schedule of schedules) {
      const list = schedulesByUser.get(schedule.userId) ?? []
      list.push(schedule)
      schedulesByUser.set(schedule.userId, list)
    }
    const firstEntries = await prisma.timeEntry.groupBy({
      by: ["userId"],
      where: { userId: { in: userIds } },
      _min: { date: true }
    })
    const firstEntryByUser = new Map<string, string>()
    for (const row of firstEntries) {
      if (row._min.date) {
        firstEntryByUser.set(row.userId, row._min.date)
      }
    }

    const firstEntryDates = Array.from(firstEntryByUser.values()).sort()
    const globalFirstEntry = firstEntryDates[0] ?? null
    const monthGlobalEnd = minDateKey(monthEndKey, todayKey)

    const [monthEntries, totalEntries] = await Promise.all([
      monthStartKey <= monthGlobalEnd
        ? prisma.timeEntry.findMany({
            where: {
              userId: { in: userIds },
              date: { gte: monthStartKey, lte: monthGlobalEnd }
            },
            select: {
              userId: true,
              date: true,
              startMinutes: true,
              endMinutes: true,
              breakMinutes: true
            }
          })
        : Promise.resolve([]),
      globalFirstEntry
        ? prisma.timeEntry.findMany({
            where: {
              userId: { in: userIds },
              date: { gte: globalFirstEntry, lte: todayKey }
            },
            select: {
              userId: true,
              date: true,
              startMinutes: true,
              endMinutes: true,
              breakMinutes: true
            }
          })
        : Promise.resolve([])
    ])

    const rows = await Promise.all(
      users.map(async (user) => {
        const userSchedules = schedulesByUser.get(user.id) ?? []
        const effectiveStartDate = firstEntryByUser.get(user.id) ?? null
        const monthRangeStart = effectiveStartDate
          ? maxDateKey(monthStartKey, effectiveStartDate)
          : null
        const monthRangeEnd = monthRangeStart ? minDateKey(monthEndKey, todayKey) : null
        const hasMonthWindow = Boolean(monthRangeStart && monthRangeEnd && monthRangeStart <= monthRangeEnd)

        let monthActual = 0
        if (hasMonthWindow) {
          for (const entry of monthEntries) {
            if (entry.userId !== user.id) continue
            if (entry.date < monthRangeStart! || entry.date > monthRangeEnd!) continue
            monthActual += workMinutes(entry)
          }
        }

        let totalActual = 0
        if (effectiveStartDate && effectiveStartDate <= todayKey) {
          for (const entry of totalEntries) {
            if (entry.userId !== user.id) continue
            if (entry.date < effectiveStartDate || entry.date > todayKey) continue
            totalActual += workMinutes(entry)
          }
        }

        const monthTarget = hasMonthWindow
          ? await computeTargetBetweenKeys(user, userSchedules, monthRangeStart!, monthRangeEnd!)
          : 0
        const totalTarget =
          effectiveStartDate && effectiveStartDate <= todayKey
            ? await computeTargetBetweenKeys(user, userSchedules, effectiveStartDate, todayKey)
            : 0

        return {
          userId: user.id,
          name: user.name,
          email: user.email,
          recordedMinutesMonth: monthActual,
          saldoMinutesMonth: monthActual - monthTarget,
          saldoMinutesTotal: totalActual - totalTarget,
          effectiveStartDate,
          monthRangeStart: hasMonthWindow ? monthRangeStart : null,
          monthRangeEnd: hasMonthWindow ? monthRangeEnd : null
        }
      })
    )

    return NextResponse.json({ month, rows })
  } catch (error) {
    return apiError(error)
  }
}
