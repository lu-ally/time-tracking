import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "../../../lib/auth"
import { prisma } from "../../../lib/db"

export async function GET() {
  try {
    const user = await requireUser()
    const allowances = await prisma.leaveAllowance.findMany({
      where: { userId: user.id },
      orderBy: { year: "desc" }
    })

    return NextResponse.json({
      settings: {
        targetMinutes: {
          mon: user.targetMinutesMon,
          tue: user.targetMinutesTue,
          wed: user.targetMinutesWed,
          thu: user.targetMinutesThu,
          fri: user.targetMinutesFri,
          sat: user.targetMinutesSat,
          sun: user.targetMinutesSun
        },
        holidayState: user.holidayState
      },
      allowances
    })
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser()
    const body = await request.json()
    const targetMinutes = body.targetMinutes ?? {}
    const dayKeys = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const
    for (const key of dayKeys) {
      const value = Number(targetMinutes[key])
      if (!Number.isFinite(value) || value < 0) {
        return NextResponse.json({ error: "Invalid target" }, { status: 400 })
      }
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        targetMinutesMon: Number(targetMinutes.mon),
        targetMinutesTue: Number(targetMinutes.tue),
        targetMinutesWed: Number(targetMinutes.wed),
        targetMinutesThu: Number(targetMinutes.thu),
        targetMinutesFri: Number(targetMinutes.fri),
        targetMinutesSat: Number(targetMinutes.sat),
        targetMinutesSun: Number(targetMinutes.sun)
      }
    })

    return NextResponse.json({ settings: updated })
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}
