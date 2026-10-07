import { Libre_Baskerville, Source_Sans_3 } from "next/font/google"

const display = Libre_Baskerville({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-news-display",
})

const sans = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-news-sans",
})

export default function NewsletterLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${display.variable} ${sans.variable}`}>{children}</div>
}
