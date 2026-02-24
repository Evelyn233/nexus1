import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'
import GlobalChatDialog from '@/components/GlobalChatDialog'
import ProfileChatDrawerTrigger from '@/components/ProfileChatDrawerTrigger'
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
          {/* 输入框发起对话时弹出拉窗，不跳转 */}
          <ProfileChatDrawerTrigger />
          {/* 向 TA 提问：回答基于 profile 数据库与用户不断校准交互；若无该问题可问 profile 主人 */}
          <ProfileQADrawerTrigger />
        </Providers>
      </body>
    </html>
  )
}
