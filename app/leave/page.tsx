import { AppShell } from "../../components/AppShell"
import { LeaveClient } from "../../components/LeaveClient"
import { leaveDaysUsed } from "../../lib/calculations"
import { prisma } from "../../lib/db"
import { userOrRedirect } from "../../lib/guards"
import { getHolidaysForYear } from "../../lib/holidaysRepo"
import { berlinDateString } from "../../lib/time"

export default async function LeavePage({
  searchParams
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const user = await userOrRedirect()
  const params = await searchParams
  const date = params.date ?? berlinDateString(new Date())
  const year = Number(date.split("-")[0])
  const previousYear = year - 1

  const [allowanceRecord, previousAllowanceRecord, entries, previousEntries, holidays, previousHolidays] =
    await Promise.all([
      prisma.leaveAllowance.findUnique({
        where: { userId_year: { userId: user.id, year } }
      }),
      prisma.leaveAllowance.findUnique({
        where: { userId_year: { userId: user.id, year: previousYear } }
      }),
      prisma.leaveEntry.findMany({
        where: {
          userId: user.id,
          startDate: { lte: `${year}-12-31` },
          endDate: { gte: `${year}-01-01` }
        }
      }),
      prisma.leaveEntry.findMany({
        where: {
          userId: user.id,
          startDate: { lte: `${previousYear}-12-31` },
          endDate: { gte: `${previousYear}-01-01` }
        }
      }),
      getHolidaysForYear(year, user.holidayState),
      getHolidaysForYear(previousYear, user.holidayState)
    ])

  const previousYearUsed = previousEntries.reduce((sum, entry) => {
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

  // Auto carry-over: remaining days from previous year become part of this year's entitlement.
  const previousYearCarryOver = previousAllowanceRecord
    ? Math.max(
        previousAllowanceRecord.annualDays +
          previousAllowanceRecord.carryOverDays +
          previousAllowanceRecord.adjustedDays -
          previousYearUsed,
        0
      )
    : 0

  const allowanceBase =
    (allowanceRecord?.annualDays ?? 30) +
    (allowanceRecord?.carryOverDays ?? 0) +
    (allowanceRecord?.adjustedDays ?? 0) +
    previousYearCarryOver

  const used = entries.reduce((sum, entry) => {
    return (
      sum +
      leaveDaysUsed(entry.startDate, entry.endDate, entry.halfDayStart, entry.halfDayEnd, holidays)
    )
  }, 0)

  return (
    <AppShell title="Urlaubsplanung" currentUser={{ name: user.name, role: user.role }}>
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
