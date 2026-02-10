import Link from "next/link"

export default async function ResetPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; success?: string }>
}) {
  const params = await searchParams
  const error =
    params.error === "invalid"
      ? "Bitte prüfe deine Eingaben."
      : params.error === "token"
        ? "Token ist ungültig oder abgelaufen."
        : null
  const success = params.success === "requested" ? "Token wurde erstellt." : null
  return (
    <div className="min-h-screen grid place-items-center">
      <div className="card p-8 w-full max-w-lg space-y-8">
        <div>
          <h1 className="font-display text-3xl mb-2">Passwort zurücksetzen</h1>
          <p className="text-[#6b5e51]">
            Du erhältst einen Token per Konsole (MVP). Nutze ihn zum Setzen eines neuen
            Passworts.
          </p>
        </div>
        {error ? <div className="text-sm text-ember">{error}</div> : null}
        {success ? <div className="text-sm text-accent">{success}</div> : null}
        <form className="space-y-4" method="post" action="/api/auth/reset/request">
          <label className="flex flex-col gap-2">
            <span className="label">E-Mail</span>
            <input className="input" type="email" name="email" required />
          </label>
          <button className="btn btn-primary" type="submit">
            Reset Token anfordern
          </button>
        </form>
        <form className="space-y-4" method="post" action="/api/auth/reset/confirm">
          <label className="flex flex-col gap-2">
            <span className="label">Token</span>
            <input className="input" type="text" name="token" required />
          </label>
          <label className="flex flex-col gap-2">
            <span className="label">Neues Passwort</span>
            <input className="input" type="password" name="password" required />
          </label>
          <button className="btn btn-primary" type="submit">
            Passwort setzen
          </button>
        </form>
        <div className="text-sm">
          <Link href="/login" className="underline">
            Zurück zum Login
          </Link>
        </div>
      </div>
    </div>
  )
}
