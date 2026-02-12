import { NextRequest, NextResponse } from "next/server"
import { apiError, requireAdmin } from "../../../../lib/auth"
import { prisma } from "../../../../lib/db"

function toDayNumber(value: unknown) {
  const normalized = String(value ?? "")
    .trim()
    .replace(",", ".")
  if (!/^-?\d+(\.\d{1,2})?$/.test(normalized)) return null
  const parsed = Number(normalized)
  if (!Number.isFinite(parsed)) return null
  return Math.round(parsed * 100) / 100
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
