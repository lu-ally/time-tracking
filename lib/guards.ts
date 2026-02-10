import { redirect } from "next/navigation"
import { getSessionUser } from "./auth"

export async function userOrRedirect() {
  const user = await getSessionUser()
  if (!user) {
    redirect("/login")
  }
  return user
}

export async function adminOrRedirect() {
  const user = await getSessionUser()
  if (!user) {
    redirect("/login")
  }
  if (user.role !== "admin") {
    redirect("/time")
  }
  return user
}
