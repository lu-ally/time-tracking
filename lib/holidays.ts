import { addDays, isWithinInterval } from "date-fns"
import { formatInTimeZone } from "date-fns-tz"
import { BERLIN_TZ, parseBerlinDate } from "./time"

export type Holiday = {
  date: string
  name: string
  state: "HH"
}

const HALF_DAY_HOLIDAY_MM_DD = new Set(["12-24", "12-31"])

function easterSunday(year: number) {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month - 1, day)
}

export function hamburgHolidays(year: number): Holiday[] {
  const easter = easterSunday(year)
  const holiday = (date: Date, name: string): Holiday => ({
    date: formatInTimeZone(date, BERLIN_TZ, "yyyy-MM-dd"),
    name,
    state: "HH"
  })

  return [
    holiday(new Date(year, 0, 1), "Neujahr"),
    holiday(addDays(easter, -2), "Karfreitag"),
    holiday(addDays(easter, 1), "Ostermontag"),
    holiday(new Date(year, 4, 1), "Tag der Arbeit"),
    holiday(addDays(easter, 39), "Christi Himmelfahrt"),
    holiday(addDays(easter, 50), "Pfingstmontag"),
    holiday(new Date(year, 9, 3), "Tag der Deutschen Einheit"),
    holiday(new Date(year, 9, 31), "Reformationstag"),
    holiday(new Date(year, 11, 24), "Heiligabend (halbtägig)"),
    holiday(new Date(year, 11, 25), "1. Weihnachtstag"),
    holiday(new Date(year, 11, 26), "2. Weihnachtstag"),
    holiday(new Date(year, 11, 31), "Silvester (halbtägig)")
  ]
}

export function isHoliday(dateString: string, holidays: Holiday[]) {
  return holidays.some((h) => h.date === dateString)
}

export function holidayReduction(dateString: string, holidays: Holiday[]) {
  if (!isHoliday(dateString, holidays)) return 0
  const mmdd = dateString.slice(5)
  return HALF_DAY_HOLIDAY_MM_DD.has(mmdd) ? 0.5 : 1
}

export function holidayName(dateString: string, holidays: Holiday[]) {
  return holidays.find((h) => h.date === dateString)?.name ?? null
}

export function countWeekdaysExcludingHolidays(
  startDate: string,
  endDate: string,
  holidays: Holiday[]
) {
  const start = parseBerlinDate(startDate)
  const end = parseBerlinDate(endDate)
  let count = 0
  let day = start
  while (day <= end) {
    const dayString = formatInTimeZone(day, BERLIN_TZ, "yyyy-MM-dd")
    const weekday = day.getDay()
    const isWeekend = weekday === 0 || weekday === 6
    if (!isWeekend) {
      count += 1 - holidayReduction(dayString, holidays)
    }
    day = addDays(day, 1)
  }
  return count
}

export function includesHoliday(startDate: string, endDate: string, holidays: Holiday[]) {
  const start = parseBerlinDate(startDate)
  const end = parseBerlinDate(endDate)
  return holidays.some((holiday) => {
    const date = parseBerlinDate(holiday.date)
    return isWithinInterval(date, { start, end })
  })
}
