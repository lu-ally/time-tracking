"use client"

import { useCallback, useEffect, useRef, useState } from "react"

type User = {
  id: string
  email: string
  name: string
  role: "user" | "admin"
  targetMinutesMon: number
  targetMinutesTue: number
  targetMinutesWed: number
  targetMinutesThu: number
  targetMinutesFri: number
  targetMinutesSat: number
  targetMinutesSun: number
}

type SaveState = "idle" | "saving" | "success"

export function AdminClient() {
  const [users, setUsers] = useState<User[]>([])
  const [error, setError] = useState<string | null>(null)
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "user" as "user" | "admin"
  })
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<{
    id: string
    name: string
    email: string
  } | null>(null)
  const [resetPasswordFor, setResetPasswordFor] = useState<{
    id: string
    name: string
    email: string
  } | null>(null)
  const [resetPassword, setResetPassword] = useState("")
  const [resetConfirm, setResetConfirm] = useState("")
  const [targetSaveStates, setTargetSaveStates] = useState<Record<string, SaveState>>({})
  const [allowanceSaveState, setAllowanceSaveState] = useState<SaveState>("idle")
  const dialogRef = useRef<HTMLDialogElement | null>(null)
  const deleteDialogRef = useRef<HTMLDialogElement | null>(null)
  const resetDialogRef = useRef<HTMLDialogElement | null>(null)
  const targetSaveTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const allowanceSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const weekdays = [
    { key: "mon", label: "Mo" },
    { key: "tue", label: "Di" },
    { key: "wed", label: "Mi" },
    { key: "thu", label: "Do" },
    { key: "fri", label: "Fr" },
    { key: "sat", label: "Sa" },
    { key: "sun", label: "So" }
  ] as const

  const load = useCallback(async () => {
    const usersResponse = await fetch("/api/admin/users", { cache: "no-store" })
    const usersData = await usersResponse.json()
    setUsers(usersData.users ?? [])
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!dialogRef.current) return
    if (showCreateModal) {
      dialogRef.current.showModal()
    } else if (dialogRef.current.open) {
      dialogRef.current.close()
    }
  }, [showCreateModal])

  useEffect(() => {
    if (!deleteDialogRef.current) return
    if (confirmDelete) {
      deleteDialogRef.current.showModal()
    } else if (deleteDialogRef.current.open) {
      deleteDialogRef.current.close()
    }
  }, [confirmDelete])

  useEffect(() => {
    if (!resetDialogRef.current) return
    if (resetPasswordFor) {
      resetDialogRef.current.showModal()
    } else if (resetDialogRef.current.open) {
      resetDialogRef.current.close()
    }
  }, [resetPasswordFor])

  useEffect(() => {
    const targetTimers = targetSaveTimersRef.current
    const allowanceTimer = allowanceSaveTimerRef.current
    return () => {
      for (const timer of Object.values(targetTimers)) {
        clearTimeout(timer)
      }
      if (allowanceTimer) {
        clearTimeout(allowanceTimer)
      }
    }
  }, [])

  const updateAllowance = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setAllowanceSaveState("saving")
    const formData = new FormData(event.currentTarget)
    const payload = {
      userId: String(formData.get("userId")),
      year: Number(formData.get("year")),
      annualDays: Number(formData.get("annualDays")),
      carryOverDays: Number(formData.get("carryOverDays")),
      adjustedDays: Number(formData.get("adjustedDays"))
    }

    const response = await fetch("/api/admin/allowance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      setAllowanceSaveState("idle")
      setError(data.error ?? "Urlaubskorrektur konnte nicht gespeichert werden")
      return
    }
    await load()
    if (allowanceSaveTimerRef.current) {
      clearTimeout(allowanceSaveTimerRef.current)
    }
    setAllowanceSaveState("success")
    allowanceSaveTimerRef.current = setTimeout(() => {
      setAllowanceSaveState("idle")
      allowanceSaveTimerRef.current = null
    }, 1000)
  }

  const updateRole = async (userId: string, role: "user" | "admin") => {
    setError(null)
    const response = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role })
    })
    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      setError(data.error ?? "Rollenwechsel fehlgeschlagen")
      return
    }
    await load()
  }

  const createUser = async (event: React.FormEvent<HTMLFormElement>): Promise<boolean> => {
    event.preventDefault()
    setError(null)
    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(createForm)
    })
    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      setError(data.error ?? "User konnte nicht erstellt werden")
      return false
    }
    setCreateForm({ name: "", email: "", password: "", role: "user" })
    await load()
    return true
  }

  const deleteUser = async (userId: string) => {
    setError(null)
    const response = await fetch(`/api/admin/users?id=${userId}`, { method: "DELETE" })
    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      setError(data.error ?? "User konnte nicht entfernt werden")
      return
    }
    await load()
  }

  const submitResetPassword = async () => {
    if (!resetPasswordFor) return
    if (!resetPassword || resetPassword !== resetConfirm) {
      setError("Passwörter stimmen nicht überein")
      return
    }
    const response = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: resetPasswordFor.id, newPassword: resetPassword })
    })
    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      setError(data.error ?? "Passwort konnte nicht gesetzt werden")
      return
    }
    setResetPassword("")
    setResetConfirm("")
    setResetPasswordFor(null)
    await load()
  }

  const generatePassword = () => {
    const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ"
    const lower = "abcdefghijkmnopqrstuvwxyz"
    const numbers = "23456789"
    const special = "!@#$%*?_-"
    const all = upper + lower + numbers + special

    const randomIndex = (max: number) => {
      const array = new Uint32Array(1)
      crypto.getRandomValues(array)
      return array[0] % max
    }
    const pick = (chars: string) => chars[randomIndex(chars.length)]
    const length = 12
    const required = [pick(upper), pick(lower), pick(numbers), pick(special)]
    const rest = Array.from({ length: length - required.length }, () => pick(all))
    const shuffled = [...required, ...rest]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = randomIndex(i + 1)
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    const password = shuffled.join("")

    setCreateForm((prev) => ({ ...prev, password }))
    setResetPassword(password)
    setResetConfirm(password)
  }

  const updateTargetMinutes = async (event: React.FormEvent<HTMLFormElement>, userId: string) => {
    event.preventDefault()
    setError(null)
    setTargetSaveStates((prev) => ({ ...prev, [userId]: "saving" }))
    const formData = new FormData(event.currentTarget)
    const toMinutes = (key: string) => {
      const raw = String(formData.get(key) ?? "0").replace(",", ".")
      const hours = Number(raw)
      if (!Number.isFinite(hours) || hours < 0) return NaN
      return Math.round(hours * 60)
    }
    const payload = {
      userId,
      targetMinutes: {
        mon: toMinutes("target-mon"),
        tue: toMinutes("target-tue"),
        wed: toMinutes("target-wed"),
        thu: toMinutes("target-thu"),
        fri: toMinutes("target-fri"),
        sat: toMinutes("target-sat"),
        sun: toMinutes("target-sun")
      }
    }
    const response = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      setTargetSaveStates((prev) => ({ ...prev, [userId]: "idle" }))
      setError(data.error ?? "Soll-Arbeitszeit konnte nicht gespeichert werden")
      return
    }
    await load()
    if (targetSaveTimersRef.current[userId]) {
      clearTimeout(targetSaveTimersRef.current[userId])
    }
    setTargetSaveStates((prev) => ({ ...prev, [userId]: "success" }))
    targetSaveTimersRef.current[userId] = setTimeout(() => {
      setTargetSaveStates((prev) => ({ ...prev, [userId]: "idle" }))
      delete targetSaveTimersRef.current[userId]
    }, 1000)
  }

  const minutesToHours = (minutes: number) => (minutes / 60).toFixed(2)
  return (
    <div className="grid gap-6">
      <div className="card p-6">
        <h2 className="font-display text-xl mb-4">User</h2>
        {error ? <div className="mb-3 text-sm text-ember">{error}</div> : null}
        <button className="btn btn-primary w-fit mb-6" type="button" onClick={() => setShowCreateModal(true)}>
          Nutzer hinzufügen
        </button>
        <div className="grid gap-3">
          {users.map((user) => (
            <div key={user.id} className="border border-sand rounded-2xl p-4">
              {(() => {
                const targetSaveState = targetSaveStates[user.id] ?? "idle"
                return (
                  <>
              <div className="font-medium">{user.name}</div>
              <div className="text-sm text-[#6b5e51]">{user.email}</div>
              <div className="mt-2 flex items-center gap-2 text-xs text-[#6b5e51]">
                <span>Rolle:</span>
                <button
                  className={`btn px-2 py-1 text-[11px] ${
                    user.role === "user" ? "btn-primary" : "btn-ghost"
                  }`}
                  type="button"
                  onClick={() => updateRole(user.id, "user")}
                >
                  User
                </button>
                <button
                  className={`btn px-2 py-1 text-[11px] ${
                    user.role === "admin" ? "btn-primary" : "btn-ghost"
                  }`}
                  type="button"
                  onClick={() => updateRole(user.id, "admin")}
                >
                  Admin
                </button>
                <button
                  className="btn btn-ghost px-2 py-1 text-[11px]"
                  type="button"
                  onClick={() => {
                    setError(null)
                    setResetPassword("")
                    setResetConfirm("")
                    setResetPasswordFor({ id: user.id, name: user.name, email: user.email })
                  }}
                >
                  Neues Passwort
                </button>
                <button
                  className="btn btn-ghost px-2 py-1 text-[11px] text-ember"
                  type="button"
                  onClick={() =>
                    setConfirmDelete({ id: user.id, name: user.name, email: user.email })
                  }
                >
                  Entfernen
                </button>
              </div>
              <form
                className="mt-4 grid gap-2"
                onSubmit={(event) => void updateTargetMinutes(event, user.id)}
              >
                <span className="label">Soll-Arbeitszeit pro Tag (Stunden)</span>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-7">
                  {weekdays.map((day) => {
                    const keyMap = {
                      mon: user.targetMinutesMon,
                      tue: user.targetMinutesTue,
                      wed: user.targetMinutesWed,
                      thu: user.targetMinutesThu,
                      fri: user.targetMinutesFri,
                      sat: user.targetMinutesSat,
                      sun: user.targetMinutesSun
                    }
                    return (
                      <label key={day.key} className="flex flex-col gap-1 text-xs text-[#6b5e51]">
                        <span>{day.label}</span>
                        <input
                          className="input py-2 text-sm"
                          type="number"
                          name={`target-${day.key}`}
                          min={0}
                          max={24}
                          step="0.25"
                          defaultValue={minutesToHours(keyMap[day.key])}
                          required
                        />
                      </label>
                    )
                  })}
                </div>
                <div className="flex justify-end">
                  <button
                    className={`btn px-3 py-1 text-[11px] ${
                      targetSaveState === "success" ? "btn-ghost text-accent border-accent" : "btn-ghost"
                    }`}
                    type="submit"
                    disabled={targetSaveState === "saving"}
                    aria-busy={targetSaveState === "saving"}
                  >
                    {targetSaveState === "saving" ? "Speichert..." : null}
                    {targetSaveState === "success" ? (
                      <span className="inline-flex items-center gap-1">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path
                            fillRule="evenodd"
                            clipRule="evenodd"
                            d="M9.86338 18.0001C9.58738 18.0001 9.32338 17.8861 9.13438 17.6851L4.27138 12.5061C3.89238 12.1041 3.91338 11.4711 4.31538 11.0931C4.71838 10.7151 5.35138 10.7351 5.72838 11.1371L9.85338 15.5281L18.2614 6.32611C18.6354 5.91711 19.2674 5.89011 19.6754 6.26211C20.0824 6.63411 20.1104 7.26711 19.7384 7.67411L10.6014 17.6741C10.4144 17.8801 10.1484 17.9981 9.87038 18.0001H9.86338Z"
                            fill="currentColor"
                          />
                        </svg>
                        Gespeichert
                      </span>
                    ) : null}
                    {targetSaveState === "idle" ? "Sollzeit speichern" : null}
                  </button>
                  <span className="sr-only" aria-live="polite">
                    {targetSaveState === "saving"
                      ? "Speichert"
                      : targetSaveState === "success"
                        ? "Gespeichert"
                        : ""}
                  </span>
                </div>
              </form>
                  </>
                )
              })()}
            </div>
          ))}
        </div>
      </div>

      <dialog
        ref={dialogRef}
        className="backdrop:bg-black/40 rounded-2xl p-0 border border-sand w-full max-w-lg"
        onClose={() => setShowCreateModal(false)}
        onCancel={(event) => {
          event.preventDefault()
          setShowCreateModal(false)
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) setShowCreateModal(false)
        }}
      >
        {showCreateModal ? (
          <div className="card w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl">Nutzer hinzufügen</h2>
              <button className="btn btn-ghost" type="button" onClick={() => setShowCreateModal(false)}>
                Schließen
              </button>
            </div>
            <form className="grid gap-4" onSubmit={async (event) => {
              const ok = await createUser(event)
              if (ok) setShowCreateModal(false)
            }}>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className="label">Name</span>
                  <input
                    className="input"
                    value={createForm.name}
                    onChange={(event) =>
                      setCreateForm((prev) => ({ ...prev, name: event.target.value }))
                    }
                    required
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="label">E-Mail</span>
                  <input
                    className="input"
                    type="email"
                    value={createForm.email}
                    onChange={(event) =>
                      setCreateForm((prev) => ({ ...prev, email: event.target.value }))
                    }
                    required
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="label">Passwort</span>
                  <div className="flex gap-2">
                    <input
                      className="input"
                      type="text"
                      value={createForm.password}
                      onChange={(event) =>
                        setCreateForm((prev) => ({ ...prev, password: event.target.value }))
                      }
                      spellCheck={false}
                      required
                    />
                    <button
                      className="btn btn-ghost px-3 py-1 text-xs"
                      type="button"
                      onClick={generatePassword}
                      aria-label="Passwort generieren"
                      title="Passwort generieren"
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
                          d="M21.6828 10.3261C21.6755 10.3419 21.6683 10.3578 21.6615 10.374C21.6546 10.3908 21.6492 10.4082 21.6438 10.4257C21.6351 10.454 21.6264 10.4822 21.6115 10.507C21.5819 10.556 21.5433 10.5972 21.5045 10.6385C21.4934 10.6502 21.4824 10.662 21.4715 10.674C21.4594 10.6865 21.4487 10.7003 21.438 10.714C21.4231 10.7331 21.4081 10.7523 21.3895 10.768C21.3335 10.8137 21.2688 10.8455 21.2043 10.8772L21.1905 10.884C21.1769 10.8906 21.1639 10.8989 21.1509 10.9073C21.1325 10.9191 21.114 10.931 21.0935 10.938C20.9855 10.978 20.8705 11 20.7515 11C20.6975 11 20.6415 10.996 20.5865 10.986L16.3365 10.281C15.7915 10.191 15.4235 9.676 15.5135 9.131C15.6035 8.587 16.1175 8.214 16.6635 8.309L18.3075 8.581C17.0625 6.395 14.6855 5 12.0695 5C9.11049 5 6.50349 6.718 5.42649 9.375C5.26949 9.765 4.89449 10 4.49949 10C4.37449 10 4.24749 9.977 4.12449 9.927C3.61249 9.72 3.36549 9.137 3.57349 8.625C4.95749 5.208 8.29249 3 12.0695 3C15.4815 3 18.5825 4.87 20.1475 7.788L20.5165 5.815C20.6185 5.273 21.1425 4.914 21.6835 5.018C22.2265 5.119 22.5845 5.642 22.4825 6.185L21.7335 10.185C21.7239 10.236 21.7033 10.281 21.6828 10.3261ZM18.5734 14.6252C18.7804 14.1122 19.3644 13.8662 19.8754 14.0732C20.3874 14.2802 20.6344 14.8632 20.4264 15.3752C19.0424 18.7922 15.7074 21.0002 11.9304 21.0002C8.51839 21.0002 5.41739 19.1302 3.85239 16.2122L3.48239 18.1842C3.39339 18.6652 2.97339 19.0002 2.50039 19.0002C2.43939 19.0002 2.37739 18.9942 2.31539 18.9822C1.77239 18.8812 1.41539 18.3582 1.51739 17.8152L2.26639 13.8152C2.274 13.7759 2.29083 13.7411 2.30774 13.706C2.31752 13.6858 2.32733 13.6655 2.33539 13.6442C2.3433 13.6243 2.35021 13.6037 2.35712 13.583C2.37208 13.5383 2.3871 13.4935 2.41239 13.4552C2.42715 13.4324 2.44645 13.4142 2.46586 13.3959C2.47802 13.3844 2.49023 13.3729 2.50139 13.3602C2.5102 13.35 2.51891 13.3397 2.52761 13.3295C2.5752 13.2734 2.62236 13.2178 2.68239 13.1772C2.68829 13.1729 2.69533 13.1703 2.7023 13.1678C2.70832 13.1656 2.71429 13.1634 2.71939 13.1602C2.81639 13.0972 2.92039 13.0482 3.03539 13.0232C3.0424 13.0216 3.04969 13.022 3.05696 13.0224C3.06319 13.0228 3.0694 13.0231 3.07539 13.0222C3.18539 13.0042 3.29639 12.9932 3.41339 13.0132L7.66339 13.7192C8.20839 13.8082 8.57639 14.3242 8.48639 14.8692C8.40539 15.3582 7.98139 15.7052 7.50039 15.7052C7.44639 15.7052 7.39139 15.7012 7.33639 15.6912L5.69239 15.4192C6.93739 17.6052 9.31439 19.0002 11.9304 19.0002C14.8894 19.0002 17.4964 17.2822 18.5734 14.6252Z"
                          fill="currentColor"
                        />
                      </svg>
                    </button>
                  </div>
                </label>
                <label className="flex flex-col gap-2">
                  <span className="label">Rolle</span>
                  <select
                    className="input"
                    value={createForm.role}
                    onChange={(event) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        role: event.target.value as "user" | "admin"
                      }))
                    }
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </label>
              </div>
              <div className="flex justify-end gap-2">
                <button className="btn btn-ghost" type="button" onClick={() => setShowCreateModal(false)}>
                  Abbrechen
                </button>
                <button className="btn btn-primary" type="submit">
                  Nutzer hinzufügen
                </button>
              </div>
            </form>
          </div>
        ) : null}
      </dialog>

      <dialog
        ref={deleteDialogRef}
        className="backdrop:bg-black/40 rounded-2xl p-0 border border-sand w-full max-w-md"
        onClose={() => setConfirmDelete(null)}
        onCancel={(event) => {
          event.preventDefault()
          setConfirmDelete(null)
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) setConfirmDelete(null)
        }}
      >
        {confirmDelete ? (
          <div className="card w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl">Nutzer löschen</h2>
            </div>
            <p className="text-sm text-[#6b5e51]">
              Soll <span className="font-semibold">{confirmDelete.name}</span> ({confirmDelete.email})
              wirklich entfernt werden?
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button className="btn btn-ghost" type="button" onClick={() => setConfirmDelete(null)}>
                Abbrechen
              </button>
              <button
                className="btn btn-primary"
                type="button"
                onClick={async () => {
                  await deleteUser(confirmDelete.id)
                  setConfirmDelete(null)
                }}
              >
                Löschen
              </button>
            </div>
          </div>
        ) : null}
      </dialog>

      <dialog
        ref={resetDialogRef}
        className="backdrop:bg-black/40 rounded-2xl p-0 border border-sand w-full max-w-md"
        onClose={() => setResetPasswordFor(null)}
        onCancel={(event) => {
          event.preventDefault()
          setResetPasswordFor(null)
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) setResetPasswordFor(null)
        }}
      >
        {resetPasswordFor ? (
          <div className="card w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl">Neues Passwort vergeben</h2>
            </div>
            <p className="text-sm text-[#6b5e51] mb-4">
              Für <span className="font-semibold">{resetPasswordFor.name}</span> ({resetPasswordFor.email})
            </p>
            <div className="grid gap-3">
              <label className="flex flex-col gap-2">
                <span className="label">Neues Passwort</span>
                <div className="flex gap-2">
                  <input
                    className="input"
                    type="password"
                    value={resetPassword}
                    onChange={(event) => setResetPassword(event.target.value)}
                  />
                  <button
                    className="btn btn-ghost px-3 py-1 text-xs"
                    type="button"
                    onClick={generatePassword}
                    aria-label="Passwort generieren"
                    title="Passwort generieren"
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
                        d="M21.6828 10.3261C21.6755 10.3419 21.6683 10.3578 21.6615 10.374C21.6546 10.3908 21.6492 10.4082 21.6438 10.4257C21.6351 10.454 21.6264 10.4822 21.6115 10.507C21.5819 10.556 21.5433 10.5972 21.5045 10.6385C21.4934 10.6502 21.4824 10.662 21.4715 10.674C21.4594 10.6865 21.4487 10.7003 21.438 10.714C21.4231 10.7331 21.4081 10.7523 21.3895 10.768C21.3335 10.8137 21.2688 10.8455 21.2043 10.8772L21.1905 10.884C21.1769 10.8906 21.1639 10.8989 21.1509 10.9073C21.1325 10.9191 21.114 10.931 21.0935 10.938C20.9855 10.978 20.8705 11 20.7515 11C20.6975 11 20.6415 10.996 20.5865 10.986L16.3365 10.281C15.7915 10.191 15.4235 9.676 15.5135 9.131C15.6035 8.587 16.1175 8.214 16.6635 8.309L18.3075 8.581C17.0625 6.395 14.6855 5 12.0695 5C9.11049 5 6.50349 6.718 5.42649 9.375C5.26949 9.765 4.89449 10 4.49949 10C4.37449 10 4.24749 9.977 4.12449 9.927C3.61249 9.72 3.36549 9.137 3.57349 8.625C4.95749 5.208 8.29249 3 12.0695 3C15.4815 3 18.5825 4.87 20.1475 7.788L20.5165 5.815C20.6185 5.273 21.1425 4.914 21.6835 5.018C22.2265 5.119 22.5845 5.642 22.4825 6.185L21.7335 10.185C21.7239 10.236 21.7033 10.281 21.6828 10.3261ZM18.5734 14.6252C18.7804 14.1122 19.3644 13.8662 19.8754 14.0732C20.3874 14.2802 20.6344 14.8632 20.4264 15.3752C19.0424 18.7922 15.7074 21.0002 11.9304 21.0002C8.51839 21.0002 5.41739 19.1302 3.85239 16.2122L3.48239 18.1842C3.39339 18.6652 2.97339 19.0002 2.50039 19.0002C2.43939 19.0002 2.37739 18.9942 2.31539 18.9822C1.77239 18.8812 1.41539 18.3582 1.51739 17.8152L2.26639 13.8152C2.274 13.7759 2.29083 13.7411 2.30774 13.706C2.31752 13.6858 2.32733 13.6655 2.33539 13.6442C2.3433 13.6243 2.35021 13.6037 2.35712 13.583C2.37208 13.5383 2.3871 13.4935 2.41239 13.4552C2.42715 13.4324 2.44645 13.4142 2.46586 13.3959C2.47802 13.3844 2.49023 13.3729 2.50139 13.3602C2.5102 13.35 2.51891 13.3397 2.52761 13.3295C2.5752 13.2734 2.62236 13.2178 2.68239 13.1772C2.68829 13.1729 2.69533 13.1703 2.7023 13.1678C2.70832 13.1656 2.71429 13.1634 2.71939 13.1602C2.81639 13.0972 2.92039 13.0482 3.03539 13.0232C3.0424 13.0216 3.04969 13.022 3.05696 13.0224C3.06319 13.0228 3.0694 13.0231 3.07539 13.0222C3.18539 13.0042 3.29639 12.9932 3.41339 13.0132L7.66339 13.7192C8.20839 13.8082 8.57639 14.3242 8.48639 14.8692C8.40539 15.3582 7.98139 15.7052 7.50039 15.7052C7.44639 15.7052 7.39139 15.7012 7.33639 15.6912L5.69239 15.4192C6.93739 17.6052 9.31439 19.0002 11.9304 19.0002C14.8894 19.0002 17.4964 17.2822 18.5734 14.6252Z"
                        fill="currentColor"
                      />
                    </svg>
                  </button>
                </div>
              </label>
              <label className="flex flex-col gap-2">
                <span className="label">Passwort wiederholen</span>
                <input
                  className="input"
                  type="password"
                  value={resetConfirm}
                  onChange={(event) => setResetConfirm(event.target.value)}
                />
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button className="btn btn-ghost" type="button" onClick={() => setResetPasswordFor(null)}>
                Abbrechen
              </button>
              <button className="btn btn-primary" type="button" onClick={submitResetPassword}>
                Passwort setzen
              </button>
            </div>
          </div>
        ) : null}
      </dialog>

      <div className="card p-6">
        <h2 className="font-display text-xl mb-4">Urlaub korrigieren</h2>
        <form className="grid gap-4" onSubmit={updateAllowance}>
          <label className="flex flex-col gap-2">
            <span className="label">User</span>
            <select className="input" name="userId" required>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-3 md:grid-cols-4">
            <label className="flex flex-col gap-2">
              <span className="label">Jahr</span>
              <input className="input" name="year" type="number" defaultValue={new Date().getFullYear()} />
            </label>
            <label className="flex flex-col gap-2">
              <span className="label">Jahresurlaub</span>
              <input className="input" name="annualDays" type="number" defaultValue={30} />
            </label>
            <label className="flex flex-col gap-2">
              <span className="label">Resturlaub</span>
              <input className="input" name="carryOverDays" type="number" defaultValue={0} />
            </label>
            <label className="flex flex-col gap-2">
              <span className="label">Korrektur</span>
              <input className="input" name="adjustedDays" type="number" defaultValue={0} />
            </label>
          </div>
          <button
            className={`btn w-fit ${
              allowanceSaveState === "success" ? "btn-ghost text-accent border-accent" : "btn-primary"
            }`}
            type="submit"
            disabled={allowanceSaveState === "saving"}
            aria-busy={allowanceSaveState === "saving"}
          >
            {allowanceSaveState === "saving" ? "Speichert..." : null}
            {allowanceSaveState === "success" ? (
              <span className="inline-flex items-center gap-1">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M9.86338 18.0001C9.58738 18.0001 9.32338 17.8861 9.13438 17.6851L4.27138 12.5061C3.89238 12.1041 3.91338 11.4711 4.31538 11.0931C4.71838 10.7151 5.35138 10.7351 5.72838 11.1371L9.85338 15.5281L18.2614 6.32611C18.6354 5.91711 19.2674 5.89011 19.6754 6.26211C20.0824 6.63411 20.1104 7.26711 19.7384 7.67411L10.6014 17.6741C10.4144 17.8801 10.1484 17.9981 9.87038 18.0001H9.86338Z"
                    fill="currentColor"
                  />
                </svg>
                Gespeichert
              </span>
            ) : null}
            {allowanceSaveState === "idle" ? "Speichern" : null}
          </button>
          <span className="sr-only" aria-live="polite">
            {allowanceSaveState === "saving"
              ? "Speichert"
              : allowanceSaveState === "success"
                ? "Gespeichert"
                : ""}
          </span>
        </form>
      </div>
    </div>
  )
}
