"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  addDays,
  addMonths,
  addWeeks,
  endOfMonth,
  endOfWeek,
  endOfYear,
  startOfMonth,
  startOfWeek,
  startOfYear
} from "date-fns"
import { formatInTimeZone, fromZonedTime } from "date-fns-tz"
import { BERLIN_TZ, minutesToTime, weekDates } from "../lib/time"
import { Holiday } from "../lib/holidays"
import { workMinutes } from "../lib/calculations"

export type TimeEntry = {
  id: string
  date: string
  startMinutes: number
  endMinutes: number
  breakMinutes: number
  note: string
}

export function TimeEntryClient({
  initialDate,
  targetMinutes,
  holidays
}: {
  initialDate: string
  targetMinutes: {
    mon: number
    tue: number
    wed: number
    thu: number
    fri: number
    sat: number
    sun: number
  }
  holidays: Holiday[]
}) {
  const targetForWeekday = useCallback((weekday: number) => {
    const map = [targetMinutes.sun, targetMinutes.mon, targetMinutes.tue, targetMinutes.wed, targetMinutes.thu, targetMinutes.fri, targetMinutes.sat]
    return map[weekday]
  }, [targetMinutes])

  const [view, setView] = useState<"day" | "week" | "month">("week")
  const [date, setDate] = useState(initialDate)
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [noteSuggestions, setNoteSuggestions] = useState<string[]>([])
  const [showWeekends, setShowWeekends] = useState(false)
  const [saldoRange, setSaldoRange] = useState<"week" | "month" | "year">("week")
  const [error, setError] = useState<string | null>(null)

  const dateObj = useMemo(() => fromZonedTime(`${date}T00:00:00`, BERLIN_TZ), [date])

  const range = useMemo(() => {
    if (view === "day") {
      return { start: date, end: date }
    }
    if (view === "week") {
      const week = weekDates(dateObj)
      return {
        start: formatInTimeZone(week[0], BERLIN_TZ, "yyyy-MM-dd"),
        end: formatInTimeZone(week[6], BERLIN_TZ, "yyyy-MM-dd")
      }
    }
    const start = formatInTimeZone(
      new Date(dateObj.getFullYear(), dateObj.getMonth(), 1),
      BERLIN_TZ,
      "yyyy-MM-dd"
    )
    const end = formatInTimeZone(
      new Date(dateObj.getFullYear(), dateObj.getMonth() + 1, 0),
      BERLIN_TZ,
      "yyyy-MM-dd"
    )
    return { start, end }
  }, [view, date, dateObj])

  const saldoPeriodRange = useMemo(() => {
    if (saldoRange === "week") {
      const start = startOfWeek(dateObj, { weekStartsOn: 1 })
      const end = endOfWeek(dateObj, { weekStartsOn: 1 })
      return {
        start: formatInTimeZone(start, BERLIN_TZ, "yyyy-MM-dd"),
        end: formatInTimeZone(end, BERLIN_TZ, "yyyy-MM-dd")
      }
    }
    if (saldoRange === "month") {
      const start = startOfMonth(dateObj)
      const end = endOfMonth(dateObj)
      return {
        start: formatInTimeZone(start, BERLIN_TZ, "yyyy-MM-dd"),
        end: formatInTimeZone(end, BERLIN_TZ, "yyyy-MM-dd")
      }
    }
    const start = startOfYear(dateObj)
    const end = endOfYear(dateObj)
    return {
      start: formatInTimeZone(start, BERLIN_TZ, "yyyy-MM-dd"),
      end: formatInTimeZone(end, BERLIN_TZ, "yyyy-MM-dd")
    }
  }, [saldoRange, dateObj])

  const dataRange = useMemo(() => {
    return {
      start: range.start < saldoPeriodRange.start ? range.start : saldoPeriodRange.start,
      end: range.end > saldoPeriodRange.end ? range.end : saldoPeriodRange.end
    }
  }, [range, saldoPeriodRange])

  const days = useMemo(() => {
    const start = fromZonedTime(`${range.start}T00:00:00`, BERLIN_TZ)
    const end = fromZonedTime(`${range.end}T00:00:00`, BERLIN_TZ)
    const list: string[] = []
    let cursor = start
    while (cursor <= end) {
      const dayString = formatInTimeZone(cursor, BERLIN_TZ, "yyyy-MM-dd")
      if (!showWeekends) {
        const dayDate = fromZonedTime(`${dayString}T00:00:00`, BERLIN_TZ)
        const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6
        if (isWeekend) {
          cursor = addDays(cursor, 1)
          continue
        }
      }
      list.push(dayString)
      cursor = addDays(cursor, 1)
    }
    return list
  }, [range, showWeekends])

  const saldoDays = useMemo(() => {
    const start = fromZonedTime(`${saldoPeriodRange.start}T00:00:00`, BERLIN_TZ)
    const end = fromZonedTime(`${saldoPeriodRange.end}T00:00:00`, BERLIN_TZ)
    const list: string[] = []
    let cursor = start
    while (cursor <= end) {
      list.push(formatInTimeZone(cursor, BERLIN_TZ, "yyyy-MM-dd"))
      cursor = addDays(cursor, 1)
    }
    return list
  }, [saldoPeriodRange])

  const reloadEntries = async (start: string, end: string) => {
    const response = await fetch(`/api/time?start=${start}&end=${end}`)
    if (!response.ok) {
      setError("Einträge konnten nicht geladen werden")
      return
    }
    const data = await response.json()
    setEntries(data.entries ?? [])
    setError(null)
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      await reloadEntries(dataRange.start, dataRange.end)
      setLoading(false)
    }
    load()
  }, [dataRange])

  useEffect(() => {
    const load = async () => {
      const response = await fetch("/api/autocomplete")
      const data = await response.json()
      setNoteSuggestions(data.notes ?? [])
    }
    load()
  }, [])

  const entryMap = useMemo(() => {
    return new Map(entries.map((entry) => [entry.date, entry]))
  }, [entries])

  const handleSave = async (event: React.FormEvent<HTMLFormElement>, day: string) => {
    event.preventDefault()
    setError(null)
    const form = event.currentTarget
    const formData = new FormData(form)
    const payload = {
      date: day,
      start: String(formData.get("start")),
      end: String(formData.get("end")),
      breakMinutes: Number(formData.get("breakMinutes")),
      note: String(formData.get("note") ?? "")
    }
    const response = await fetch("/api/time", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      setError(data.error ?? "Speichern fehlgeschlagen")
      return
    }
    await reloadEntries(dataRange.start, dataRange.end)
  }

  const copyYesterday = async () => {
    setError(null)
    const response = await fetch("/api/quick/copy-yesterday", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date })
    })
    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      setError(data.error ?? "Kopieren fehlgeschlagen")
      return
    }
    await reloadEntries(dataRange.start, dataRange.end)
  }

  const fillWeek = async () => {
    setError(null)
    const response = await fetch("/api/quick/fill-week", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date })
    })
    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      setError(data.error ?? "Woche auffüllen fehlgeschlagen")
      return
    }
    await reloadEntries(dataRange.start, dataRange.end)
  }

  const holidayMap = useMemo(() => {
    return new Map(holidays.map((h) => [h.date, h.name]))
  }, [holidays])

  const moveRange = (direction: "prev" | "next") => {
    const current = fromZonedTime(`${date}T00:00:00`, BERLIN_TZ)
    const factor = direction === "prev" ? -1 : 1
    const nextDate =
      view === "day"
        ? addDays(current, factor)
        : view === "week"
          ? addWeeks(current, factor)
          : addMonths(current, factor)
    setDate(formatInTimeZone(nextDate, BERLIN_TZ, "yyyy-MM-dd"))
  }

  const aggregatedSaldo = useMemo(() => {
    return saldoDays.reduce((sum, day) => {
      const entry = entryMap.get(day)
      const total = entry ? workMinutes(entry) : 0
      const dayDate = fromZonedTime(`${day}T00:00:00`, BERLIN_TZ)
      const holiday = holidayMap.get(day)
      const target = holiday ? 0 : targetForWeekday(dayDate.getDay())
      return sum + (total - target)
    }, 0)
  }, [saldoDays, entryMap, holidayMap, targetForWeekday])

  return (
    <div className="space-y-6">
      {error ? <div className="text-sm text-ember">{error}</div> : null}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="font-display text-3xl">Zeiterfassung</h2>
        </div>
        <div className="flex items-center gap-3 text-sm text-[#6b5e51] flex-nowrap overflow-x-auto">
          <span>Saldo:</span>
          <span className={aggregatedSaldo >= 0 ? "text-accent" : "text-ember"}>
            {aggregatedSaldo >= 0 ? "+" : ""}
            {minutesToTime(Math.abs(aggregatedSaldo))}
          </span>
          <select
            className="input max-w-[120px] py-1 text-xs"
            value={saldoRange}
            onChange={(event) => setSaldoRange(event.target.value as "week" | "month" | "year")}
          >
            <option value="week">Woche</option>
            <option value="month">Monat</option>
            <option value="year">Jahr</option>
          </select>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={showWeekends}
              onChange={(event) => setShowWeekends(event.target.checked)}
            />
            <div className="w-10 h-5 bg-sand rounded-full peer peer-checked:bg-accent transition" />
            <div className="absolute left-0.5 top-0.5 h-4 w-4 bg-white rounded-full transition peer-checked:translate-x-5" />
          </label>
          <span className="text-xs text-[#6b5e51]">Wochenenden anzeigen</span>
          {loading ? <span>Lädt...</span> : null}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-nowrap overflow-x-auto">
          <div className="flex gap-1">
            {(["day", "week", "month"] as const).map((item) => (
              <button
                key={item}
                className={`btn px-3 py-1 text-xs ${view === item ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setView(item)}
                type="button"
              >
                {item === "day" ? "Tag" : item === "week" ? "Woche" : "Monat"}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <button
              className="btn btn-ghost px-2 py-1 text-xs"
              type="button"
              onClick={() => moveRange("prev")}
            >
              ‹
            </button>
            <input
              className="input w-[160px] py-1 text-xs"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
            <button
              className="btn btn-ghost px-2 py-1 text-xs"
              type="button"
              onClick={() => moveRange("next")}
            >
              ›
            </button>
          </div>
        </div>
        <div className="ml-auto flex flex-nowrap gap-2">
          <button className="btn btn-ghost px-3 py-1 text-xs" type="button" onClick={copyYesterday}>
            Heute von gestern kopieren
          </button>
          <button className="btn btn-ghost px-3 py-1 text-xs" type="button" onClick={fillWeek}>
            Woche automatisch auffüllen
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {days.map((day) => {
          const entry = entryMap.get(day)
          const total = entry ? workMinutes(entry) : 0
          const dayDate = fromZonedTime(`${day}T00:00:00`, BERLIN_TZ)
          const holiday = holidayMap.get(day)
          const target = holiday ? 0 : targetForWeekday(dayDate.getDay())
          const diff = total - target
          return (
            <div
              key={day}
              className={`card p-5 grid gap-4 ${
                entry ? "!border-accent" : ""
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-display text-lg">
                    {new Intl.DateTimeFormat("de-DE", { weekday: "short", timeZone: BERLIN_TZ })
                      .format(dayDate)
                      .replace(".", "")}
                    {", "}
                    {formatInTimeZone(dayDate, BERLIN_TZ, "dd.MM.yyyy")}
                  </div>
                {holiday ? (
                  <div className="text-sm text-[#6b5e51]">{`Feiertag: ${holiday}`}</div>
                ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <div className={`text-sm ${diff >= 0 ? "text-accent" : "text-ember"}`}>
                    {diff >= 0 ? "+" : "-"}
                    {minutesToTime(Math.abs(diff))}
                  </div>
                  {entry ? (
                    <span className="text-accent" title="Gespeichert" aria-label="Gespeichert">
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          clipRule="evenodd"
                          d="M9.86338 18.0001C9.58738 18.0001 9.32338 17.8861 9.13438 17.6851L4.27138 12.5061C3.89238 12.1041 3.91338 11.4711 4.31538 11.0931C4.71838 10.7151 5.35138 10.7351 5.72838 11.1371L9.85338 15.5281L18.2614 6.32611C18.6354 5.91711 19.2674 5.89011 19.6754 6.26211C20.0824 6.63411 20.1104 7.26711 19.7384 7.67411L10.6014 17.6741C10.4144 17.8801 10.1484 17.9981 9.87038 18.0001H9.86338Z"
                          fill="currentColor"
                        />
                      </svg>
                    </span>
                  ) : null}
                </div>
              </div>
              <form className="grid gap-3" onSubmit={(event) => handleSave(event, day)}>
                <div className="grid gap-3 md:grid-cols-3">
                  <label className="flex flex-col gap-2">
                    <span className="label">Start</span>
                    <input
                      className="input"
                      name="start"
                      type="time"
                      defaultValue={entry ? minutesToTime(entry.startMinutes) : "09:00"}
                      required
                    />
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className="label">Ende</span>
                    <input
                      className="input"
                      name="end"
                      type="time"
                      defaultValue={entry ? minutesToTime(entry.endMinutes) : "17:30"}
                      required
                    />
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className="label">Pause (Min.)</span>
                    <input
                      className="input"
                      name="breakMinutes"
                      type="number"
                      min={0}
                      defaultValue={entry ? entry.breakMinutes : 30}
                    />
                  </label>
                </div>
                <label className="flex flex-col gap-2">
                  <span className="label">Was habe ich gemacht?</span>
                  <input
                    className="input"
                    list="note-suggestions"
                    name="note"
                    defaultValue={entry?.note ?? ""}
                  />
                </label>
                <div className="flex justify-end gap-2">
                  <button
                    className="btn btn-ghost px-3 py-1 text-xs hover:translate-y-[-1px] hover:shadow-soft"
                    type="button"
                    onClick={async () => {
                      setError(null)
                      const res = await fetch(`/api/time?date=${day}`, { method: "DELETE" })
                      if (!res.ok) {
                        setError("Löschen fehlgeschlagen")
                        return
                      }
                      await reloadEntries(dataRange.start, dataRange.end)
                    }}
                    aria-label="Eintrag löschen"
                    title="Eintrag löschen"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M18 19C18 19.551 17.552 20 17 20H7C6.448 20 6 19.551 6 19V8H18V19ZM10 4.328C10 4.173 10.214 4 10.5 4H13.5C13.786 4 14 4.173 14 4.328V6H10V4.328ZM21 6H20H16V4.328C16 3.044 14.879 2 13.5 2H10.5C9.121 2 8 3.044 8 4.328V6H4H3C2.45 6 2 6.45 2 7C2 7.55 2.45 8 3 8H4V19C4 20.654 5.346 22 7 22H17C18.654 22 20 20.654 20 19V8H21C21.55 8 22 7.55 22 7C22 6.45 21.55 6 21 6Z"
                        fill="currentColor"
                      />
                    </svg>
                  </button>
                  <button className="btn btn-primary" type="submit">
                    Speichern
                  </button>
                </div>
              </form>
            </div>
          )
        })}
      </div>
      <datalist id="note-suggestions">
        {noteSuggestions.map((note) => (
          <option key={note} value={note} />
        ))}
      </datalist>
    </div>
  )
}
