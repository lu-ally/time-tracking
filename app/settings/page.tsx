import { AppShell } from "../../components/AppShell"
import { SettingsClient } from "../../components/SettingsClient"
import { userOrRedirect } from "../../lib/guards"

export default async function SettingsPage() {
  await userOrRedirect()
  return (
    <AppShell
      title="Einstellungen"
    >
      <SettingsClient />
    </AppShell>
  )
}
