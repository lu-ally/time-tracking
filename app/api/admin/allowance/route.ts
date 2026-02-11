import { NextRequest, NextResponse } from "next/server"
import { apiError, requireAdmin } from "../../../../lib/auth"
import { prisma } from "../../../../lib/db"

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin()
    const body = await request.json()
    const userId = String(body.userId ?? "")
    const year = Number(body.year)
    const annualDays = Number(body.annualDays)
    const carryOverDays = Number(body.carryOverDays)
    const adjustedDays = Number(body.adjustedDays ?? 0)

    if (
      !userId ||
      !Number.isInteger(year) ||
      year < 2000 ||
      year > 2100 ||
      !Number.isFinite(annualDays) ||
      !Number.isFinite(carryOverDays) ||
      !Number.isFinite(adjustedDays) ||
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
