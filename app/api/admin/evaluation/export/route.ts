import { NextResponse } from "next/server"
import { workMinutes } from "../../../../../lib/calculations"
import { prisma } from "../../../../../lib/db"
import { apiError, requireAdmin } from "../../../../../lib/auth"
import { minutesToTime } from "../../../../../lib/time"

function escapeCsv(value: string) {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
  return `"${safe.replace(/"/g, '""')}"`
}

export async function GET() {
  try {
    await requireAdmin()

    const entries = await prisma.timeEntry.findMany({
      select: {
        date: true,
        startMinutes: true,
        endMinutes: true,
        breakMinutes: true,
        note: true,
        user: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: [{ date: "asc" }, { userId: "asc" }]
    })

    const lines = ["User,E-Mail,Datum,Start,Ende,Pause,Arbeitszeit,Notiz"]
    for (const entry of entries) {
      lines.push(
        [
          escapeCsv(entry.user.name),
          escapeCsv(entry.user.email),
          entry.date,
          minutesToTime(entry.startMinutes),
          minutesToTime(entry.endMinutes),
          entry.breakMinutes,
          minutesToTime(workMinutes(entry)),
          escapeCsv(entry.note)
        ].join(",")
      )
    }

    return new NextResponse(lines.join("\n"), {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="time-entries-all-users.csv"'
      }
    })
  } catch (error) {
    return apiError(error)
  }
}
