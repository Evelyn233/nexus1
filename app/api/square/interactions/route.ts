import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import prisma from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

type InteractionComment = { id: string; userId: string; userName?: string; text: string; createdAt: number }
type ProjectInteractions = { likes: string[]; favorites: string[]; comments: InteractionComment[] }
type ProjectItem = {
  text?: string
  createdAt?: number
  interactions?: ProjectInteractions
}

function normalizeInteractions(raw: unknown): ProjectInteractions {
  const obj = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {}
  const likes = Array.isArray(obj.likes) ? obj.likes.filter((x): x is string => typeof x === 'string' && x.trim()) : []
  const favorites = Array.isArray(obj.favorites) ? obj.favorites.filter((x): x is string => typeof x === 'string' && x.trim()) : []
  const comments = Array.isArray(obj.comments)
    ? obj.comments
        .map((c) => {
          if (!c || typeof c !== 'object') return null
          const it = c as Record<string, unknown>
          const id = typeof it.id === 'string' ? it.id : ''
          const userId = typeof it.userId === 'string' ? it.userId : ''
          const text = typeof it.text === 'string' ? it.text.trim() : ''
          const createdAt = typeof it.createdAt === 'number' ? it.createdAt : Date.now()
          const userName = typeof it.userName === 'string' ? it.userName : undefined
          if (!id || !userId || !text) return null
          return { id, userId, userName, text, createdAt }
        })
        .filter((v): v is InteractionComment => !!v)
    : []
  comments.sort((a, b) => a.createdAt - b.createdAt)
  return { likes, favorites, comments }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const me = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, name: true },
    })
    if (!me?.id) return NextResponse.json({ error: '用户不存在' }, { status: 404 })

    const body = await request.json().catch(() => ({}))
    const { action, targetUserId, projectCreatedAt, text } = body as {
      action?: 'toggleLike' | 'toggleFavorite' | 'addComment'
      targetUserId?: string
      projectCreatedAt?: number
      text?: string
    }
    if (!action || !targetUserId || typeof projectCreatedAt !== 'number') {
      return NextResponse.json({ error: 'Invalid params' }, { status: 400 })
    }

    const target = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, profileData: true },
    })
    if (!target) return NextResponse.json({ error: 'Target user not found' }, { status: 404 })

    const pd = target.profileData ? JSON.parse(target.profileData) as Record<string, unknown> : {}
    const projects = Array.isArray(pd.projects) ? [...(pd.projects as ProjectItem[])] : []
    const idx = projects.findIndex((p) => typeof p?.createdAt === 'number' && p.createdAt === projectCreatedAt)
    if (idx < 0) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    const project = projects[idx] ?? {}
    const interactions = normalizeInteractions(project.interactions)

    if (action === 'toggleLike') {
      const has = interactions.likes.includes(me.id)
      interactions.likes = has ? interactions.likes.filter((id) => id !== me.id) : [...interactions.likes, me.id]
    } else if (action === 'toggleFavorite') {
      const has = interactions.favorites.includes(me.id)
      interactions.favorites = has ? interactions.favorites.filter((id) => id !== me.id) : [...interactions.favorites, me.id]
    } else if (action === 'addComment') {
      const commentText = (text ?? '').trim()
      if (!commentText) return NextResponse.json({ error: 'Comment text is required' }, { status: 400 })
      interactions.comments.push({
        id: `cm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        userId: me.id,
        userName: me.name ?? undefined,
        text: commentText,
        createdAt: Date.now(),
      })
    }

    projects[idx] = { ...project, interactions }
    const merged = { ...pd, projects }

    await prisma.user.update({
      where: { id: targetUserId },
      data: { profileData: JSON.stringify(merged) },
    })

    return NextResponse.json({
      ok: true,
      interaction: {
        likeCount: interactions.likes.length,
        favoriteCount: interactions.favorites.length,
        commentCount: interactions.comments.length,
        myLiked: interactions.likes.includes(me.id),
        myFavorited: interactions.favorites.includes(me.id),
        comments: interactions.comments.slice(-5),
      },
    })
  } catch (e) {
    console.error('[square/interactions] POST failed:', e)
    return NextResponse.json({ error: 'Failed to update interaction' }, { status: 500 })
  }
}

