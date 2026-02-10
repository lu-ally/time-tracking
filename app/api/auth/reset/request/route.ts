import { NextRequest, NextResponse } from "next/server"
import { prisma } from "../../../../../lib/db"
import crypto from "crypto"
import { addMinutes } from "date-fns"

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex")
}

export async function POST(request: NextRequest) {
  const form = await request.formData()
  const email = String(form.get("email") ?? "").toLowerCase().trim()

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    return NextResponse.redirect(new URL("/reset?success=requested", request.url))
  }

  const token = crypto.randomBytes(24).toString("hex")
  const tokenHash = hashToken(token)
  const expiresAt = addMinutes(new Date(), 30)

  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash, expiresAt }
  })

  console.log(`Password reset token for ${email}: ${token}`)

  return NextResponse.redirect(new URL("/reset?success=requested", request.url))
}
