import type { Metadata } from 'next'
import './globals.css'
import Link from "next/link"
import { DashboardHeader } from "@/components/dashboard-header"
import { CrewProvider } from "@/components/crew/CrewProvider"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { Inter } from "next/font/google"

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Bamalite HR System',
  description: 'Bemanningslijst management systeem - Updated',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="nl">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
      </head>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <CrewProvider>
            <DashboardHeader />
            {children}
            <Toaster />
          </CrewProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
