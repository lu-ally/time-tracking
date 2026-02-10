import { AppShell } from "../../components/AppShell"
import { TimeEntryClient } from "../../components/TimeEntryClient"
import { userOrRedirect } from "../../lib/guards"
import { berlinDateString } from "../../lib/time"
import { getHolidaysForYear } from "../../lib/holidaysRepo"

export default async function TimePage({
  searchParams
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const user = await userOrRedirect()
  const params = await searchParams
  const date = params.date ?? berlinDateString(new Date())
  const year = Number(date.split("-")[0])
  const holidays = await getHolidaysForYear(year, user.holidayState)

  return (
    <AppShell
      title="Zeiterfassung"
      hideTitle
    >
      <TimeEntryClient
        initialDate={date}
        targetMinutes={{
          mon: user.targetMinutesMon,
          tue: user.targetMinutesTue,
          wed: user.targetMinutesWed,
          thu: user.targetMinutesThu,
          fri: user.targetMinutesFri,
          sat: user.targetMinutesSat,
          sun: user.targetMinutesSun
        }}
        holidays={holidays}
      />
    </AppShell>
  )
}
