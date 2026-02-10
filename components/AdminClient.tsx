"use client"

import { useCallback, useEffect, useRef, useState } from "react"

type User = {
  id: string
  email: string
  name: string
  role: "user" | "admin"
  targetMinutesPerDay: number
}

type AuditLog = {
  id: string
  actorId: string
  targetUserId: string
  action: string
  meta: Record<string, unknown>
  createdAt: string
}

export function AdminClient() {
  const [users, setUsers] = useState<User[]>([])
  const [logs, setLogs] = useState<AuditLog[]>([])
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
  const dialogRef = useRef<HTMLDialogElement | null>(null)
  const deleteDialogRef = useRef<HTMLDialogElement | null>(null)

  const load = useCallback(async () => {
    const usersResponse = await fetch("/api/admin/users", { cache: "no-store" })
    const usersData = await usersResponse.json()
    setUsers(usersData.users ?? [])

    const auditResponse = await fetch("/api/admin/audit", { cache: "no-store" })
    const auditData = await auditResponse.json()
    setLogs(auditData.logs ?? [])
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

  const updateAllowance = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const payload = {
      userId: String(formData.get("userId")),
      year: Number(formData.get("year")),
      annualDays: Number(formData.get("annualDays")),
      carryOverDays: Number(formData.get("carryOverDays")),
      adjustedDays: Number(formData.get("adjustedDays"))
    }

    await fetch("/api/admin/allowance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
    await load()
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

  const createUser = async (event: React.FormEvent<HTMLFormElement>) => {
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
      return
    }
    setCreateForm({ name: "", email: "", password: "", role: "user" })
    await load()
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
                  className="btn btn-ghost px-2 py-1 text-[11px] text-ember"
                  type="button"
                  onClick={() =>
                    setConfirmDelete({ id: user.id, name: user.name, email: user.email })
                  }
                >
                  Entfernen
                </button>
              </div>
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
              await createUser(event)
              setShowCreateModal(false)
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
                  <input
                    className="input"
                    type="password"
                    value={createForm.password}
                    onChange={(event) =>
                      setCreateForm((prev) => ({ ...prev, password: event.target.value }))
                    }
                    required
                  />
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
          <button className="btn btn-primary w-fit" type="submit">
            Speichern
          </button>
        </form>
      </div>

      <div className="card p-6">
        <h2 className="font-display text-xl mb-4">Audit Log</h2>
        <div className="grid gap-3">
          {logs.length === 0 ? (
            <div className="text-[#6b5e51]">Noch keine Einträge.</div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="border border-sand rounded-2xl p-4">
                <div className="text-sm">{log.action}</div>
                <div className="text-xs text-[#6b5e51]">
                  {new Date(log.createdAt).toLocaleString("de-DE")}
                </div>
                <pre className="text-xs mt-2 bg-sand/40 p-2 rounded-lg overflow-auto">
{JSON.stringify(log.meta, null, 2)}
                </pre>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
