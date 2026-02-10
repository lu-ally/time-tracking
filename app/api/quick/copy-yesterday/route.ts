import { NextRequest, NextResponse } from "next/server"
import { apiError, requireUser } from "../../../../lib/auth"
import { prisma } from "../../../../lib/db"
import { addDays, format } from "date-fns"
import { parseBerlinDate } from "../../../../lib/time"

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser()
    const body = await request.json()
    const date = String(body.date ?? "")
    if (!/\d{4}-\d{2}-\d{2}/.test(date)) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 })
    }

    const yesterday = format(addDays(parseBerlinDate(date), -1), "yyyy-MM-dd")
    const prev = await prisma.timeEntry.findUnique({
      where: { userId_date: { userId: user.id, date: yesterday } }
    })

    if (!prev) {
      return NextResponse.json({ error: "Keine Eintraege von gestern" }, { status: 404 })
    }

    const entry = await prisma.timeEntry.upsert({
      where: { userId_date: { userId: user.id, date } },
      update: {
        startMinutes: prev.startMinutes,
        endMinutes: prev.endMinutes,
        breakMinutes: prev.breakMinutes,
        note: prev.note
      },
      create: {
        userId: user.id,
        date,
        startMinutes: prev.startMinutes,
        endMinutes: prev.endMinutes,
        breakMinutes: prev.breakMinutes,
        note: prev.note
      }
    })

    return NextResponse.json({ entry })
  } catch (error) {
    return apiError(error)
  }
}
