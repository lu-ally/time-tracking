import Link from "next/link"
import { getSessionUser } from "../../lib/auth"
import { redirect } from "next/navigation"

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const user = await getSessionUser()
  if (user) {
    redirect("/time")
  }
  const params = await searchParams
  const error =
    params.error === "invalid"
      ? "E-Mail oder Passwort ist falsch."
      : params.error === "missing"
        ? "Bitte E-Mail und Passwort angeben."
        : null
  const success = params.reset === "success" ? "Passwort wurde gesetzt. Bitte einloggen." : null
  return (
    <div className="min-h-screen grid place-items-center">
      <div className="card p-8 w-full max-w-md">
        <h1 className="font-display text-3xl mb-2">Willkommen zurück</h1>
        <p className="text-[#6b5e51] mb-6">Bitte melde dich an, um deine Zeiten zu sehen.</p>
        {error ? <div className="mb-4 text-sm text-ember">{error}</div> : null}
        {success ? <div className="mb-4 text-sm text-accent">{success}</div> : null}
        <form className="space-y-4" method="post" action="/api/auth/login">
          <label className="flex flex-col gap-2">
            <span className="label">E-Mail</span>
            <input className="input" type="email" name="email" required />
          </label>
          <label className="flex flex-col gap-2">
            <span className="label">Passwort</span>
            <input className="input" type="password" name="password" required />
          </label>
          <button className="btn btn-primary w-full" type="submit">
            Einloggen
          </button>
        </form>
        <div className="flex justify-between items-center mt-6 text-sm">
          <Link href="/reset" className="underline">
            Passwort vergessen?
          </Link>
          <Link href="/register" className="underline">
            Registrieren
          </Link>
        </div>
      </div>
    </div>
  )
}
