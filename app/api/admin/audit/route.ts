import { NextResponse } from "next/server"
import { apiError, requireAdmin } from "../../../../lib/auth"
import { prisma } from "../../../../lib/db"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET() {
  try {
    await requireAdmin()
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100
    })
    return NextResponse.json({ logs })
  } catch (error) {
    return apiError(error)
  }
}
