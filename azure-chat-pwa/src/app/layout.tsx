import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { NetworkStatusIndicator } from '@/components/NetworkStatusIndicator'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Azure Chat PWA',
  description: 'AI Chat Application with Offline Support',
  manifest: '/manifest.json',
  themeColor: '#1890ff',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <NetworkStatusIndicator />
        {children}
      </body>
    </html>
  )
}