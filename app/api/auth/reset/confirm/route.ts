import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { prisma } from "../../../../../lib/db"
import { passwordSchema } from "../../../../../lib/validation"
import { hashPassword } from "../../../../../lib/auth"

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex")
}

export async function POST(request: NextRequest) {
  const form = await request.formData()
  const token = String(form.get("token") ?? "").trim()
  const password = String(form.get("password") ?? "")
  const passwordConfirm = String(form.get("passwordConfirm") ?? "")

  if (!token || !passwordSchema.safeParse(password).success) {
    return NextResponse.redirect(new URL("/reset?error=invalid", request.url))
  }
  if (password !== passwordConfirm) {
    return NextResponse.redirect(new URL("/reset?error=invalid", request.url))
  }

  const tokenHash = hashToken(token)
  const record = await prisma.passwordResetToken.findFirst({
    where: { tokenHash, expiresAt: { gt: new Date() }, usedAt: null },
    include: { user: true }
  })

  if (!record) {
    return NextResponse.redirect(new URL("/reset?error=token", request.url))
  }

  const passwordHash = await hashPassword(password)
  await prisma.user.update({
    where: { id: record.userId },
    data: { passwordHash }
  })

  await prisma.passwordResetToken.update({
    where: { id: record.id },
    data: { usedAt: new Date() }
  })

  return NextResponse.redirect(new URL("/login?reset=success", request.url))
}
