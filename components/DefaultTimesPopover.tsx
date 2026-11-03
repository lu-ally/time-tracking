"use client"

import { useState } from "react"
import { minutesToTime, timeToMinutes } from "../lib/time"

export function DefaultTimesPopover({
  startMinutes,
  breakMinutes,
  onSaved
}: {
  startMinutes: number
  breakMinutes: number
  onSaved: (startMinutes: number, breakMinutes: number) => void
}) {
  const [open, setOpen] = useState(false)
  const [start, setStart] = useState(minutesToTime(startMinutes))
  const [pause, setPause] = useState(String(breakMinutes))
  const [error, setError] = useState<string | null>(null)

  const toggle = () => {
    if (!open) {
      setStart(minutesToTime(startMinutes))
      setPause(String(breakMinutes))
      setError(null)
    }
    setOpen(!open)
  }

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    const nextStart = timeToMinutes(start)
    const nextBreak = Number(pause)
    const response = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ defaultStartMinutes: nextStart, defaultBreakMinutes: nextBreak })
    })
    if (!response.ok) {
      setError("Speichern fehlgeschlagen")
      return
    }
    onSaved(nextStart, nextBreak)
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        className="btn btn-ghost px-3 py-1 text-xs"
        type="button"
        aria-expanded={open}
        aria-label="Standardzeiten"
        title="Standardzeiten"
        onClick={toggle}
      >
        ⚙
      </button>
      {open ? (
        <form
          onSubmit={submit}
          className="card absolute right-0 top-full z-20 mt-2 grid w-64 gap-3 p-4 text-sm"
        >
          <div className="font-semibold">Standardzeiten</div>
          <label className="grid gap-1 text-xs">
            Arbeitsbeginn
            <input
              type="time"
              required
              className="input py-1"
              value={start}
              onChange={(event) => setStart(event.target.value)}
            />
          </label>
          <label className="grid gap-1 text-xs">
            Pause (Minuten)
            <input
              type="number"
              required
              min={0}
              max={240}
              step={5}
              className="input py-1"
              value={pause}
              onChange={(event) => setPause(event.target.value)}
            />
          </label>
          <p className="text-xs text-[#6b5e51]">Die Endzeit wird automatisch berechnet.</p>
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
          <button type="submit" className="btn btn-primary px-3 py-1 text-xs justify-self-start">
            Speichern
          </button>
        </form>
      ) : null}
    </div>
  )
}
