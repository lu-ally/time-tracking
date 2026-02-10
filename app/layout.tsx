import type { Metadata } from "next"
import "../styles/globals.css"
import { Fraunces, Space_Grotesk } from "next/font/google"

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "600", "700"]
})

const body = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"]
})

export const metadata: Metadata = {
  title: "AllyTimeTracking",
  description: "Zeiterfassung und Urlaubsplanung in einem Tool."
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  )
}
