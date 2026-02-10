"use client"

import { useMemo, useState } from "react"

export function RegisterForm({ error }: { error?: string | null }) {
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")

  const checks = useMemo(() => {
    return {
      length: password.length >= 8,
      upper: /[A-Z]/.test(password),
      lower: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password),
      match: confirm.length > 0 ? password === confirm : false
    }
  }, [password, confirm])

  const items = [
    { key: "length", label: "Mindestens 8 Zeichen" },
    { key: "upper", label: "1 Großbuchstabe" },
    { key: "lower", label: "1 Kleinbuchstabe" },
    { key: "number", label: "1 Zahl" },
    { key: "special", label: "1 Sonderzeichen" }
  ] as const

  return (
    <form className="space-y-4" method="post" action="/api/auth/register">
      {error ? <div className="text-sm text-ember">{error}</div> : null}
      <label className="flex flex-col gap-2">
        <span className="label">Name</span>
        <input className="input" type="text" name="name" required />
      </label>
      <label className="flex flex-col gap-2">
        <span className="label">E-Mail</span>
        <input className="input" type="email" name="email" required />
      </label>
      <label className="flex flex-col gap-2">
        <span className="label">Passwort</span>
        <input
          className="input"
          type="password"
          name="password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>
      <div className="rounded-xl border border-sand bg-sand/40 p-3 text-xs text-[#6b5e51]">
        <div className="font-semibold mb-2">Passwort-Anforderungen</div>
        <div className="grid gap-1">
          {items.map((item) => (
            <div
              key={item.key}
              className={`flex items-center gap-2 ${checks[item.key] ? "text-accent" : ""}`}
            >
              <span className="text-[10px]">{checks[item.key] ? "✓" : "○"}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
      <label className="flex flex-col gap-2">
        <span className="label">Passwort wiederholen</span>
        <input
          className="input"
          type="password"
          name="passwordConfirm"
          required
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
        />
      </label>
      <div className="text-xs text-[#6b5e51]">
        {confirm.length > 0 ? (
          <span className={checks.match ? "text-accent" : "text-ember"}>
            {checks.match ? "Passwörter stimmen überein" : "Passwörter stimmen nicht überein"}
          </span>
        ) : null}
      </div>
      <button className="btn btn-primary w-full" type="submit">
        Registrieren
      </button>
    </form>
  )
}
