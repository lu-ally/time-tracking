import { AppShell } from "../../components/AppShell"
import { TimeEntryClient } from "../../components/TimeEntryClient"
import { userOrRedirect } from "../../lib/guards"
import { berlinDateString } from "../../lib/time"
import { getHolidaysForYear } from "../../lib/holidaysRepo"
import { prisma } from "../../lib/db"

export default async function TimePage({
  searchParams
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const user = await userOrRedirect()
  const params = await searchParams
  const date = params.date ?? berlinDateString(new Date())
  const year = Number(date.split("-")[0])
  const [holidays, schedules] = await Promise.all([
    getHolidaysForYear(year, user.holidayState),
    prisma.workingTimeSchedule.findMany({
      where: { userId: user.id },
      orderBy: { effectiveFrom: "asc" }
    })
  ])

  return (
    <AppShell
      title="Zeiterfassung"
      hideTitle
      currentUser={{ name: user.name, role: user.role }}
    >
      <TimeEntryClient
        initialDate={date}
        schedules={schedules}
        holidays={holidays}
      />
    </AppShell>
  )
}
