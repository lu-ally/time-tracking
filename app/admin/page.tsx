import { AppShell } from "../../components/AppShell"
import { AdminClient } from "../../components/AdminClient"
import { adminOrRedirect } from "../../lib/guards"

export default async function AdminPage() {
  const user = await adminOrRedirect()
  return (
    <AppShell title="Admin" currentUser={{ name: user.name, role: user.role }}>
      <AdminClient />
    </AppShell>
  )
}
