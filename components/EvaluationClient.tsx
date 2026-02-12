"use client"

import { addMonths } from "date-fns"
import { formatInTimeZone, fromZonedTime } from "date-fns-tz"
import { useCallback, useEffect, useMemo, useState } from "react"
import { BERLIN_TZ } from "../lib/time"

type EvaluationRow = {
  userId: string
  name: string
  email: string
  recordedMinutesMonth: number
  saldoMinutesMonth: number
  saldoMinutesTotal: number
}

function formatMinutes(minutes: number) {
  const sign = minutes < 0 ? "-" : "+"
  const absolute = Math.abs(minutes)
  const hours = Math.floor(absolute / 60)
  const rest = absolute % 60
  return `${sign}${String(hours).padStart(2, "0")}:${String(rest).padStart(2, "0")}`
}

function formatUnsignedMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return `${String(hours).padStart(2, "0")}:${String(rest).padStart(2, "0")}`
}

export function EvaluationClient({ initialMonth }: { initialMonth: string }) {
  const [month, setMonth] = useState(initialMonth)
  const [rows, setRows] = useState<EvaluationRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const response = await fetch(`/api/admin/evaluation?month=${month}`, { cache: "no-store" })
    if (!response.ok) {
      setError("Auswertung konnte nicht geladen werden")
      setLoading(false)
      return
    }
    const data = await response.json()
    setRows(data.rows ?? [])
    setError(null)
    setLoading(false)
  }, [month])

  useEffect(() => {
    void load()
  }, [load])

  const monthLabel = useMemo(() => {
    const date = fromZonedTime(`${month}-01T00:00:00`, BERLIN_TZ)
    const label = new Intl.DateTimeFormat("de-DE", { month: "long", year: "numeric" }).format(date)
    return label.charAt(0).toUpperCase() + label.slice(1)
  }, [month])

  const moveMonth = (direction: "prev" | "next") => {
    const base = fromZonedTime(`${month}-01T00:00:00`, BERLIN_TZ)
    const next = direction === "prev" ? addMonths(base, -1) : addMonths(base, 1)
    setMonth(formatInTimeZone(next, BERLIN_TZ, "yyyy-MM"))
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button className="btn btn-ghost px-2 py-1 text-xs" type="button" onClick={() => moveMonth("prev")}>
            ‹
          </button>
          <div className="font-medium">{monthLabel}</div>
          <button className="btn btn-ghost px-2 py-1 text-xs" type="button" onClick={() => moveMonth("next")}>
            ›
          </button>
        </div>
        <div className="flex items-center gap-2">
          <a className="btn btn-primary px-3 py-1 text-xs whitespace-nowrap" href="/api/admin/evaluation/export">
            CSV Export (Alle User)
          </a>
          {loading ? <span className="text-sm text-[#6b5e51]">Lädt...</span> : null}
        </div>
      </div>

      {error ? <div className="text-sm text-ember">{error}</div> : null}

      <div className="card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-sand text-left">
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">E-Mail</th>
              <th className="px-4 py-3">Erfasst (Monat)</th>
              <th className="px-4 py-3">Saldo (Monat)</th>
              <th className="px-4 py-3">Saldo (Gesamt)</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-4 text-[#6b5e51]" colSpan={5}>
                  Keine User vorhanden.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.userId} className="border-b border-sand/60">
                  <td className="px-4 py-3 font-medium">{row.name}</td>
                  <td className="px-4 py-3 text-[#6b5e51]">{row.email}</td>
                  <td className="px-4 py-3">{formatUnsignedMinutes(row.recordedMinutesMonth)}</td>
                  <td className={`px-4 py-3 ${row.saldoMinutesMonth >= 0 ? "text-accent" : "text-ember"}`}>
                    {formatMinutes(row.saldoMinutesMonth)}
                  </td>
                  <td className={`px-4 py-3 ${row.saldoMinutesTotal >= 0 ? "text-accent" : "text-ember"}`}>
                    {formatMinutes(row.saldoMinutesTotal)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
