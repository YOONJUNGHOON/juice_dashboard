import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Juice Dashboard',
  description: 'Private stock study portal',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
