import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

/**
 * 一次性清理 OAuth 冲突数据
 *
 * 使用场景：用户用邮箱密码注册后，又用 Google 登录，导致出现 OAuthAccountNotLinked 错误
 *
 * 该接口会：
 * 1. 查找相同邮箱的多个用户记录
 * 2. 合并 OAuth 临时用户到主账号
 * 3. 删除孤立的 OAuth 用户
 *
 * ⚠️ 仅用于调试/维护，建议在生产环境调用后删除
 */
export async function POST(request: Request) {
  // 简单的密码保护（可选）
  const { password, email } = await request.json()

  // 可选：添加密码验证，防止未授权访问
  // if (password !== process.env.ADMIN_CLEANUP_PASSWORD) {
  //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  // }

  try {
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // 查找该邮箱的所有用户
    const users = await prisma.user.findMany({
      where: { email },
      include: {
        accounts: true,
      },
      orderBy: {
        createdAt: 'asc', // 按创建时间排序，先创建的优先保留
      },
    })

    if (users.length <= 1) {
      return NextResponse.json({
        message: 'No conflict found',
        userCount: users.length,
      })
    }

    console.log(`🧹 [CLEANUP] 发现 ${users.length} 个相同邮箱的用户:`, email)

    // 选择主用户（最早创建的，且有密码的优先）
    const primaryUser = users.find(u => u.password) || users[0]
    const otherUsers = users.filter(u => u.id !== primaryUser.id)

    console.log(`   [CLEANUP] 主用户: ${primaryUser.id} (created: ${primaryUser.createdAt})`)
    console.log(`   [CLEANUP] 待清理: ${otherUsers.length} 个临时用户`)

    // 转移其他用户的 accounts 到主账户
    for (const tempUser of otherUsers) {
      const accounts = await prisma.account.findMany({
        where: { userId: tempUser.id },
      })

      for (const account of accounts) {
        // 检查主账户是否已有该 provider 的 account
        const existingAccount = await prisma.account.findFirst({
          where: {
            userId: primaryUser.id,
            provider: account.provider,
          },
        })

        if (existingAccount) {
          // 如果主账户已有同 provider 的 account，删除重复的
          await prisma.account.delete({
            where: { id: account.id },
          })
          console.log(`   [CLEANUP] 删除重复 account: ${account.provider}`)
        } else {
          // 否则转移到主账户
          await prisma.account.update({
            where: { id: account.id },
            data: { userId: primaryUser.id },
          })
          console.log(`   [CLEANUP] 转移 account: ${account.provider} -> ${primaryUser.id}`)
        }
      }

      // 删除临时用户
      await prisma.user.delete({
        where: { id: tempUser.id },
      })
      console.log(`   [CLEANUP] 删除临时用户: ${tempUser.id}`)
    }

    // 验证结果
    const finalUsers = await prisma.user.findMany({
      where: { email },
      include: { accounts: true },
    })

    return NextResponse.json({
      success: true,
      message: 'Cleanup completed',
      primaryUserId: primaryUser.id,
      removedUsers: otherUsers.length,
      finalUserCount: finalUsers.length,
      finalAccounts: finalUsers[0]?.accounts?.length || 0,
    })
  } catch (error) {
    console.error('❌ [CLEANUP] 清理失败:', error)
    return NextResponse.json(
      { error: 'Cleanup failed', details: String(error) },
      { status: 500 }
    )
  }
}
