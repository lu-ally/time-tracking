import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "../../../lib/auth"
import { prisma } from "../../../lib/db"
import { timeEntrySchema } from "../../../lib/validation"
import { timeToMinutes } from "../../../lib/time"

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser()
    const { searchParams } = new URL(request.url)
    const start = searchParams.get("start")
    const end = searchParams.get("end")

    if (!start || !end) {
      return NextResponse.json({ error: "Missing range" }, { status: 400 })
    }

    const entries = await prisma.timeEntry.findMany({
      where: { userId: user.id, date: { gte: start, lte: end } },
      orderBy: { date: "asc" }
    })

    return NextResponse.json({ entries })
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser()
    const body = await request.json()
    const parsed = timeEntrySchema.safeParse({
      ...body,
      breakMinutes: Number(body.breakMinutes)
    })
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { date, start, end, breakMinutes, note } = parsed.data
    const startMinutes = timeToMinutes(start)
    const endMinutes = timeToMinutes(end)

    if (endMinutes <= startMinutes) {
      return NextResponse.json({ error: "Ende muss nach Start liegen" }, { status: 400 })
    }
    if (breakMinutes > endMinutes - startMinutes) {
      return NextResponse.json({ error: "Pause zu lang" }, { status: 400 })
    }

    const entry = await prisma.timeEntry.upsert({
      where: { userId_date: { userId: user.id, date } },
      update: {
        startMinutes,
        endMinutes,
        breakMinutes,
        note
      },
      create: {
        userId: user.id,
        date,
        startMinutes,
        endMinutes,
        breakMinutes,
        note
      }
    })

    return NextResponse.json({ entry })
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireUser()
    const { searchParams } = new URL(request.url)
    const date = searchParams.get("date")
    if (!date) {
      return NextResponse.json({ error: "Missing date" }, { status: 400 })
    }
    await prisma.timeEntry.deleteMany({ where: { userId: user.id, date } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}
