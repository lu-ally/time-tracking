import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "../../../../lib/auth"
import { prisma } from "../../../../lib/db"
import { hashPassword } from "../../../../lib/password"
import { passwordSchema } from "../../../../lib/validation"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET() {
  try {
    await requireAdmin()
    const users = await prisma.user.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        targetMinutesMon: true,
        targetMinutesTue: true,
        targetMinutesWed: true,
        targetMinutesThu: true,
        targetMinutesFri: true,
        targetMinutesSat: true,
        targetMinutesSun: true
      }
    })
    return NextResponse.json({ users })
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await requireAdmin()
    const body = await request.json()
    const userId = String(body.userId ?? "")
    const role = String(body.role ?? "")
    const newPassword = body.newPassword ? String(body.newPassword) : null

    if (!userId) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 })
    }

    if (newPassword) {
      if (!passwordSchema.safeParse(newPassword).success) {
        return NextResponse.json({ error: "Password does not meet policy" }, { status: 400 })
      }
      const passwordHash = await hashPassword(newPassword)
      const updated = await prisma.user.update({
        where: { id: userId },
        data: { passwordHash }
      })
      return NextResponse.json({ user: updated })
    }

    if (role !== "admin" && role !== "user") {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 })
    }

    if (admin.id === userId && role !== "admin") {
      return NextResponse.json({ error: "Cannot demote yourself" }, { status: 400 })
    }

    const current = await prisma.user.findUnique({ where: { id: userId } })
    if (!current) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    if (current.role === "admin" && role === "user") {
      const adminCount = await prisma.user.count({ where: { role: "admin" } })
      if (adminCount <= 1) {
        return NextResponse.json({ error: "At least one admin required" }, { status: 400 })
      }
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { role: role as "admin" | "user" }
    })

    return NextResponse.json({ user: updated })
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
    const body = await request.json()
    const name = String(body.name ?? "").trim()
    const email = String(body.email ?? "").toLowerCase().trim()
    const password = String(body.password ?? "")
    const role = String(body.role ?? "user")

    if (!name || !email || !password || (role !== "admin" && role !== "user")) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: "User exists" }, { status: 400 })
    }

    const passwordHash = await hashPassword(password)
    const user = await prisma.user.create({
      data: { name, email, passwordHash, role: role as "admin" | "user" }
    })

    return NextResponse.json({ user })
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const admin = await requireAdmin()
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("id")
    if (!userId) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 })
    }
    if (admin.id === userId) {
      return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { id: userId } })
    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    if (existing.role === "admin") {
      const adminCount = await prisma.user.count({ where: { role: "admin" } })
      if (adminCount <= 1) {
        return NextResponse.json({ error: "At least one admin required" }, { status: 400 })
      }
    }

    await prisma.user.delete({ where: { id: userId } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}
