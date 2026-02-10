import { NextRequest, NextResponse } from "next/server"
import { apiError, requireUser } from "../../../../lib/auth"
import { prisma } from "../../../../lib/db"
import { weekDates, parseBerlinDate } from "../../../../lib/time"
import { format, isWeekend } from "date-fns"

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser()
    const body = await request.json()
    const date = String(body.date ?? "")
    if (!/\d{4}-\d{2}-\d{2}/.test(date)) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 })
    }

    const week = weekDates(parseBerlinDate(date))
    const weekStrings = week.map((d) => format(d, "yyyy-MM-dd"))

    const entries = await prisma.timeEntry.findMany({
      where: { userId: user.id, date: { in: weekStrings } },
      orderBy: { date: "desc" }
    })

    const template = entries[0]
    if (!template) {
      return NextResponse.json({ error: "Keine Eintraege in der Woche" }, { status: 404 })
    }

    const toCreate = week.filter((day) => !isWeekend(day))
    const existingDates = new Set(entries.map((e) => e.date))

    const created = []
    for (const day of toCreate) {
      const dayString = format(day, "yyyy-MM-dd")
      if (existingDates.has(dayString)) continue
      const entry = await prisma.timeEntry.create({
        data: {
          userId: user.id,
          date: dayString,
          startMinutes: template.startMinutes,
          endMinutes: template.endMinutes,
          breakMinutes: template.breakMinutes,
          note: template.note
        }
      })
      created.push(entry)
    }

    return NextResponse.json({ created })
  } catch (error) {
    return apiError(error)
  }
}
