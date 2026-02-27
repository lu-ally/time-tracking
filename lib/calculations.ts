import { addDays } from "date-fns"
import { formatInTimeZone } from "date-fns-tz"
import { Holiday, holidayReduction } from "./holidays"
import { BERLIN_TZ, parseBerlinDate } from "./time"

export function workMinutes(entry: {
  startMinutes: number
  endMinutes: number
  breakMinutes: number
}) {
  const total = entry.endMinutes - entry.startMinutes - entry.breakMinutes
  return Math.max(total, 0)
}

export function leaveDaysUsed(
  startDate: string,
  endDate: string,
  halfDayStart: boolean,
  halfDayEnd: boolean,
  holidays: Holiday[]
) {
  const start = parseBerlinDate(startDate)
  const end = parseBerlinDate(endDate)
  let count = 0
  let day = start
  while (day <= end) {
    const dateString = formatInTimeZone(day, BERLIN_TZ, "yyyy-MM-dd")
    const weekday = day.getDay()
    const isWeekend = weekday === 0 || weekday === 6
    if (!isWeekend) {
      let increment = 1 - holidayReduction(dateString, holidays)
      if (dateString === startDate && halfDayStart) increment -= 0.5
      if (dateString === endDate && halfDayEnd) increment -= 0.5
      count += increment
    }
    day = addDays(day, 1)
  }
  return Math.max(count, 0)
}
