import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'
import GlobalChatDialog from '@/components/GlobalChatDialog'
import ProfileQADrawerTrigger from '@/components/ProfileQADrawerTrigger'

export const metadata: Metadata = {
  title: 'nexus',
  description: 'join yifan on nexus',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        <Providers>
          {children}
          <GlobalChatDialog />
          <ProfileQADrawerTrigger />
        </Providers>
      </body>
    </html>
  )
}
