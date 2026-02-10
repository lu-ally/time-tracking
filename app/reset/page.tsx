import Link from "next/link"
import { ResetForm } from "../../components/ResetForm"

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
        <ResetForm error={error} success={success} />
        <div className="text-sm">
          <Link href="/login" className="underline">
            Zurück zum Login
          </Link>
        </div>
      </div>
    </div>
  )
}
