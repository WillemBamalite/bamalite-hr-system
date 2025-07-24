import type { Metadata } from 'next'
import './globals.css'
import Link from "next/link"
import { DashboardHeader } from "@/components/dashboard-header"
import { CrewProvider } from "@/components/crew/CrewProvider"

export const metadata: Metadata = {
  title: 'v0 App',
  description: 'Created with v0',
  generator: 'v0.dev',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="nl">
      <body>
        <CrewProvider>
          <DashboardHeader />
          {children}
        </CrewProvider>
      </body>
    </html>
  )
}
