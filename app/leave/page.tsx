import { AppShell } from "../../components/AppShell"
import { LeaveClient } from "../../components/LeaveClient"
import { userOrRedirect } from "../../lib/guards"
import { berlinDateString } from "../../lib/time"
import { prisma } from "../../lib/db"
import { getHolidaysForYear } from "../../lib/holidaysRepo"
import { leaveDaysUsed } from "../../lib/calculations"

export default async function LeavePage({
  searchParams
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const user = await userOrRedirect()
  const params = await searchParams
  const date = params.date ?? berlinDateString(new Date())
  const year = Number(date.split("-")[0])

  const allowanceRecord = await prisma.leaveAllowance.findUnique({
    where: { userId_year: { userId: user.id, year } }
  })

  const allowanceBase = allowanceRecord
    ? allowanceRecord.annualDays + allowanceRecord.carryOverDays + allowanceRecord.adjustedDays
    : 30

  const entries = await prisma.leaveEntry.findMany({
    where: { userId: user.id, startDate: { lte: `${year}-12-31` }, endDate: { gte: `${year}-01-01` } }
  })

  const holidays = await getHolidaysForYear(year, user.holidayState)
  const used = entries.reduce((sum, entry) => {
    return (
      sum +
      leaveDaysUsed(entry.startDate, entry.endDate, entry.halfDayStart, entry.halfDayEnd, holidays)
    )
  }, 0)

  return (
    <AppShell
      title="Urlaubsplanung"
    >
      <LeaveClient
        initialDate={date}
        holidays={holidays}
        allowance={allowanceBase}
        used={used}
        currentUserId={user.id}
      />
    </AppShell>
  )
}
