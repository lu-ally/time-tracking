import { NextRequest, NextResponse } from "next/server"
import { prisma } from "../../../../lib/db"
import { emailSchema } from "../../../../lib/validation"
import { createSession, verifyPassword } from "../../../../lib/auth"

export async function POST(request: NextRequest) {
  const form = await request.formData()
  const email = String(form.get("email") ?? "").toLowerCase().trim()
  const password = String(form.get("password") ?? "")

  if (!emailSchema.safeParse(email).success || !password) {
    return NextResponse.redirect(new URL("/login?error=missing", request.url))
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    return NextResponse.redirect(new URL("/login?error=invalid", request.url))
  }

  const valid = await verifyPassword(password, user.passwordHash)
  if (!valid) {
    return NextResponse.redirect(new URL("/login?error=invalid", request.url))
  }

  await createSession(user.id)
  return NextResponse.redirect(new URL("/time", request.url))
}
