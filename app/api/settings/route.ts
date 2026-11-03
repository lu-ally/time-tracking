import { NextRequest, NextResponse } from "next/server"
import { apiError, requireUser } from "../../../lib/auth"
import { prisma } from "../../../lib/db"
import { userSettingsSchema } from "../../../lib/validation"

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireUser()
    const parsed = userSettingsSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 })
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: parsed.data,
      select: { defaultStartMinutes: true, defaultBreakMinutes: true }
    })
    return NextResponse.json(updated)
  } catch (error) {
    return apiError(error)
  }
}
