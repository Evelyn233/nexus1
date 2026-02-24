import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export type FavoriteProfile = {
  userId: string
  name?: string
  avatar?: string | null
  profileSlug?: string | null
  oneSentenceDesc?: string | null
}

function getFavoritesFromProfileData(profileData: string | null): FavoriteProfile[] {
  if (!profileData) return []
  try {
    const pd = JSON.parse(profileData) as { favoriteProfiles?: FavoriteProfile[] }
    return Array.isArray(pd?.favoriteProfiles) ? pd.favoriteProfiles : []
  } catch {
    return []
  }
}

/** GET: 获取当前用户的收藏列表 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { profileData: true }
    })

    const favorites = getFavoritesFromProfileData(user?.profileData ?? null)
    return NextResponse.json({ success: true, favorites })
  } catch (e) {
    console.error('[FAVORITES] GET failed:', e)
    return NextResponse.json({ error: 'Failed to fetch favorites' }, { status: 500 })
  }
}

/** POST: 添加或移除收藏 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const body = await request.json()
    const { action, userId, name, avatar, profileSlug, oneSentenceDesc } = body as {
      action: 'add' | 'remove'
      userId: string
      name?: string
      avatar?: string | null
      profileSlug?: string | null
      oneSentenceDesc?: string | null
    }

    if (!action || !userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'action and userId are required' }, { status: 400 })
    }

    const current = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, profileData: true }
    })

    if (!current) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    let favorites = getFavoritesFromProfileData(current.profileData)
    const existing = favorites.find((f) => f.userId === userId)

    if (action === 'add') {
      if (existing) {
        return NextResponse.json({ success: true, favorites })
      }
      favorites = [
        ...favorites,
        {
          userId,
          name: name ?? null,
          avatar: avatar ?? null,
          profileSlug: profileSlug ?? null,
          oneSentenceDesc: oneSentenceDesc ?? null
        }
      ]
    } else if (action === 'remove') {
      favorites = favorites.filter((f) => f.userId !== userId)
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const existingPd = current.profileData ? JSON.parse(current.profileData) : {}
    const merged = { ...existingPd, favoriteProfiles: favorites }
    await prisma.user.update({
      where: { email: session.user.email },
      data: { profileData: JSON.stringify(merged) }
    })

    return NextResponse.json({ success: true, favorites })
  } catch (e) {
    console.error('[FAVORITES] POST failed:', e)
    return NextResponse.json({ error: 'Failed to update favorites' }, { status: 500 })
  }
}
