import { cookies } from "next/headers"
import { prisma } from "./db"
import crypto from "crypto"
import { addDays } from "date-fns"
import { hashPassword, verifyPassword } from "./password"

const SESSION_COOKIE = "tl_session"
const SESSION_TTL_DAYS = 30

export { hashPassword, verifyPassword }

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex")
}

export async function createSession(userId: string) {
  const token = crypto.randomBytes(32).toString("hex")
  const tokenHash = hashToken(token)
  const expiresAt = addDays(new Date(), SESSION_TTL_DAYS)

  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt
    }
  })

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt
  })
}

export async function clearSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (token) {
    await prisma.session.deleteMany({
      where: { tokenHash: hashToken(token) }
    })
  }
  cookieStore.delete(SESSION_COOKIE)
}

export async function getSessionUser() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null
  const tokenHash = hashToken(token)

  const session = await prisma.session.findFirst({
    where: {
      tokenHash,
      expiresAt: { gt: new Date() }
    },
    include: { user: true }
  })

  return session?.user ?? null
}

export async function requireUser() {
  const user = await getSessionUser()
  if (!user) {
    throw new Error("UNAUTHORIZED")
  }
  return user
}

export async function requireAdmin() {
  const user = await requireUser()
  if (user.role !== "admin") {
    throw new Error("FORBIDDEN")
  }
  return user
}
