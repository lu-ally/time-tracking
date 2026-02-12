import Link from "next/link"
import Image from "next/image"
import { logoutAction } from "../app/actions"
import { TopNav } from "./TopNav"

export async function AppShell({
  children,
  title,
  description,
  hideTitle = false,
  currentUser
}: {
  children: React.ReactNode
  title: string
  description?: string
  hideTitle?: boolean
  currentUser: {
    name: string
    role: "user" | "admin"
  }
}) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-sand bg-white/70 backdrop-blur">
        <div className="container flex flex-wrap items-center justify-between gap-4 py-5">
          <Link href="/time" className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-accent text-white flex items-center justify-center">
              <Image src="/icon-white.svg" alt="" width={20} height={20} />
            </div>
            <div>
              <div className="font-display text-xl">AllyTimeTracking</div>
            </div>
          </Link>
          <TopNav isAdmin={currentUser.role === "admin"} />
          <div className="flex items-center gap-3">
            <span className="text-sm text-[#6b5e51]">{currentUser.name}</span>
            <form action={logoutAction}>
              <button className="btn btn-primary" type="submit">
                Logout
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="container py-10">
        {!hideTitle ? (
          <div className="mb-6">
            <h1 className="font-display text-3xl">{title}</h1>
            {description ? <p className="text-[#6b5e51] mt-2">{description}</p> : null}
          </div>
        ) : null}
        {children}
      </main>
    </div>
  )
}
