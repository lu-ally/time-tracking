"use client"

import { useCallback, useEffect, useState } from "react"

type Allowance = {
  id: string
  year: number
  annualDays: number
  carryOverDays: number
  adjustedDays: number
}

export function SettingsClient() {
  const [targets, setTargets] = useState({
    mon: "8,00",
    tue: "8,00",
    wed: "8,00",
    thu: "8,00",
    fri: "8,00",
    sat: "0,00",
    sun: "0,00"
  })
  const [allowances, setAllowances] = useState<Allowance[]>([])

  const load = useCallback(async () => {
    const response = await fetch("/api/settings")
    const data = await response.json()
    const minutes = data.settings?.targetMinutes ?? {}
    setTargets({
      mon: ((minutes.mon ?? 480) / 60).toFixed(2).replace(".", ","),
      tue: ((minutes.tue ?? 480) / 60).toFixed(2).replace(".", ","),
      wed: ((minutes.wed ?? 480) / 60).toFixed(2).replace(".", ","),
      thu: ((minutes.thu ?? 480) / 60).toFixed(2).replace(".", ","),
      fri: ((minutes.fri ?? 480) / 60).toFixed(2).replace(".", ","),
      sat: ((minutes.sat ?? 0) / 60).toFixed(2).replace(".", ","),
      sun: ((minutes.sun ?? 0) / 60).toFixed(2).replace(".", ",")
    })
    setAllowances(data.allowances ?? [])
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const save = async () => {
    const parseHours = (value: string) => Number(value.replace(",", "."))
    const minutes = {
      mon: Math.round(parseHours(targets.mon) * 60),
      tue: Math.round(parseHours(targets.tue) * 60),
      wed: Math.round(parseHours(targets.wed) * 60),
      thu: Math.round(parseHours(targets.thu) * 60),
      fri: Math.round(parseHours(targets.fri) * 60),
      sat: Math.round(parseHours(targets.sat) * 60),
      sun: Math.round(parseHours(targets.sun) * 60)
    }
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetMinutes: minutes })
    })
    await load()
  }

  return (
    <div className="grid gap-6">
      <div className="card p-6">
        <h2 className="font-display text-xl mb-4">Soll-Arbeitszeit</h2>
        <div className="flex items-end gap-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {([
              ["mon", "Montag"],
              ["tue", "Dienstag"],
              ["wed", "Mittwoch"],
              ["thu", "Donnerstag"],
              ["fri", "Freitag"],
              ["sat", "Samstag"],
              ["sun", "Sonntag"]
            ] as const).map(([key, label]) => (
              <label key={key} className="flex flex-col gap-2">
                <span className="label">{label}</span>
                <input
                  className="input"
                  type="text"
                  inputMode="decimal"
                  pattern="\\d+(,\\d{1,2})?"
                  value={targets[key]}
                  onChange={(event) =>
                    setTargets((prev) => ({
                      ...prev,
                      [key]: event.target.value.replace(".", ",")
                    }))
                  }
                />
              </label>
            ))}
          </div>
          <button className="btn btn-primary" type="button" onClick={save}>
            Speichern
          </button>
        </div>
      </div>
      <div className="card p-6">
        <h2 className="font-display text-xl mb-4">Urlaubskontingent</h2>
        {allowances.length === 0 ? (
          <p className="text-[#6b5e51]">Noch keine Einträge. Admin kann sie setzen.</p>
        ) : (
          <div className="grid gap-3">
            {allowances.map((allowance) => (
              <div key={allowance.id} className="border border-sand rounded-2xl p-4">
                <div className="font-medium">{allowance.year}</div>
                <div className="text-sm text-[#6b5e51]">
                  Jahresurlaub: {allowance.annualDays} | Rest: {allowance.carryOverDays} | Korrektur:{" "}
                  {allowance.adjustedDays}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
