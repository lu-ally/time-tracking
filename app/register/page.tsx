import { getSessionUser } from "../../lib/auth"
import { redirect } from "next/navigation"

export default async function RegisterPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const user = await getSessionUser()
  if (user) {
    redirect("/time")
  }
  await searchParams
  redirect("/login")
}
