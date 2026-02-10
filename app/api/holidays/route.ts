import { NextRequest, NextResponse } from "next/server"
import { apiError, requireUser } from "../../../lib/auth"
import { getHolidaysForYear } from "../../../lib/holidaysRepo"

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser()
    const { searchParams } = new URL(request.url)
    const year = Number(searchParams.get("year"))
    if (!Number.isFinite(year)) {
      return NextResponse.json({ error: "Invalid year" }, { status: 400 })
    }

    const holidays = await getHolidaysForYear(year, user.holidayState)
    return NextResponse.json({ holidays })
  } catch (error) {
    return apiError(error)
  }
}
