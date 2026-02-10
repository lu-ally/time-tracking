import type { Metadata } from "next"
import "../styles/globals.css"
import { DM_Serif_Text, Urbanist } from "next/font/google"

const display = DM_Serif_Text({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400"]
})

const body = Urbanist({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400"]
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
