import { formatInTimeZone } from "date-fns-tz"
import { AppShell } from "../../components/AppShell"
import { EvaluationClient } from "../../components/EvaluationClient"
import { adminOrRedirect } from "../../lib/guards"
import { BERLIN_TZ } from "../../lib/time"

export default async function EvaluationPage() {
  const user = await adminOrRedirect()
  const initialMonth = formatInTimeZone(new Date(), BERLIN_TZ, "yyyy-MM")

  return (
    <AppShell title="Auswertung" currentUser={{ name: user.name, role: user.role }}>
      <EvaluationClient initialMonth={initialMonth} />
    </AppShell>
  )
}
