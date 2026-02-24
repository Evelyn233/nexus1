import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const CONFIG_KEY = 'profile_owner_user_id'

/** GET: 当前 Profile 展示用户 id 及用户信息 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const row = await prisma.appConfig.findUnique({
      where: { key: CONFIG_KEY },
      select: { value: true },
    })
    const ownerId =
      row?.value?.trim() ||
      process.env.PROFILE_OWNER_USER_ID?.trim() ||
      (await prisma.user.findFirst({ orderBy: { createdAt: 'asc' }, select: { id: true } }))?.id ||
      null

    let ownerUser: { id: string; name: string | null; email: string | null } | null = null
    if (ownerId) {
      const u = await prisma.user.findUnique({
        where: { id: ownerId },
        select: { id: true, name: true, email: true },
      })
      if (u) ownerUser = u
    }

    return NextResponse.json({
      success: true,
      profileOwnerUserId: ownerId,
      profileOwnerUser: ownerUser,
    })
  } catch (e) {
    console.error('[ADMIN profile-owner] GET', e)
    return NextResponse.json({ error: '获取失败' }, { status: 500 })
  }
}

/** POST: 设置 Profile 展示用户（body: { userId: string }） */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const userId = typeof body?.userId === 'string' ? body.userId.trim() : ''
    if (!userId) {
      return NextResponse.json({ error: '请提供 userId' }, { status: 400 })
    }

    const exists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    })
    if (!exists) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    await prisma.appConfig.upsert({
      where: { key: CONFIG_KEY },
      create: { key: CONFIG_KEY, value: userId },
      update: { value: userId },
    })

    return NextResponse.json({
      success: true,
      message: '已设置为 Profile 展示用户',
      profileOwnerUserId: userId,
    })
  } catch (e) {
    console.error('[ADMIN profile-owner] POST', e)
    return NextResponse.json({ error: '设置失败' }, { status: 500 })
  }
}
