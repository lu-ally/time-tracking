import { AppShell } from "../../components/AppShell"
import { AdminClient } from "../../components/AdminClient"
import { adminOrRedirect } from "../../lib/guards"

export default async function AdminPage() {
  await adminOrRedirect()
  return (
    <AppShell title="Admin">
      <AdminClient />
    </AppShell>
  )
}
