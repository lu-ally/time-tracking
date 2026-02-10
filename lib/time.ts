import { addDays, endOfMonth, startOfMonth, startOfWeek } from "date-fns"
import { formatInTimeZone, fromZonedTime } from "date-fns-tz"

export const BERLIN_TZ = "Europe/Berlin"

export function berlinNow() {
  return new Date()
}

export function berlinDateString(date: Date) {
  return formatInTimeZone(date, BERLIN_TZ, "yyyy-MM-dd")
}

export function parseBerlinDate(dateString: string) {
  return fromZonedTime(`${dateString}T00:00:00`, BERLIN_TZ)
}

export function weekStart(date: Date) {
  return startOfWeek(date, { weekStartsOn: 1 })
}

export function weekDates(date: Date) {
  const start = weekStart(date)
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

export function monthDates(date: Date) {
  const start = startOfMonth(date)
  const end = endOfMonth(date)
  return { start, end }
}

export function minutesToTime(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

export function timeToMinutes(value: string) {
  const [h, m] = value.split(":").map(Number)
  return h * 60 + m
}
