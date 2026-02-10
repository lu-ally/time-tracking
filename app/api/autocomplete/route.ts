import { NextResponse } from "next/server"
import { apiError, requireUser } from "../../../lib/auth"
import { prisma } from "../../../lib/db"

export async function GET() {
  try {
    const user = await requireUser()
    const notes = await prisma.timeEntry.findMany({
      where: { userId: user.id, note: { not: "" } },
      orderBy: { updatedAt: "desc" },
      take: 10,
      select: { note: true }
    })
    const templates = await prisma.activityTemplate.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 10
    })
    return NextResponse.json({
      notes: Array.from(new Set(notes.map((n) => n.note))),
      templates
    })
  } catch (error) {
    return apiError(error)
  }
}
