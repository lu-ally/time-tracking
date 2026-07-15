"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  isWithinInterval,
  startOfMonth,
  startOfWeek,
  subMonths
} from "date-fns"
import { formatInTimeZone, fromZonedTime } from "date-fns-tz"
import { BERLIN_TZ } from "../lib/time"
import { Holiday } from "../lib/holidays"
import { leaveDaysUsed } from "../lib/calculations"

export type LeaveEntry = {
  id: string
  startDate: string
  endDate: string
  halfDayStart: boolean
  halfDayEnd: boolean
  user?: { id: string; name: string }
}

export function LeaveClient({
  initialDate,
  holidays,
  allowance,
  used,
  currentUserId
}: {
  initialDate: string
  holidays: Holiday[]
  allowance: number
  used: number
  currentUserId: string
}) {
  const [date, setDate] = useState(initialDate)
  const [entries, setEntries] = useState<LeaveEntry[]>([])
  const [teamEntries, setTeamEntries] = useState<LeaveEntry[]>([])
  const [filter, setFilter] = useState("all")
  const [showModal, setShowModal] = useState(false)
  const [modalStart, setModalStart] = useState(initialDate)
  const [modalEnd, setModalEnd] = useState(initialDate)
  const [modalHalfDayStart, setModalHalfDayStart] = useState(false)
  const [modalHalfDayEnd, setModalHalfDayEnd] = useState(false)
  const [editingEntry, setEditingEntry] = useState<LeaveEntry | null>(null)
  const [popoverDay, setPopoverDay] = useState<string | null>(null)
  const [rangeSelecting, setRangeSelecting] = useState(false)
  const [pickerMonth, setPickerMonth] = useState(initialDate)
  const [error, setError] = useState<string | null>(null)
  const dialogRef = useRef<HTMLDialogElement | null>(null)

  const year = Number(date.split("-")[0])

  const load = useCallback(async () => {
    const response = await fetch(`/api/leave?start=${year}-01-01&end=${year}-12-31`)
    const data = await response.json()
    setEntries(data.entries ?? [])

    const teamResponse = await fetch(`/api/leave?start=${year}-01-01&end=${year}-12-31&team=true`)
    const teamData = await teamResponse.json()
    setTeamEntries(teamData.entries ?? [])
  }, [year])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    setPopoverDay(null)
  }, [filter, date])


  useEffect(() => {
    if (!dialogRef.current) return
    if (showModal) {
      if (editingEntry) {
        setModalStart(editingEntry.startDate)
        setModalEnd(editingEntry.endDate)
        setModalHalfDayStart(editingEntry.halfDayStart)
        setModalHalfDayEnd(editingEntry.halfDayEnd)
      } else {
        setModalStart(date)
        setModalEnd(date)
        setModalHalfDayStart(false)
        setModalHalfDayEnd(false)
      }
      setRangeSelecting(false)
      setPickerMonth(date)
      dialogRef.current.showModal()
    } else if (dialogRef.current.open) {
      dialogRef.current.close()
    }
  }, [showModal, editingEntry, date])

  const usedLocal = useMemo(() => {
    if (entries.length === 0) return used
    return entries.reduce((sum, entry) => {
      return (
        sum +
        leaveDaysUsed(
          entry.startDate,
          entry.endDate,
          entry.halfDayStart,
          entry.halfDayEnd,
          holidays
        )
      )
    }, 0)
  }, [entries, holidays, used])

  const remainingLocal = allowance - usedLocal
  const formatDays = useCallback((value: number) => {
    return new Intl.NumberFormat("de-DE", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(value)
  }, [])

  const filteredTeam = useMemo(() => {
    if (filter === "all") return teamEntries
    return teamEntries.filter((entry) => entry.user?.id === filter)
  }, [teamEntries, filter])

  const users = Array.from(
    new Map(
      teamEntries
        .filter((entry) => entry.user?.id)
        .map((entry) => [entry.user!.id, entry.user!.name])
    ).entries()
  )

  const monthLabel = useMemo(() => {
    const label = new Intl.DateTimeFormat("de-DE", { month: "long", year: "numeric" }).format(
      fromZonedTime(`${date}T00:00:00`, BERLIN_TZ)
    )
    return label.charAt(0).toUpperCase() + label.slice(1)
  }, [date])

  const holidayMap = useMemo(() => {
    return new Map(holidays.map((holiday) => [holiday.date, holiday.name]))
  }, [holidays])

  const pickerMonthLabel = useMemo(() => {
    const label = new Intl.DateTimeFormat("de-DE", { month: "long", year: "numeric" }).format(
      fromZonedTime(`${pickerMonth}T00:00:00`, BERLIN_TZ)
    )
    return label.charAt(0).toUpperCase() + label.slice(1)
  }, [pickerMonth])

  const pickerGrid = useMemo(() => {
    const base = fromZonedTime(`${pickerMonth}T00:00:00`, BERLIN_TZ)
    const monthStart = startOfMonth(base)
    const monthEnd = endOfMonth(monthStart)
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
    const days: Date[] = []
    let cursor = gridStart
    while (cursor <= gridEnd) {
      days.push(cursor)
      cursor = addDays(cursor, 1)
    }
    return { days, monthStart, monthEnd }
  }, [pickerMonth])


  const monthGrid = useMemo(() => {
    const monthStart = startOfMonth(fromZonedTime(`${date}T00:00:00`, BERLIN_TZ))
    const monthEnd = endOfMonth(monthStart)
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
    const days: Date[] = []
    let cursor = gridStart
    while (cursor <= gridEnd) {
      days.push(cursor)
      cursor = addDays(cursor, 1)
    }
    return days
  }, [date])

  const entriesByDay = useMemo(() => {
    const map = new Map<string, LeaveEntry[]>()
    for (const entry of filteredTeam) {
      const start = fromZonedTime(`${entry.startDate}T00:00:00`, BERLIN_TZ)
      const end = fromZonedTime(`${entry.endDate}T00:00:00`, BERLIN_TZ)
      let cursor = start
      while (cursor <= end) {
        const key = formatInTimeZone(cursor, BERLIN_TZ, "yyyy-MM-dd")
        map.set(key, [...(map.get(key) ?? []), entry])
        cursor = addDays(cursor, 1)
      }
    }
    return map
  }, [filteredTeam])

  const handleSubmit = async () => {
    setError(null)
    const payload = {
      startDate: modalStart,
      endDate: modalEnd,
      halfDayStart: modalHalfDayStart,
      halfDayEnd: modalHalfDayEnd
    }

    const response = await fetch("/api/leave", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      setError(data.error ?? "Speichern fehlgeschlagen")
      return
    }

    await load()
  }

  const previewUsedDays = useMemo(() => {
    return leaveDaysUsed(modalStart, modalEnd, modalHalfDayStart, modalHalfDayEnd, holidays)
  }, [modalStart, modalEnd, modalHalfDayStart, modalHalfDayEnd, holidays])

  const conflictDates = useMemo(() => {
    const map = new Map<string, number>()
    for (const entry of teamEntries) {
      const start = fromZonedTime(`${entry.startDate}T00:00:00`, BERLIN_TZ)
      const end = fromZonedTime(`${entry.endDate}T00:00:00`, BERLIN_TZ)
      let cursor = start
      while (cursor <= end) {
        const key = formatInTimeZone(cursor, BERLIN_TZ, "yyyy-MM-dd")
        map.set(key, (map.get(key) ?? 0) + 1)
        cursor = addDays(cursor, 1)
      }
    }
    return map
  }, [teamEntries])

  return (
    <div className="grid gap-6">
      {error ? <div className="text-sm text-ember">{error}</div> : null}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="card p-5">
          <div className="text-sm text-[#6b5e51]">Gesamtanspruch</div>
          <div className="font-display text-3xl">{formatDays(allowance)} Tage</div>
        </div>
        <div className="card p-5">
          <div className="text-sm text-[#6b5e51]">Verbraucht</div>
          <div className="font-display text-3xl">{formatDays(usedLocal)} Tage</div>
        </div>
        <div className="card p-5">
          <div className="text-sm text-[#6b5e51]">Verbleibend</div>
          <div
            className={`font-display text-3xl ${remainingLocal < 0 ? "text-ember" : "text-accent"}`}
          >
            {formatDays(remainingLocal)} Tage
          </div>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="font-display text-xl">Teamkalender</h2>
            <div className="flex items-center gap-2 text-sm text-[#6b5e51] mt-1">
              <button
                className="btn btn-ghost px-2 py-1 text-xs w-8 justify-center"
                type="button"
                onClick={() =>
                  setDate(formatInTimeZone(subMonths(fromZonedTime(`${date}T00:00:00`, BERLIN_TZ), 1), BERLIN_TZ, "yyyy-MM-dd"))
                }
              >
                ‹
              </button>
              <span className="min-w-[140px] text-center">{monthLabel}</span>
              <button
                className="btn btn-ghost px-2 py-1 text-xs w-8 justify-center"
                type="button"
                onClick={() =>
                  setDate(formatInTimeZone(addMonths(fromZonedTime(`${date}T00:00:00`, BERLIN_TZ), 1), BERLIN_TZ, "yyyy-MM-dd"))
                }
              >
                ›
              </button>
              <button
                className="btn btn-ghost px-2 py-1 text-xs w-[64px] justify-center"
                type="button"
                onClick={() =>
                  setDate(formatInTimeZone(fromZonedTime(`${initialDate}T00:00:00`, BERLIN_TZ), BERLIN_TZ, "yyyy-MM-dd"))
                }
              >
                Heute
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <select
              className="input max-w-xs"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            >
              <option value="all">Alle</option>
              {users.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
            <button
              className="btn btn-primary whitespace-nowrap"
              type="button"
              onClick={() => setShowModal(true)}
            >
              Urlaub eintragen
            </button>
          </div>
        </div>
        {filteredTeam.length === 0 ? (
          <div className="text-[#6b5e51]">Keine Einträge.</div>
        ) : (
          <div className="grid gap-4">
            <div className="grid grid-cols-7 gap-2 text-xs text-[#6b5e51]">
              {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((label) => (
                <div key={label} className="text-center font-semibold">
                  {label}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {monthGrid.map((day) => {
                const key = formatInTimeZone(day, BERLIN_TZ, "yyyy-MM-dd")
                const isCurrentMonth = formatInTimeZone(day, BERLIN_TZ, "MM") === date.slice(5, 7)
                const isToday = key === initialDate
                const dayEntries = entriesByDay.get(key) ?? []
                const conflictCount = conflictDates.get(key) ?? 0
                const holidayName = holidayMap.get(key)
                const maxVisible = 3
                const extraCount = dayEntries.length > maxVisible ? dayEntries.length - maxVisible : 0
                return (
                  <div
                    key={key}
                    className={`relative min-h-[90px] rounded-xl border p-2 ${
                      isToday ? "border-accent ring-1 ring-accent/40" : "border-sand"
                    } ${isCurrentMonth ? "bg-white" : "bg-sand/40 text-[#6b5e51]"} ${
                      holidayName ? "bg-emerald-50 border-emerald-200" : ""
                    }`}
                  >
                    <div className={`text-xs mb-1 ${isToday ? "font-bold text-accent" : ""}`}>
                      {formatInTimeZone(day, BERLIN_TZ, "dd.MM.yyyy")}
                    </div>
                    {holidayName ? (
                      <div className="inline-flex items-center gap-1 rounded-full bg-emerald-200 px-2 py-0.5 text-[10px] text-emerald-900 mb-1">
                        {holidayName}
                      </div>
                    ) : null}
                    <div className="space-y-1">
                      {dayEntries.slice(0, maxVisible).map((entry) => {
                        const isMine = entry.user?.id === currentUserId
                        return (
                          <button
                            key={entry.id}
                            type="button"
                            className={`block w-full text-[11px] truncate text-left ${
                              isMine ? "font-semibold text-ink hover:underline" : "text-[#6b5e51] cursor-default"
                            }`}
                            onClick={() => {
                              if (!isMine) return
                              setEditingEntry(entry)
                              setModalStart(entry.startDate)
                              setModalEnd(entry.endDate)
                              setShowModal(true)
                            }}
                          >
                            {entry.user?.name ?? "Ich"}
                          </button>
                        )
                      })}
                      {extraCount > 0 ? (
                        <button
                          type="button"
                          className="text-[11px] text-[#6b5e51] hover:underline"
                          onClick={() => setPopoverDay(popoverDay === key ? null : key)}
                        >
                          +{extraCount} weitere
                        </button>
                      ) : null}
                      {conflictCount >= 3 ? (
                        <div className="text-[10px] text-ember">Viele Abwesenheiten</div>
                      ) : null}
                    </div>
                    {popoverDay === key ? (
                      <div className="absolute z-10 left-2 right-2 top-8 rounded-lg border border-sand bg-white p-2 text-[11px] shadow-soft">
                        <div className="font-semibold mb-1">Weitere Einträge</div>
                        <div className="space-y-1 max-h-24 overflow-auto">
                          {dayEntries.slice(maxVisible).map((entry) => (
                            <button
                              key={entry.id}
                              type="button"
                              className={`text-left ${
                                entry.user?.id === currentUserId ? "font-semibold text-ink" : "text-[#6b5e51]"
                              }`}
                              onClick={() => {
                                if (entry.user?.id !== currentUserId) return
                                setEditingEntry(entry)
                                setModalStart(entry.startDate)
                                setModalEnd(entry.endDate)
                                setShowModal(true)
                              }}
                            >
                              {entry.user?.name ?? "Ich"}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <dialog
        ref={dialogRef}
        className="backdrop:bg-black/40 rounded-2xl p-0 border border-sand w-full max-w-lg"
        onClose={() => setShowModal(false)}
        onCancel={(event) => {
          event.preventDefault()
          setShowModal(false)
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) setShowModal(false)
        }}
      >
        <div className="card w-full max-w-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl">
              {editingEntry ? "Urlaub bearbeiten" : "Urlaub eintragen"}
            </h2>
            <button className="btn btn-ghost" type="button" onClick={() => setShowModal(false)}>
              Schließen
            </button>
          </div>
          <form
            className="grid gap-4"
            onSubmit={async (event) => {
              event.preventDefault()
              setError(null)
              if (editingEntry) {
                const response = await fetch("/api/leave", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    id: editingEntry.id,
                    startDate: modalStart,
                    endDate: modalEnd,
                    halfDayStart: modalHalfDayStart,
                    halfDayEnd: modalHalfDayEnd
                  })
                })
                if (!response.ok) {
                  const data = await response.json().catch(() => ({}))
                  setError(data.error ?? "Speichern fehlgeschlagen")
                  return
                }
              } else {
                await handleSubmit()
              }
              setEditingEntry(null)
              setShowModal(false)
              await load()
            }}
          >
            <input type="hidden" name="startDate" value={modalStart} />
            <input type="hidden" name="endDate" value={modalEnd} />
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-[#6b5e51]">
              <div>
                Zeitraum: {formatInTimeZone(fromZonedTime(`${modalStart}T00:00:00`, BERLIN_TZ), BERLIN_TZ, "dd.MM.yyyy")} –{" "}
                {formatInTimeZone(fromZonedTime(`${modalEnd}T00:00:00`, BERLIN_TZ), BERLIN_TZ, "dd.MM.yyyy")}
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="btn btn-ghost px-2 py-1 text-xs w-8 justify-center"
                  type="button"
                  onClick={() =>
                    setPickerMonth(
                      formatInTimeZone(
                        subMonths(fromZonedTime(`${pickerMonth}T00:00:00`, BERLIN_TZ), 1),
                        BERLIN_TZ,
                        "yyyy-MM-dd"
                      )
                    )
                  }
                >
                  ‹
                </button>
                <span className="min-w-[140px] text-center">{pickerMonthLabel}</span>
                <button
                  className="btn btn-ghost px-2 py-1 text-xs w-8 justify-center"
                  type="button"
                  onClick={() =>
                    setPickerMonth(
                      formatInTimeZone(
                        addMonths(fromZonedTime(`${pickerMonth}T00:00:00`, BERLIN_TZ), 1),
                        BERLIN_TZ,
                        "yyyy-MM-dd"
                      )
                    )
                  }
                >
                  ›
                </button>
                <button
                  className="btn btn-ghost px-2 py-1 text-xs w-8 justify-center"
                  type="button"
                  onClick={() => {
                    setModalStart(date)
                    setModalEnd(date)
                  }}
                  aria-label="Range zurücksetzen"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-2 text-xs text-[#6b5e51]">
              {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((label) => (
                <div key={label} className="text-center font-semibold">
                  {label}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {pickerGrid.days.map((day) => {
                const key = formatInTimeZone(day, BERLIN_TZ, "yyyy-MM-dd")
                const isCurrentMonth =
                  formatInTimeZone(day, BERLIN_TZ, "MM") ===
                  formatInTimeZone(fromZonedTime(`${pickerMonth}T00:00:00`, BERLIN_TZ), BERLIN_TZ, "MM")
                const isToday = key === initialDate
                const holidayName = holidayMap.get(key)
                const isWeekend = day.getDay() === 0 || day.getDay() === 6
                const inRange = isWithinInterval(day, {
                  start: fromZonedTime(`${modalStart}T00:00:00`, BERLIN_TZ),
                  end: fromZonedTime(`${modalEnd}T00:00:00`, BERLIN_TZ)
                })
                const isStart = key === modalStart
                const isEnd = key === modalEnd
                return (
                  <button
                    key={key}
                    type="button"
                    className={`min-h-[44px] rounded-xl border p-1 text-[10px] text-left ${
                      isToday ? "border-accent ring-1 ring-accent/40" : "border-sand"
                    } ${isCurrentMonth ? "bg-white" : "bg-sand/40 text-[#6b5e51]"} ${
                      holidayName ? "bg-emerald-50 border-emerald-200" : ""
                    } ${inRange ? "ring-2 ring-accent/40" : ""} ${
                      isWeekend ? "opacity-60" : ""
                    } ${isStart || isEnd ? "bg-accent/20 text-ink border-accent" : ""}`}
                    onClick={() => {
                      if (!rangeSelecting) {
                        setModalStart(key)
                        setModalEnd(key)
                        setRangeSelecting(true)
                        return
                      }
                      if (key < modalStart) {
                        setModalEnd(modalStart)
                        setModalStart(key)
                      } else {
                        setModalEnd(key)
                      }
                      setRangeSelecting(false)
                    }}
                  >
                    <div className={isToday ? "font-bold text-accent" : ""}>{formatInTimeZone(day, BERLIN_TZ, "dd")}</div>
                    {holidayName ? <div className="mt-1 text-[8px] text-emerald-900 truncate">{holidayName}</div> : null}
                  </button>
                )
              })}
            </div>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="halfDayStart"
                  checked={modalHalfDayStart}
                  onChange={(event) => setModalHalfDayStart(event.target.checked)}
                />
                Start halbtägig
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="halfDayEnd"
                  checked={modalHalfDayEnd}
                  onChange={(event) => setModalHalfDayEnd(event.target.checked)}
                />
                Ende halbtägig
              </label>
            </div>
            <div className="text-sm text-[#6b5e51]">
              Verbrauch für diesen Eintrag: <span className="font-semibold text-ink">{formatDays(previewUsedDays)} Tage</span>
            </div>
            <div className="flex justify-between gap-2">
              {editingEntry ? (
                <button
                  className="btn btn-ghost text-ember"
                  type="button"
                  onClick={async () => {
                    setError(null)
                    const response = await fetch(`/api/leave?id=${editingEntry.id}`, { method: "DELETE" })
                    if (!response.ok) {
                      const data = await response.json().catch(() => ({}))
                      setError(data.error ?? "Löschen fehlgeschlagen")
                      return
                    }
                    setEditingEntry(null)
                    setShowModal(false)
                    await load()
                  }}
                >
                  Löschen
                </button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <button className="btn btn-ghost" type="button" onClick={() => setShowModal(false)}>
                  Abbrechen
                </button>
                <button className="btn btn-primary" type="submit">
                  {editingEntry ? "Speichern" : "Urlaub speichern"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </dialog>
    </div>
  )
}
