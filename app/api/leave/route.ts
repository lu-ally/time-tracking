import { NextRequest, NextResponse } from "next/server"
import { apiError, requireUser } from "../../../lib/auth"
import { prisma } from "../../../lib/db"
import { leaveEntrySchema } from "../../../lib/validation"

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser()
    const { searchParams } = new URL(request.url)
    const start = searchParams.get("start")
    const end = searchParams.get("end")
    const team = searchParams.get("team") === "true"

    if (!start || !end) {
      return NextResponse.json({ error: "Missing range" }, { status: 400 })
    }

    if (team) {
      const entries = await prisma.leaveEntry.findMany({
        where: { startDate: { lte: end }, endDate: { gte: start } },
        select: {
          id: true,
          startDate: true,
          endDate: true,
          halfDayStart: true,
          halfDayEnd: true,
          user: { select: { id: true, name: true } }
        },
        orderBy: { startDate: "asc" }
      })
      return NextResponse.json({ entries })
    }

    const entries = await prisma.leaveEntry.findMany({
      where: { userId: user.id, startDate: { lte: end }, endDate: { gte: start } },
      orderBy: { startDate: "asc" }
    })

    return NextResponse.json({ entries })
  } catch (error) {
    return apiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser()
    const body = await request.json()
    const parsed = leaveEntrySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { startDate, endDate, halfDayStart, halfDayEnd } = parsed.data
    if (endDate < startDate) {
      return NextResponse.json({ error: "Ende vor Start" }, { status: 400 })
    }
    if (startDate === endDate && halfDayStart && halfDayEnd) {
      return NextResponse.json({ error: "Halbtag nur einmal" }, { status: 400 })
    }

    const entry = await prisma.leaveEntry.create({
      data: {
        userId: user.id,
        startDate,
        endDate,
        halfDayStart,
        halfDayEnd
      }
    })

    return NextResponse.json({ entry })
  } catch (error) {
    return apiError(error)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireUser()
    const body = await request.json()
    const id = String(body.id ?? "")
    const parsed = leaveEntrySchema.safeParse(body)
    if (!id || !parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 })
    }

    const { startDate, endDate, halfDayStart, halfDayEnd } = parsed.data
    if (endDate < startDate) {
      return NextResponse.json({ error: "Ende vor Start" }, { status: 400 })
    }
    if (startDate === endDate && halfDayStart && halfDayEnd) {
      return NextResponse.json({ error: "Halbtag nur einmal" }, { status: 400 })
    }

    const existing = await prisma.leaveEntry.findUnique({ where: { id } })
    if (!existing || existing.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const entry = await prisma.leaveEntry.update({
      where: { id },
      data: { startDate, endDate, halfDayStart, halfDayEnd }
    })

    return NextResponse.json({ entry })
  } catch (error) {
    return apiError(error)
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireUser()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 })
    }

    const existing = await prisma.leaveEntry.findUnique({ where: { id } })
    if (!existing || existing.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await prisma.leaveEntry.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return apiError(error)
  }
}
