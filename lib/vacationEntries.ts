import { addDays } from "date-fns"
import { formatInTimeZone, fromZonedTime } from "date-fns-tz"
import { prisma } from "./db"
import { getHolidaysForYear } from "./holidaysRepo"
import { holidayReduction } from "./holidays"
import { BERLIN_TZ } from "./time"

type UserTarget = {
  targetMinutesSun: number
  targetMinutesMon: number
  targetMinutesTue: number
  targetMinutesWed: number
  targetMinutesThu: number
  targetMinutesFri: number
  targetMinutesSat: number
  holidayState: string
}

function weekdayTarget(user: UserTarget, weekday: number): number {
  const map = [
    user.targetMinutesSun,
    user.targetMinutesMon,
    user.targetMinutesTue,
    user.targetMinutesWed,
    user.targetMinutesThu,
    user.targetMinutesFri,
    user.targetMinutesSat
  ]
  return map[weekday]
}

export async function createVacationTimeEntries(
  userId: string,
  startDate: string,
  endDate: string,
  halfDayStart: boolean,
  halfDayEnd: boolean,
  user: UserTarget
) {
  const yearsNeeded = new Set<number>()
  let cursor = fromZonedTime(`${startDate}T12:00:00`, BERLIN_TZ)
  const endCursor = fromZonedTime(`${endDate}T12:00:00`, BERLIN_TZ)
  while (cursor <= endCursor) {
    yearsNeeded.add(Number(formatInTimeZone(cursor, BERLIN_TZ, "yyyy")))
    cursor = addDays(cursor, 1)
  }

  const holidayMap = new Map<string, number>()
  for (const year of yearsNeeded) {
    const holidays = await getHolidaysForYear(year, user.holidayState)
    for (const holiday of holidays) {
      holidayMap.set(holiday.date, holidayReduction(holiday.date, [holiday]))
    }
  }

  const entriesToCreate: {
    userId: string
    date: string
    startMinutes: number
    endMinutes: number
    breakMinutes: number
    note: string
    vacationEntry: boolean
  }[] = []

  cursor = fromZonedTime(`${startDate}T12:00:00`, BERLIN_TZ)
  while (cursor <= fromZonedTime(`${endDate}T12:00:00`, BERLIN_TZ)) {
    const dateStr = formatInTimeZone(cursor, BERLIN_TZ, "yyyy-MM-dd")
    const weekday = Number(formatInTimeZone(cursor, BERLIN_TZ, "i")) % 7
    const isWeekend = weekday === 0 || weekday === 6
    const holidayRed = holidayMap.get(dateStr) ?? 0
    const isFullHoliday = holidayRed >= 1.0

    if (!isWeekend && !isFullHoliday) {
      let targetMinutes = Math.round(weekdayTarget(user, weekday) * (1 - holidayRed))
      if (dateStr === startDate && halfDayStart) targetMinutes = Math.round(targetMinutes / 2)
      if (dateStr === endDate && halfDayEnd) targetMinutes = Math.round(targetMinutes / 2)

      if (targetMinutes > 0) {
        const breakMinutes = targetMinutes > 240 ? 30 : 0
        const startMinutes = 9 * 60
        const endMinutes = startMinutes + targetMinutes + breakMinutes
        entriesToCreate.push({
          userId,
          date: dateStr,
          startMinutes,
          endMinutes,
          breakMinutes,
          note: "",
          vacationEntry: true
        })
      }
    }

    cursor = addDays(cursor, 1)
  }

  if (entriesToCreate.length > 0) {
    await prisma.timeEntry.createMany({ data: entriesToCreate, skipDuplicates: true })
  }
}

export async function deleteVacationTimeEntries(
  userId: string,
  startDate: string,
  endDate: string
) {
  await prisma.timeEntry.deleteMany({
    where: { userId, date: { gte: startDate, lte: endDate }, vacationEntry: true }
  })
}
