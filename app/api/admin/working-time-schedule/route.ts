import { NextRequest, NextResponse } from "next/server"
import { apiError, requireAdmin } from "../../../../lib/auth"
import { prisma } from "../../../../lib/db"
import { berlinDateString } from "../../../../lib/time"
import { resolveScheduleForDate } from "../../../../lib/workingTimeSchedule"

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
    const { searchParams } = new URL(request.url)
    const userId = String(searchParams.get("userId") ?? "")

    if (!userId) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const schedules = await prisma.workingTimeSchedule.findMany({
      where: { userId },
      orderBy: { effectiveFrom: "asc" }
    })

    const todayKey = berlinDateString(new Date())
    const current = resolveScheduleForDate(schedules, todayKey)
    const upcoming = schedules.filter((schedule) => schedule.effectiveFrom > todayKey)

    return NextResponse.json({ schedules, current, upcoming })
  } catch (error) {
    return apiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
    const body = await request.json()
    const userId = String(body.userId ?? "")
    const effectiveFrom = String(body.effectiveFrom ?? "")
    const targetMinutes = body.targetMinutes ?? null

    if (!userId || !DATE_PATTERN.test(effectiveFrom) || !targetMinutes) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 })
    }

    const todayKey = berlinDateString(new Date())
    if (effectiveFrom < todayKey) {
      return NextResponse.json(
        { error: "Sollzeit kann nicht rückwirkend geändert werden" },
        { status: 400 }
      )
    }

    const keys = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const
    const values: Record<(typeof keys)[number], number> = {} as Record<(typeof keys)[number], number>
    for (const key of keys) {
      const value = Number(targetMinutes[key])
      if (!Number.isFinite(value) || value < 0 || value > 24 * 60) {
        return NextResponse.json({ error: "Invalid target minutes" }, { status: 400 })
      }
      values[key] = value
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const data = {
      targetMinutesMon: values.mon,
      targetMinutesTue: values.tue,
      targetMinutesWed: values.wed,
      targetMinutesThu: values.thu,
      targetMinutesFri: values.fri,
      targetMinutesSat: values.sat,
      targetMinutesSun: values.sun
    }

    const schedule = await prisma.workingTimeSchedule.upsert({
      where: { userId_effectiveFrom: { userId, effectiveFrom } },
      update: data,
      create: { userId, effectiveFrom, ...data }
    })

    return NextResponse.json({ schedule })
  } catch (error) {
    return apiError(error)
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 })
    }

    const existing = await prisma.workingTimeSchedule.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const todayKey = berlinDateString(new Date())
    if (existing.effectiveFrom <= todayKey) {
      return NextResponse.json(
        { error: "Bereits wirksame Sollzeit kann nicht gelöscht werden" },
        { status: 400 }
      )
    }

    await prisma.workingTimeSchedule.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return apiError(error)
  }
}
