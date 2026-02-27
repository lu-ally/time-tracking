import { NextRequest, NextResponse } from "next/server"
import { apiError, requireAdmin } from "../../../../lib/auth"
import { prisma } from "../../../../lib/db"
import { leaveDaysUsed } from "../../../../lib/calculations"
import { getHolidaysForYear } from "../../../../lib/holidaysRepo"

function toDayNumber(value: unknown) {
  const normalized = String(value ?? "")
    .trim()
    .replace(",", ".")
  if (!/^-?\d+(\.\d{1,2})?$/.test(normalized)) return null
  const parsed = Number(normalized)
  if (!Number.isFinite(parsed)) return null
  return Math.round(parsed * 100) / 100
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
    const { searchParams } = new URL(request.url)
    const userId = String(searchParams.get("userId") ?? "")
    const year = Number(searchParams.get("year"))

    if (!userId || !Number.isInteger(year) || year < 2000 || year > 2100) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 })
    }

    const [user, allowance] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, holidayState: true }
      }),
      prisma.leaveAllowance.findUnique({
        where: { userId_year: { userId, year } }
      })
    ])

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    if (allowance) {
      return NextResponse.json({ allowance })
    }

    const previousYear = year - 1
    const [previousAllowance, previousEntries, previousHolidays] = await Promise.all([
      prisma.leaveAllowance.findUnique({
        where: { userId_year: { userId, year: previousYear } }
      }),
      prisma.leaveEntry.findMany({
        where: {
          userId,
          startDate: { lte: `${previousYear}-12-31` },
          endDate: { gte: `${previousYear}-01-01` }
        }
      }),
      getHolidaysForYear(previousYear, user.holidayState)
    ])

    const previousUsed = previousEntries.reduce((sum, entry) => {
      return (
        sum +
        leaveDaysUsed(
          entry.startDate,
          entry.endDate,
          entry.halfDayStart,
          entry.halfDayEnd,
          previousHolidays
        )
      )
    }, 0)

    const autoCarryOver = previousAllowance
      ? Math.max(
          previousAllowance.annualDays +
            previousAllowance.carryOverDays +
            previousAllowance.adjustedDays -
            previousUsed,
          0
        )
      : 0

    return NextResponse.json({
      allowance: {
        userId,
        year,
        annualDays: 30,
        carryOverDays: Math.round(autoCarryOver * 100) / 100,
        adjustedDays: 0
      }
    })
  } catch (error) {
    return apiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
    const body = await request.json()
    const userId = String(body.userId ?? "")
    const year = Number(body.year)
    const annualDays = toDayNumber(body.annualDays)
    const carryOverDays = toDayNumber(body.carryOverDays)
    const adjustedDays = toDayNumber(body.adjustedDays ?? 0)

    if (
      !userId ||
      !Number.isInteger(year) ||
      year < 2000 ||
      year > 2100 ||
      annualDays === null ||
      carryOverDays === null ||
      adjustedDays === null ||
      annualDays < 0 ||
      carryOverDays < 0
    ) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 })
    }

    const allowance = await prisma.leaveAllowance.upsert({
      where: { userId_year: { userId, year } },
      update: { annualDays, carryOverDays, adjustedDays },
      create: { userId, year, annualDays, carryOverDays, adjustedDays }
    })
    return NextResponse.json({ allowance })
  } catch (error) {
    return apiError(error)
  }
}
