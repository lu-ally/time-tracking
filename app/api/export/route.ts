import { NextRequest, NextResponse } from "next/server"
import { apiError, requireUser } from "../../../lib/auth"
import { prisma } from "../../../lib/db"
import { workMinutes } from "../../../lib/calculations"
import { minutesToTime } from "../../../lib/time"

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

    const lines = ["Datum,Start,Ende,Pause,Arbeitszeit,Notiz"]
    for (const entry of entries) {
      const total = workMinutes(entry)
      lines.push(
        [
          entry.date,
          minutesToTime(entry.startMinutes),
          minutesToTime(entry.endMinutes),
          entry.breakMinutes,
          minutesToTime(total),
          `"${(/^[=+\-@\t\r]/.test(entry.note) ? "'" : "") + entry.note.replace(/"/g, '""')}"`
        ].join(",")
      )
    }

    const csv = lines.join("\n")
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename=times-${start}-to-${end}.csv`
      }
    })
  } catch (error) {
    return apiError(error)
  }
}
