import { NextRequest, NextResponse } from "next/server"
import { prisma } from "../../../../lib/db"
import { emailSchema, passwordSchema } from "../../../../lib/validation"
import { hashPassword, createSession } from "../../../../lib/auth"

export async function POST(request: NextRequest) {
  return NextResponse.json({ error: "Registration disabled" }, { status: 403 })
  const form = await request.formData()
  const name = String(form.get("name") ?? "").trim()
  const email = String(form.get("email") ?? "").toLowerCase().trim()
  const password = String(form.get("password") ?? "")
  const passwordConfirm = String(form.get("passwordConfirm") ?? "")

  const parsedEmail = emailSchema.safeParse(email)
  const parsedPassword = passwordSchema.safeParse(password)

  if (!name || !parsedEmail.success || !parsedPassword.success) {
    return NextResponse.redirect(new URL("/register?error=invalid", request.url))
  }
  if (password !== passwordConfirm) {
    return NextResponse.redirect(new URL("/register?error=match", request.url))
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.redirect(new URL("/register?error=exists", request.url))
  }

  const passwordHash = await hashPassword(password)
  const user = await prisma.user.create({
    data: { email, name, passwordHash }
  })

  await createSession(user.id)
  return NextResponse.redirect(new URL("/time", request.url))
}
