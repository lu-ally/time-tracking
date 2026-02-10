import Link from "next/link"
import { getSessionUser } from "../../lib/auth"
import { redirect } from "next/navigation"
import { RegisterForm } from "../../components/RegisterForm"

export default async function RegisterPage({
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
      ? "Bitte prüfe die Eingaben. Das Passwort erfüllt die Anforderungen nicht."
      : params.error === "match"
        ? "Passwörter stimmen nicht überein."
        : params.error === "exists"
          ? "Es existiert bereits ein Konto mit dieser E-Mail."
          : null
  return (
    <div className="min-h-screen grid place-items-center">
      <div className="card p-8 w-full max-w-md">
        <h1 className="font-display text-3xl mb-2">Neues Konto</h1>
        <p className="text-[#6b5e51] mb-6">Starte mit der Zeiterfassung und Urlaubsplanung.</p>
        <RegisterForm error={error} />
        <div className="mt-6 text-sm text-center">
          Bereits ein Konto?{" "}
          <Link href="/login" className="underline">
            Login
          </Link>
        </div>
      </div>
    </div>
  )
}
